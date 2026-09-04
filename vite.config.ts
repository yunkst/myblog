/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function mimeOf(file: string): string {
  const ext = path.extname(file).toLowerCase()
  const table: Record<string, string> = {
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  }
  return table[ext] || 'application/octet-stream'
}

/* build 产物：dist/posts/<slug>/<file>，与文章内旧 URL /posts/<slug>/<file> 对齐。
 * v5 取消 article.mdx，但 assets/ 目录（场景图等静态文件）仍需随 build 输出。
 * 支持子目录（如 assets/avatars/），递归拷贝保持相对路径。 */
function copyPostAssetsToDist(srcDir: string, dstDir: string) {
  if (!fs.existsSync(srcDir)) return
  fs.mkdirSync(dstDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name)
    const dst = path.join(dstDir, entry.name)
    if (entry.isDirectory()) {
      copyPostAssetsToDist(src, dst)
    } else {
      fs.copyFileSync(src, dst)
    }
  }
}

function copyAllPostAssetsToDist() {
  const postsRoot = path.join(process.cwd(), 'content', 'posts')
  if (!fs.existsSync(postsRoot)) return
  const posts = fs.readdirSync(postsRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const p of posts) {
    const src = path.join(postsRoot, p.name, 'assets')
    const dst = path.join(process.cwd(), 'dist', 'posts', p.name)
    if (!fs.existsSync(src)) continue
    copyPostAssetsToDist(src, dst)
  }
}

/* 中文路由目录名解码由 scripts/decode-dist.ts 在 postbuild 阶段处理
 * （GitHub Pages 解码请求路径后按解码名找文件，磁盘名必须是字面 Unicode）。 */

export default defineConfig(() => ({
  /* GitHub Pages 项目站点部署时传 DEPLOY_BASE=/myblog/（见 .github/workflows/deploy.yml）；
   * 本地 dev/preview 与其他托管（CloudBase）保持 / 不变。 */
  base: process.env.DEPLOY_BASE || '/',
  plugins: [
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
      /* build 期：closeBundle 时把 assets 拷到 dist/posts/<slug>/
       * （中文目录名解码在 postbuild 脚本 scripts/decode-dist.ts，避免 closeBundle 顺序问题） */
      closeBundle() {
        copyAllPostAssetsToDist()
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
    /* 不要用 'async'：vite-react-ssg 把 __VITE_REACT_SSG_HASH__ 放在 app <script> 之后
     * 的内联脚本里注入，async app 可能赶在内联脚本之前执行 → loader 拿到 undefined hash
     * → manifest-undefined.json 404 → React Router loader reject → React 19 #418。
     * module 脚本默认就是 deferred（下载完成后按顺序执行），完全够用。 */
    script: 'sync',
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
