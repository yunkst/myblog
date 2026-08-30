/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import remarkFrontmatter from 'remark-frontmatter'
import yaml from 'js-yaml'
import { slugifyHeading } from './src/lib/explore'

function mimeOf(file: string): string {
  const ext = path.extname(file).toLowerCase()
  const table: Record<string, string> = {
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  }
  return table[ext] || 'application/octet-stream'
}

/* build 产物：dist/posts/<slug>/<file>，与文章内旧 URL /posts/<slug>/<file> 对齐 */
function copyPostAssetsToDist() {
  const postsRoot = path.join(process.cwd(), 'content', 'posts')
  if (!fs.existsSync(postsRoot)) return
  const posts = fs.readdirSync(postsRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const p of posts) {
    const src = path.join(postsRoot, p.name, 'assets')
    const dst = path.join(process.cwd(), 'dist', 'posts', p.name)
    if (!fs.existsSync(src)) continue
    fs.mkdirSync(dst, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      fs.copyFileSync(path.join(src, file), path.join(dst, file))
    }
  }
}

/* remark-frontmatter 把 YAML 解析为 yaml 节点；本插件把 frontmatter 转成 MDX ESM export，并从 children 移除 yaml 节点 */
function remarkExportFrontmatter() {
  return (tree: any) => {
    let fm: any = null
    visit(tree, 'yaml', (node: any, index: number | undefined, parent: any) => {
      try { fm = yaml.load(node.value) } catch { /* ignore */ }
      if (parent && typeof index === 'number') parent.children.splice(index, 1)
      return [visit.SKIP, index]
    })
    if (fm && typeof fm === 'object') {
      tree.children.unshift({
        type: 'mdxjsEsm',
        value: '',
        data: {
          estree: {
            type: 'Program',
            sourceType: 'module',
            body: [{
              type: 'ExportNamedDeclaration',
              specifiers: [],
              source: null,
              declaration: {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [{
                  type: 'VariableDeclarator',
                  id: { type: 'Identifier', name: 'frontmatter' },
                  init: yamlToExpression(fm),
                }],
              },
            }],
          },
        },
      })
      tree.children = tree.children.filter((n: any) => n.type !== 'yaml')
    }
  }
}

function yamlToExpression(value: any): any {
  if (value === null) return { type: 'Literal', value: null, raw: 'null' }
  if (typeof value === 'string') return { type: 'Literal', value }
  if (typeof value === 'number' || typeof value === 'boolean') return { type: 'Literal', value }
  // Date 单独序列化为 ISO 字符串（MDX ESM 序列化会把 Date 变成 {}，导致客户端 String(date) = '[object Object]'）
  if (value instanceof Date) return { type: 'Literal', value: value.toISOString().slice(0, 10) }
  if (Array.isArray(value)) {
    return { type: 'ArrayExpression', elements: value.map(yamlToExpression) }
  }
  if (typeof value === 'object') {
    return {
      type: 'ObjectExpression',
      properties: Object.entries(value).map(([k, v]) => ({
        type: 'Property',
        key: { type: 'Identifier', name: k },
        value: yamlToExpression(v),
        kind: 'init',
        method: false,
        shorthand: false,
        computed: false,
      })),
    }
  }
  return { type: 'Literal', value: null }
}

/* 给每个 heading 补 id（与 lib/explore.ts 的 slugifyHeading 同一算法）。
 * spec §8 规则 4 用 getHeadingsWithIds/slugifyHeading 校验 cross-link anchor，
 * 渲染侧必须产出相同 id，否则校验通过但浏览器锚点失效（final-review I3 缺陷）。
 *
 * seen map 必须按 MDX 文件路径隔离 —— 同一文件被多次编译（dev HMR / SSR+CSR）
 * 时算法必须幂等，否则 SSR/CSR 各自从 seen[0] 开始给同一 heading 产出不同后缀 id，
 * 触发 React hydration mismatch。 */
const fileSeen = new WeakMap<object, Map<string, number>>()
function getSeen(file: any): Map<string, number> {
  let m = fileSeen.get(file)
  if (!m) { m = new Map(); fileSeen.set(file, m) }
  return m
}
function rehypeHeadingIds() {
  return (tree: any, file: any) => {
    const seen = getSeen(file)
    visit(tree, 'element', (node: any) => {
      if (!/^h[1-6]$/.test(node.tagName || '')) return
      const text = ((node.children || []) as any[])
        .map((c: any) => (c.type === 'text' ? c.value : (c.value || '')))
        .join('')
      let id = slugifyHeading(text)
      if (!id) return
      const n = seen.get(id) ?? 0
      seen.set(id, n + 1)
      if (n > 0) id = `${id}-${n}`   // 重复 heading 时加 -1/-2 后缀（GitHub 约定）
      node.properties = { ...(node.properties || {}), id }
    })
  }
}

export default defineConfig(() => ({
  plugins: [
    { enforce: 'pre', ...mdx({
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [remarkFrontmatter, remarkExportFrontmatter, remarkGfm],
      rehypePlugins: [rehypeHeadingIds],
    }) },
    react(),
    /* dev 期：拦截 /posts/<slug>/<file>，即时从 content/posts/<slug>/assets/ 返回。
     * 在 react() 之后注入，让 react 自己的 dev server 中间件先跑。 */
    {
      name: 'serve-post-assets',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || ''
          if (!url.startsWith('/posts/')) return next()
          const m = url.match(/^\/posts\/([^/]+)\/(.+)$/)
          if (!m) return next()
          // 拦截路径穿越：m[2] 不能含 ".."，否则能跳出 content/posts/<slug>/assets/ 读任意文件
          if (m[2].includes('..')) return next()
          const file = path.join(process.cwd(), 'content', 'posts', m[1], 'assets', m[2])
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
          res.setHeader('Content-Type', mimeOf(file))
          fs.createReadStream(file).pipe(res)
        })
      },
      /* build 期：closeBundle 时把 assets 拷到 dist/posts/<slug>/ */
      closeBundle() {
        copyPostAssetsToDist()
      },
    },
  ],
  resolve: {
    alias: [
      { find: '@', replacement: new URL('./src', import.meta.url).pathname },
      /* v5：客户端与 SSG 共用 lib/content（meta.yaml via import.meta.glob + ?raw），
       * 不再需要为客户端切换到 content.client.ts。 */
    ],
  },
  ssgOptions: {
    dirStyle: 'nested',
    script: 'async',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // 主仓库下含 `.claude/worktrees/*` 隔离开发目录（自带 node_modules 与第二份 React）；
    // vitest 默认会把 `**/*.test.{ts,tsx}` 一并扫到，触发「Invalid hook call」（双 React 拷贝）。
    // 显式排除 worktree 子树，让 vitest 只跑主仓库测试。
    exclude: ['node_modules', 'dist', '.claude/worktrees/**'],
  },
}))