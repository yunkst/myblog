/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import remarkFrontmatter from 'remark-frontmatter'
import yaml from 'js-yaml'

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

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    { enforce: 'pre', ...mdx({
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [remarkFrontmatter, remarkExportFrontmatter, remarkGfm],
    }) },
    react(),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: new URL('./src', import.meta.url).pathname },
      /* 客户端构建时把 lib/content 替换为客户端版（content.client.ts），
       * 避免 node:fs / process.cwd() 打进浏览器 bundle 导致 hydration 失败。
       * SSG/SSR 侧继续用原 content.ts 读文件。 */
      ...(isSsrBuild ? [] : [{
        find: /^\.{1,2}\/lib\/content$/,
        replacement: new URL('./src/lib/content.client.ts', import.meta.url).pathname,
      }]),
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
  },
}))