# 个人求职博客 · 第一阶段实施计划（SSG 骨架 + 首页 + 示例文章 + FAQ + 部署）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭起一个可运行的 SSG 求职博客骨架：工程图纸视觉、首页（亮点 + 博客列表 + FAQ 粘性列 + WIP + 联系）、1 篇含 Typewriter/Counter/ArchDiagram 三种动画的示例文章、领域页与文章页、内容全部用占位（不含 yedazhi 个人信息）、部署到 CloudBase。

**Architecture:** `vite-react-ssg` 在构建期把每条路由渲染成真实 HTML（SSG），浏览器秒出内容后 React hydration，GSAP 动画在客户端跑。文章为 `content/posts/*.mdx`，frontmatter 由 gray-matter 提取，页面组件在构建期用 `getStaticPaths` 枚举路由。样式为工程图纸方案 A（纸白 + 图纸青 + 仿宋标注层 + 坐标网格）。

**Tech Stack:** Vite 8 + vite-react-ssg 0.9 + React 19 + TypeScript 5.9 + react-router-dom 6.30 + @mdx-js/rollup 3.1 + @mdx-js/react 3.1 + gray-matter 4 + js-yaml 4 + gsap 3.15 + remark-gfm 4 + vitest 4.1（含 @testing-library/react 16）。部署用 `tcb hosting`（CloudBase CLI 3.8.1，env `blog-d9glz3crx8ae02654`）。

**Spec:** `docs/superpowers/specs/2026-08-28-personal-job-blog-design.md`（v3）。**视觉基准原型：** `docs/design/style-tile.html`（本文档的架构图与首页组件均直接取自该文件，实施时优先照抄其 CSS/JS 渲染逻辑）。

## Global Constraints

- **Node ≥ 22**（本机 v24 已验证）。`package.json` 设 `"type": "module"`。
- **无任何真实个人信息**：`content/` 全部用占位（`示例领域`、`示例文章`、`you@example.com`、`github.com/you`、QR 占位图）；hero 文案用通用语（"你的定位"），不出现 yedazhi / 具体工作 / 具体数字。
- **渲染架构已定 SSG（spec §5.1）**，用 `vite-react-ssg`；`dirStyle: 'nested'` 保证 `dist/blog/<slug>/index.html` 形态（spec §9 验收）。
- **动画初始化全部放 `useEffect`（spec §10）**，任何组件渲染期不触碰 `window`/`document`；所有动画尊重 `prefers-reduced-motion`（spec §8）。
- **视觉 token 锁定**（spec §5.6）：`--paper:#F6F7F4 --ink:#1C2B28 --ink-soft:#55665F --ink-faint:#93A39C --accent:#0E6E5C --mark:#C0392B`；字体角色 黑体正文 / 仿宋标注 / 等宽数据；坐标网格 24px / 120px；圆角全局 2px。
- **架构图 = 方案 A 画法**（spec §5.6）：声明式 nodes/edges/bounds 数据 + sigil + 遮罩药丸标签 + 边界 + 装配动画（边界→节点→连线→标签）。实现与样式直接复用 style-tile.html 的 `buildArchSvg()`。
- 领域默认 `general`；文章 frontmatter `domain` 缺失即归 general（spec §3.3/§4.1）。
- `lib/content.ts` 是**唯一 IO 层**，页面只调它的查询函数、不直接读文件（spec §6）。
- 组件间不互相 import 业务逻辑，共享状态走 props（spec §6）。
- 依赖上限：不使用 tailwind/任何 UI 框架/任何额外 router；不使用 noSQL/云函数/AI（spec §5.3）。
- commit 一律 `git add` 具体文件 + `git commit -m "feat: ..."`；消息含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: 项目脚手架 + 构建链（可跑通 SSG 空路由）

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/routes.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/global.css`
- Create: `.gitignore`（更新，追加 `dist/`）
- Create: `.npmrc`（可选，registry 加速）

**Interfaces:**
- Produces: 可执行 `npm run build` → `dist/`；`src/routes.tsx` 导出 `routes: RouteRecord[]`（react-router v6 数据路由数组），供后续 Task 增改；`src/main.tsx` 导出 `createRoot`（vite-react-ssg 入口约定）。

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "my-blog",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite-react-ssg dev",
    "build": "vite-react-ssg build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "deploy": "vite-react-ssg build && tcb hosting deploy dist -e blog-d9glz3crx8ae02654"
  },
  "dependencies": {
    "@mdx-js/react": "3.1.1",
    "gray-matter": "4.0.3",
    "gsap": "3.15.0",
    "js-yaml": "4.3.2",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-router-dom": "6.30.6"
  },
  "devDependencies": {
    "@mdx-js/rollup": "3.1.1",
    "@testing-library/jest-dom": "^6.9.0",
    "@testing-library/react": "^16.3.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.0.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^27.0.0",
    "react-dom": "19.2.8",
    "remark-gfm": "^4.0.1",
    "typescript": "5.9.3",
    "vite": "8.2.2",
    "vite-react-ssg": "0.9.2",
    "vitest": "4.1.11"
  }
}
```

> 注：`react-dom` 同时出现在 devDependencies 是 vite-react-ssg 冒烟验证中确认可行的写法（本机已实测 build 通过）。若 `npm i` 时出现 peer 冲突，以 vite-react-ssg peerDependencies 为准微调版本即可，不影响结构。

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 写 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 写 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },
    react(),
  ],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  ssgOptions: {
    dirStyle: 'nested',
    script: 'async',
    formatting: 'prettify',
  },
})
```

> `formatting: 'prettify'` 让产出 HTML 可读，便于 §9 验收（curl 检查正文）；若 prettier 未装导致 prettify 报错，去掉该行即可（默认 none）。

- [ ] **Step 5: 写 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 写 src/main.tsx**

```tsx
import { ViteReactSSG } from 'vite-react-ssg'
import { routes } from './routes'
import { MDXProvider } from '@mdx-js/react'
import './styles/global.css'
import * as blogAnim from './components/blog-anim'

export const createRoot = ViteReactSSG(
  { routes },
  ({ isClient }) => {
    // MDX 内嵌动画组件通过 registry 提供
    void isClient
  },
)
```

> `* as blogAnim` 在 Task 6 才存在；若 Task 6 未完成前跑 build，先把这行与 import 注释掉。为了让 `createRoot` 签名正确，main.tsx 只负责挂载，registry 的注入放到 `App.tsx` 的 MDXProvider（见 Task 6）。

- [ ] **Step 7: 写 src/App.tsx（空布局占位）**

```tsx
import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 8: 写 src/routes.tsx（空路由）**

```tsx
import type { RouteRecord } from 'vite-react-ssg'

export const routes: RouteRecord[] = [
  {
    path: '/',
    Component: () => import('./App'),
    children: [
      { index: true, Component: () => import('./pages/Home') },
    ],
  },
]
```

> `App` 的懒加载 `Component` 写法与 vite-react-ssg lazy 约定一致（见其 README lazy 段）。

- [ ] **Step 9: 写 src/styles/global.css（视觉 token 起步）**

```css
:root {
  --paper: #F6F7F4;
  --paper-raise: #FFFFFF;
  --ink: #1C2B28;
  --ink-soft: #55665F;
  --ink-faint: #93A39C;
  --line: rgba(28, 43, 40, 0.16);
  --grid: rgba(28, 43, 40, 0.045);
  --accent: #0E6E5C;
  --accent-soft: rgba(14, 110, 92, 0.10);
  --mark: #C0392B;
  --sans: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --fang: "FangSong", "STFangsong", "FangSong_GB2312", serif;
  --mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font: 16px/1.8 var(--sans);
  -webkit-font-smoothing: antialiased;
}
/* 坐标纸网格：细格 24px，每 120px 加深一格 */
body::before {
  content: "";
  position: fixed; inset: 0;
  background:
    repeating-linear-gradient(0deg,  var(--grid) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, var(--grid) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(0deg,  var(--grid) 0 1px, transparent 1px 120px),
    repeating-linear-gradient(90deg, var(--grid) 0 1px, transparent 1px 120px);
  pointer-events: none;
  z-index: 0;
}
.app-shell { position: relative; z-index: 1; }
```

- [ ] **Step 10: 写 src/pages/Home.tsx 临时占位**

```tsx
export default function Home() {
  return <h1 style={{ padding: '40px' }}>博客骨架已就绪</h1>
}
```

- [ ] **Step 11: 更新 .gitignore**

```
node_modules/
dist/
.DS_Store
*.local
```

- [ ] **Step 12: 安装依赖并首次构建**

Run: `npm i`
Expected: 无致命错误（peer 冲突按 Step 1 注处理）。

Run: `npm run build`
Expected: `dist/index.html` 存在，且包含 `<h1>博客骨架已就绪</h1>`（SSG 预渲染验证）。

Run: `npm run typecheck`
Expected: 无 TS 错误。

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore src/main.tsx src/App.tsx src/routes.tsx src/pages/Home.tsx src/styles/global.css
git commit -m "feat: SSG 骨架脚手架（vite-react-ssg + MDX + 工程图纸 token）
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 内容层 lib/content.ts（唯一 IO 层）

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/content.ts`
- Create: `content/site.yaml`
- Create: `content/posts/demo-animations.mdx`（骨架占位，供 Task 2 测试读 frontmatter）
- Test: `src/lib/content.test.ts`

**Interfaces:**
- Consumes: `gray-matter` + `js-yaml` + `node:fs`。
- Produces: 类型 `Post`、`Domain`、`Wip`、`Faq`、`SiteConfig`，与查询函数 `getAllPosts() / getPost(slug) / getPostsByDomain(domain) / getAllDomains() / getWips() / getFAQs() / getSite()`。签名：

```ts
interface Post {
  slug: string; title: string; domain: string; date: string;
  anim_profile: 'auto' | 'data-narrative' | 'architecture' | 'story';
  status: 'draft' | 'published' | 'scheduled'; excerpt: string;
  body: string;              // markdown 原文（MDX 编译在 Task 5 进行）
  fileName: string;          // 供 Task 5 动态 import
}
interface Domain { slug: string; posts: Post[]; updatedAt: string }
interface Wip { slug: string; title: string; status: string; progress: number; thoughts: string }
interface Faq { id: string; text: string; target: string }
interface SiteConfig { site: { name: string; tagline: string; email: string; wechat_qr: string; github: string; domains: string[] } }
```

- [ ] **Step 1: 写 src/lib/types.ts**

```ts
export type AnimProfile = 'auto' | 'data-narrative' | 'architecture' | 'story'
export type PostStatus = 'draft' | 'published' | 'scheduled'

export interface Post {
  slug: string
  title: string
  domain: string
  date: string          // YYYY-MM-DD
  anim_profile: AnimProfile
  status: PostStatus
  excerpt: string
  body: string
  fileName: string
}

export interface Domain {
  slug: string
  posts: Post[]
  updatedAt: string     // 该领域最近文章日期
}

export interface Wip {
  slug: string
  title: string
  status: string
  progress: number
  thoughts: string
}

export interface Faq {
  id: string
  text: string
  target: string
}

export interface SiteConfig {
  site: {
    name: string
    tagline: string
    email: string
    wechat_qr: string
    github: string
    domains: string[]
  }
}
```

- [ ] **Step 2: 写 content/site.yaml**

```yaml
site:
  name: 你的名字
  tagline: 一句话定位（例如：把复杂系统拆开、讲清楚，再装回去）
  email: you@example.com
  wechat_qr: /static/wechat-qr.png
  github: https://github.com/you
  domains:
    - 示例领域
```

- [ ] **Step 3: 写 content/posts/demo-animations.mdx（占位文章）**

```mdx
---
title: 示例文章：三种动画是怎么嵌入正文的
slug: demo-animations
domain: 示例领域
date: 2026-08-28
anim_profile: architecture
status: published
excerpt: 这篇占位文章演示 Typewriter、Counter、ArchDiagram 三种动画组件在正文里的用法。
---

# 示例文章

这是一篇占位文章，用来验证动画组件与正文的集成。

## 计数动画

<Counter from={0} to={4200} suffix=" QPS" label="峰值压测吞吐" />

## 架构动画

<ArchDiagram diagram="demo" />

## 打字机

<Typewriter text="问题不是流量大，是读多写少还要求强一致——我们把缓存当成了第一方案，又亲手把它撤了。" />
```

- [ ] **Step 4: 写 src/lib/content.ts**

```ts
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import type { Post, Domain, Wip, Faq, SiteConfig, AnimProfile, PostStatus } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')
const WIP_DIR = path.join(CONTENT_DIR, 'wip')

const VALID_ANIM: AnimProfile[] = ['auto', 'data-narrative', 'architecture', 'story']
const VALID_STATUS: PostStatus[] = ['draft', 'published', 'scheduled']

function today(): string {
  // 构建期固定日期，避免每天重新生成
  return process.env.BUILD_DATE || new Date().toISOString().slice(0, 10)
}

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

export function getAllPosts(): Post[] {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
  const posts: Post[] = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    if (!data.title || !data.date) {
      console.warn(`[content] 跳过 ${file}: 缺 title 或 date`)
      continue
    }
    const slug = (data.slug as string) || slugify(String(data.title))
    const domain = (data.domain as string) || 'general'
    const anim = (data.anim_profile as AnimProfile) || 'auto'
    const status = (data.status as PostStatus) || 'published'
    if (!VALID_ANIM.includes(anim)) console.warn(`[content] ${file}: anim_profile=${anim} 非法，回退 auto`)
    if (!VALID_STATUS.includes(status)) console.warn(`[content] ${file}: status=${status} 非法，回退 published`)
    posts.push({
      slug,
      title: String(data.title),
      domain,
      date: String(data.date).slice(0, 10),
      anim_profile: VALID_ANIM.includes(anim) ? anim : 'auto',
      status: VALID_STATUS.includes(status) ? status : 'published',
      excerpt: String(data.excerpt || ''),
      body: content,
      fileName: file.replace(/\.(mdx|md)$/, ''),
    })
  }
  return posts.filter((p) => p.status === 'published').sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getPostsByDomain(domain: string): Post[] {
  return getAllPosts().filter((p) => p.domain === domain)
}

export function getAllDomains(): Domain[] {
  const posts = getAllPosts()
  const map = new Map<string, Post[]>()
  for (const p of posts) {
    if (!map.has(p.domain)) map.set(p.domain, [])
    map.get(p.domain)!.push(p)
  }
  const out: Domain[] = []
  for (const [slug, list] of map) {
    out.push({ slug, posts: list, updatedAt: list[0]?.date || '' })
  }
  return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getWips(): Wip[] {
  if (!fs.existsSync(WIP_DIR)) return []
  const files = fs.readdirSync(WIP_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
  const wips: Wip[] = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(WIP_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    wips.push({
      slug: String(data.slug || file.replace(/\.(mdx|md)$/, '')),
      title: String(data.title || '未命名'),
      status: String(data.status || 'in-progress'),
      progress: Number(data.progress ?? 0),
      thoughts: content.trim(),
    })
  }
  return wips
}

export function getFAQs(): Faq[] {
  const file = path.join(CONTENT_DIR, 'faqs.yaml')
  if (!fs.existsSync(file)) return []
  const parsed = yaml.load(fs.readFileSync(file, 'utf-8')) as Faq[] | null
  return Array.isArray(parsed) ? parsed : []
}

export function getSite(): SiteConfig {
  const file = path.join(CONTENT_DIR, 'site.yaml')
  const parsed = yaml.load(fs.readFileSync(file, 'utf-8')) as SiteConfig
  return parsed
}
```

- [ ] **Step 5: 写 src/lib/content.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost, getPostsByDomain, getAllDomains, getFAQs, getSite, getWips } from './content'

describe('content layer', () => {
  it('解析占位文章并只返回 published', () => {
    const posts = getAllPosts()
    expect(posts.length).toBeGreaterThanOrEqual(1)
    expect(posts.every((p) => p.status === 'published')).toBe(true)
    expect(posts[0]).toHaveProperty('slug', 'demo-animations')
    expect(posts[0]).toHaveProperty('anim_profile', 'architecture')
  })

  it('getPost 按 slug 命中', () => {
    expect(getPost('demo-animations')?.title).toContain('三种动画')
  })

  it('领域聚合：demo 文章归到 示例领域', () => {
    const domains = getAllDomains()
    expect(domains.some((d) => d.slug === '示例领域')).toBe(true)
    expect(getPostsByDomain('示例领域').length).toBeGreaterThanOrEqual(1)
  })

  it('缺 domain 的文章回退 general（当前无此文章，仅验证函数不抛错）', () => {
    expect(() => getPostsByDomain('general')).not.toThrow()
  })

  it('读 site.yaml', () => {
    const site = getSite()
    expect(site.site.name).toBeTruthy()
    expect(site.site.domains).toContain('示例领域')
  })

  it('wip 与 faq 目录为空时不抛错', () => {
    expect(Array.isArray(getWips())).toBe(true)
    expect(Array.isArray(getFAQs())).toBe(true)
  })
})
```

- [ ] **Step 6: 运行测试**

Run: `npm test`
Expected: 6 个用例全过（vitest 默认读 `src/**/*.test.ts`，`src/lib/content.test.ts` 直接用 node:fs 读 content/，无需 jsdom）。

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/content.ts src/lib/content.test.ts content/site.yaml content/posts/demo-animations.mdx
git commit -m "feat: 内容层 lib/content.ts（frontmatter 解析 + 领域聚合 + site/faq/wip 读取）
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: FAQ 数据 + 导航工具（跨页锚点跳转的纯函数）

**Files:**
- Create: `content/faqs.yaml`
- Create: `src/lib/nav.ts`
- Test: `src/lib/nav.test.ts`

**Interfaces:**
- Consumes: 无（不依赖 content.ts）。
- Produces: `resolveTarget(target: string, pathname: string): string` —— 把 `#contact` 规范成 `/current-path#contact`，`/blog/demo-animations#stack` 保持不变；`isSamePage(target: string, pathname: string): boolean`。供 Task 6 FAQRail 与 Task 7 Home 使用。

- [ ] **Step 1: 写 content/faqs.yaml**

```yaml
- id: contact
  text: 怎么联系到你？
  target: '#contact'
- id: latest-posts
  text: 你最近在写什么？
  target: '#blog'
- id: demo-animations
  text: 动画是怎么嵌进正文的？
  target: '/blog/demo-animations#animations'
```

- [ ] **Step 2: 写 src/lib/nav.ts**

```ts
export function resolveTarget(target: string, pathname: string): string {
  if (target.startsWith('#')) return pathname + target
  return target
}

export function isSamePage(target: string, pathname: string): boolean {
  const resolved = resolveTarget(target, pathname)
  const tPath = resolved.split('#')[0] || '/'
  return tPath === pathname
}
```

- [ ] **Step 3: 写 src/lib/nav.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { resolveTarget, isSamePage } from './nav'

describe('nav', () => {
  it('同页锚点规范化为当前路径', () => {
    expect(resolveTarget('#contact', '/')).toBe('/#contact')
    expect(resolveTarget('#blog', '/blog')).toBe('/blog#blog')
  })
  it('跨页锚点保持不变', () => {
    expect(resolveTarget('/blog/demo-animations#animations', '/')).toBe('/blog/demo-animations#animations')
  })
  it('isSamePage 判定', () => {
    expect(isSamePage('#contact', '/')).toBe(true)
    expect(isSamePage('/blog/demo-animations#animations', '/')).toBe(false)
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `npm test`
Expected: nav 3 个用例 + content 6 个用例全过。

- [ ] **Step 5: Commit**

```bash
git add content/faqs.yaml src/lib/nav.ts src/lib/nav.test.ts
git commit -m "feat: FAQ 数据与跨页锚点解析工具
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 动画组件库 blog-anim（Typewriter / Counter / ArchDiagram + registry）

**Files:**
- Create: `src/components/blog-anim/registry.ts`
- Create: `src/components/blog-anim/Typewriter.tsx`
- Create: `src/components/blog-anim/Counter.tsx`
- Create: `src/components/blog-anim/ArchDiagram.tsx`
- Test: `src/components/blog-anim/ArchDiagram.test.tsx`
- Modify: `src/styles/global.css`（追加动画组件样式）

**Interfaces:**
- Consumes: `gsap`（客户端 only）、`content/posts` 里的图数据（ArchDiagram 通过 props 收 `nodes/edges/bounds` 或 `diagram="demo"`）。
- Produces:
  - `registry: Record<string, React.FC<any>>` 含 `Typewriter/Counter/ArchDiagram`
  - `<Typewriter text={string} speed?: number />`
  - `<Counter from={number} to={number} suffix?: string label?: string duration?: number />`
  - `<ArchDiagram nodes={ArchNode[]} edges={ArchEdge[]} bounds={ArchBound[]} />`（另接受 `diagram="demo"` 快捷加载内嵌示例数据）
  - `type ArchNode/ArchEdge/ArchBound` 导出供文章图数据复用

- [ ] **Step 1: 写 src/components/blog-anim/registry.ts**

```ts
import type { ComponentType } from 'react'
import Typewriter from './Typewriter'
import Counter from './Counter'
import ArchDiagram from './ArchDiagram'

export const registry: Record<string, ComponentType<any>> = {
  Typewriter,
  Counter,
  ArchDiagram,
}
```

- [ ] **Step 2: 写 src/components/blog-anim/Typewriter.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  speed?: number // ms/字
}

export default function Typewriter({ text, speed = 55 }: Props) {
  const [out, setOut] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setOut(text); return }
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <span className="ba-type">
      {out}
      <span className="ba-caret" aria-hidden="true" />
    </span>
  )
}
```

- [ ] **Step 3: 写 src/components/blog-anim/Counter.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

interface Props {
  from: number
  to: number
  suffix?: string
  label?: string
  duration?: number
}

export default function Counter({ from, to, suffix = '', label, duration = 1.4 }: Props) {
  const numRef = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(from)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setValue(to); return }
    const obj = { n: from }
    const tween = gsap.to(obj, {
      n: to,
      duration,
      ease: 'power3.out',
      onUpdate: () => setValue(Math.round(obj.n)),
    })
    return () => { tween.kill() }
  }, [from, to, duration])

  return (
    <span className="ba-counter">
      <span ref={numRef} className="ba-counter-num">{value.toLocaleString()}</span>
      <span className="ba-counter-suffix">{suffix}</span>
      {label && <span className="ba-counter-label"> · {label}</span>}
    </span>
  )
}
```

- [ ] **Step 4: 写 src/components/blog-anim/ArchDiagram.tsx**

直接复用 style-tile.html 的 `buildArchSvg()` 逻辑，改成 React 组件（数据声明式，装配动画在 useEffect 里用与 style-tile 相同的时序：边界→节点→连线→标签，尊重 reduced-motion）。

```tsx
import { useEffect, useRef } from 'react'

export interface ArchNode {
  id: string; x: number; y: number; w: number; h: number
  kind: 'external' | 'key' | 'be' | 'db' | 'mq'
  label: string; sub: string; sigil: string
}
export interface ArchEdge {
  id: string; from: string; to: string
  fromSide: 'left' | 'right' | 'top' | 'bottom'
  toSide: 'left' | 'right' | 'top' | 'bottom'
  label?: string; emph?: boolean; dash?: boolean
  via?: { x: number; y: number }[]
}
export interface ArchBound { x: number; y: number; w: number; h: number; label: string }

interface Props {
  nodes: ArchNode[]
  edges: ArchEdge[]
  bounds?: ArchBound[]
  caption?: string
}

/* 与 style-tile.html 同款的 demo 数据（图几何已校验：锚点在边框、回源线走底部走廊） */
export const DEMO_ARCH: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'client', x: 40, y: 100, w: 130, h: 60, kind: 'external', label: '客户端', sub: 'Browser', sigil: 'M2 4h8M2 8h8M2 12h8' },
    { id: 'gw', x: 330, y: 100, w: 130, h: 60, kind: 'key', label: 'API 网关', sub: 'auth · rate-limit', sigil: 'M6 3 3 8l3 5M10 3l3 5-3 5' },
    { id: 'redis', x: 40, y: 260, w: 120, h: 60, kind: 'db', label: 'Redis', sub: 'cache :6379', sigil: 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v4c0 1.6 2.2 3 5 3s5-1.4 5-3V5' },
    { id: 'read', x: 220, y: 260, w: 130, h: 60, kind: 'key', label: '读服务 ×3', sub: 'hash 分片 · ttl 30s', sigil: 'M4 12a6 6 0 0 1 8-5M12 12a4 3 0 0 0-8 0zM5 12v3M9 12v3' },
    { id: 'write', x: 470, y: 260, w: 130, h: 60, kind: 'be', label: '写服务', sub: 'batch · retry 3', sigil: 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10' },
    { id: 'queue', x: 650, y: 260, w: 120, h: 60, kind: 'mq', label: '队列', sub: 'fifo', sigil: 'M2 4h12M2 8h12M2 12h12M2 4v8' },
    { id: 'db', x: 820, y: 260, w: 130, h: 60, kind: 'db', label: 'PostgreSQL', sub: 'primary :5432', sigil: 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5' },
  ],
  edges: [
    { id: 'e1', from: 'client', to: 'gw', fromSide: 'right', toSide: 'left', label: 'HTTPS', emph: true },
    { id: 'e2', from: 'gw', to: 'read', fromSide: 'bottom', toSide: 'top', label: 'route', via: [{ x: 395, y: 210 }, { x: 285, y: 210 }] },
    { id: 'e3', from: 'read', to: 'redis', fromSide: 'left', toSide: 'right', label: 'read-through', emph: true },
    { id: 'e4', from: 'gw', to: 'write', fromSide: 'right', toSide: 'top', label: 'enqueue', dash: true },
    { id: 'e5', from: 'write', to: 'queue', fromSide: 'right', toSide: 'left', label: '', dash: true },
    { id: 'e6', from: 'queue', to: 'db', fromSide: 'right', toSide: 'left', label: 'flush' },
    { id: 'e7', from: 'read', to: 'db', fromSide: 'bottom', toSide: 'bottom', label: 'miss 回源', via: [{ x: 285, y: 380 }, { x: 885, y: 380 }], dash: true },
  ],
  bounds: [
    { x: 200, y: 80, w: 440, h: 260, label: '应用层 · app' },
    { x: 20, y: 240, w: 160, h: 100, label: '缓存' },
    { x: 630, y: 240, w: 340, h: 100, label: '存储 / 队列' },
  ],
}

function anchor(n: ArchNode, side: string) {
  if (side === 'left') return { x: n.x, y: n.y + n.h / 2 }
  if (side === 'right') return { x: n.x + n.w, y: n.y + n.h / 2 }
  if (side === 'top') return { x: n.x + n.w / 2, y: n.y }
  return { x: n.x + n.w / 2, y: n.y + n.h }
}
function nodeById(nodes: ArchNode[], id: string) { return nodes.find((n) => n.id === id) }
function edgePath(nodes: ArchNode[], e: ArchEdge) {
  const a = anchor(nodeById(nodes, e.from)!, e.fromSide)
  const b = anchor(nodeById(nodes, e.to)!, e.toSide)
  if (!e.via) {
    if (e.fromSide === 'right' || e.fromSide === 'left') return `M${a.x},${a.y} H${b.x} V${b.y}`
    return `M${a.x},${a.y} V${b.y} H${b.x}`
  }
  let d = `M${a.x},${a.y}`
  e.via.forEach((p) => { d += ` L${p.x},${p.y}` })
  d += ` L${b.x},${b.y}`
  return d
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export default function ArchDiagram({ nodes, edges, bounds = [], caption }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const played = useRef(false)
  const W = Math.max(...nodes.map((n) => n.x + n.w)) + 60
  const H = Math.max(...nodes.map((n) => n.y + n.h)) + 60

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ns = Array.from(svg.querySelectorAll<SVGGElement>('.ag-node'))
    const es = Array.from(svg.querySelectorAll<SVGPathElement>('.ag-edge'))
    const boundsEls = Array.from(svg.querySelectorAll<SVGElement>('.ag-bound, .ag-bound-label'))
    const labs = Array.from(svg.querySelectorAll<SVGElement>('.ag-lab-bg, .ag-lab-tx'))
    const play = () => {
      if (reduced) return
      ns.forEach((n) => { n.style.transition = 'none'; n.style.opacity = '0' })
      es.forEach((p) => {
        const len = p.getTotalLength()
        p.style.transition = 'none'
        p.style.strokeDasharray = `${len} ${len}`
        p.style.strokeDashoffset = String(len)
        p.style.opacity = '1'
      })
      boundsEls.forEach((b) => { b.style.transition = 'none'; b.style.opacity = '0' })
      labs.forEach((l) => { l.style.transition = 'none'; l.style.opacity = '0' })
      void wrap.offsetWidth
      setTimeout(() => boundsEls.forEach((b) => { b.style.transition = 'opacity .5s'; b.style.opacity = '1' }), 60)
      const order = ['client', 'gw', 'read', 'redis', 'write', 'queue', 'db']
      order.forEach((id, i) => setTimeout(() => {
        const el = svg.querySelector<SVGGElement>(`[data-node="${id}"]`)
        if (el) { el.style.transition = 'opacity .4s'; el.style.opacity = '1' }
      }, 200 + i * 260))
      const eorder = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7']
      eorder.forEach((id, i) => setTimeout(() => {
        const el = svg.querySelector<SVGPathElement>(`[data-edge="${id}"]`)
        if (el) { el.style.transition = 'stroke-dashoffset .55s ease'; el.style.strokeDashoffset = '0' }
      }, 200 + (i + 1.5) * 260))
      setTimeout(() => labs.forEach((l) => { l.style.transition = 'opacity .5s'; l.style.opacity = '1' }), 200 + 9.2 * 260)
      played.current = true
    }
    play()
    wrap.addEventListener('click', play)
    return () => wrap.removeEventListener('click', play)
  }, [])

  return (
    <figure className="ba-arch" ref={wrapRef}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption || '架构示意'}>
        {bounds.map((b) => (
          <g key={b.label + b.x}>
            <rect className="ag-bound" x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
              fill="rgba(14,110,92,.045)" stroke="rgba(28,43,40,.3)" strokeWidth={1} strokeDasharray="6 4" />
            <text className="ag-bound-label" x={b.x + 12} y={b.y + 20} fontSize={10} letterSpacing={3}
              fill="#93A39C" fontFamily="var(--fang),serif">{b.label}</text>
          </g>
        ))}
        {edges.map((e) => {
          const color = e.emph ? '#0E6E5C' : '#55665F'
          const a = anchor(nodeById(nodes, e.from)!, e.fromSide)
          const b = anchor(nodeById(nodes, e.to)!, e.toSide)
          let lx = 0, ly = 0
          if (e.via) { lx = (a.x + e.via[0].x) / 2; ly = (a.y + e.via[0].y) / 2 }
          else if (e.fromSide === 'top' || e.fromSide === 'bottom') { lx = a.x + 34; ly = (a.y + b.y) / 2 }
          else { lx = (a.x + b.x) / 2; ly = a.y }
          const wpx = (e.label?.length || 0) * 6.4 + 14
          return (
            <g key={e.id}>
              <path className="ag-edge" data-edge={e.id} d={edgePath(nodes, e)}
                fill="none" stroke={color} strokeWidth={e.emph ? 1.8 : 1.4}
                strokeDasharray={e.dash ? '5 4' : undefined}
                markerEnd={e.emph ? 'url(#arE)' : 'url(#ar)'} />
              {e.label && (
                <>
                  <rect className="ag-lab-bg" x={lx - wpx / 2} y={ly - 8} width={wpx} height={16} rx={3} fill="#F6F7F4" />
                  <text className="ag-lab-tx" x={lx} y={ly + 3.5} textAnchor="middle" fontSize={9.5}
                    fill={e.emph ? '#0E6E5C' : '#55665F'} fontFamily="var(--mono),monospace">{e.label}</text>
                </>
              )}
            </g>
          )
        })}
        {nodes.map((n) => {
          const key = n.kind === 'key'
          return (
            <g key={n.id} className="ag-node" data-node={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={2} fill="#FFFFFF"
                stroke={key ? '#0E6E5C' : '#1C2B28'} strokeWidth={key ? 1.8 : 1.2} />
              <path d={n.sigil} transform={`translate(${n.x + 8} ${n.y + 7}) scale(0.85)`} fill="none"
                stroke="#0E6E5C" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
              <text x={n.x + n.w / 2} y={n.y + 26} textAnchor="middle" fontSize={11.5} fontWeight={600}
                fill="#1C2B28" fontFamily="var(--sans),sans-serif">{esc(n.label)}</text>
              <text x={n.x + n.w / 2} y={n.y + 44} textAnchor="middle" fontSize={9.5} fill="#93A39C"
                fontFamily="var(--mono),monospace" letterSpacing={0.5}>{esc(n.sub)}</text>
            </g>
          )
        })}
        <defs>
          <marker id="ar" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#55665F" />
          </marker>
          <marker id="arE" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#0E6E5C" />
          </marker>
        </defs>
      </svg>
      {caption && <figcaption className="ba-arch-caption">{caption}</figcaption>}
    </figure>
  )
}
```

> `id="ar"` / `id="arE"` 的 marker 在文章页内唯一；若未来单页多图，改生成 `useId()` 前缀（本轮不阻塞）。

- [ ] **Step 5: 追加动画组件样式到 global.css**

```css
/* 打字机 */
.ba-type { font-size: 1.05em; line-height: 1.75; }
.ba-caret { display: inline-block; width: 2px; height: 1.1em; background: var(--accent); vertical-align: -0.15em; animation: ba-blink 1s steps(1) infinite; }
@keyframes ba-blink { 50% { opacity: 0; } }
/* 计数器 */
.ba-counter { font: 700 2.4em/1.1 var(--mono); color: var(--ink); letter-spacing: -0.01em; }
.ba-counter-suffix { font-size: 0.6em; color: var(--ink-soft); }
.ba-counter-label { font: 0.45em var(--fang); letter-spacing: 0.1em; color: var(--ink-soft); }
/* 架构图容器 */
.ba-arch { margin: 1.4em 0; }
.ba-arch svg { width: 100%; height: auto; display: block; }
.ba-arch-caption { font: 0.8em var(--fang); letter-spacing: 0.1em; color: var(--ink-soft); margin-top: 8px; }
@media (prefers-reduced-motion: reduce) {
  .ba-caret { display: none; }
  .ba-arch .ag-node, .ba-arch .ag-bound, .ba-arch .ag-bound-label, .ba-arch .ag-lab-bg, .ba-arch .ag-lab-tx { opacity: 1 !important; }
}
```

- [ ] **Step 6: 写 ArchDiagram.test.tsx（jsdom 渲染冒烟）**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ArchDiagram, { DEMO_ARCH } from './ArchDiagram'

describe('ArchDiagram', () => {
  it('渲染节点与连线（节点数 = 数据节点数）', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    expect(container.querySelectorAll('.ag-node').length).toBe(DEMO_ARCH.nodes.length)
    expect(container.querySelectorAll('.ag-edge').length).toBe(DEMO_ARCH.edges.length)
  })
})
```

- [ ] **Step 7: 配置 vitest 环境**

**简化决策：避免 `vite.config.ts` 同时承载 vite 与 vitest 类型带来的歧义。** 用独立的 `vitest.config.ts`（vitest 会优先读取它）承担测试配置，`vite.config.ts` 保持不变：

`vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'

export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },
    react(),
  ],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
})
```

> `vitest.config.ts` 需加入 `tsconfig.node.json` 的 include。vitest 4 用 `vitest/config` 的 `defineConfig` 类型最稳；若 exec 阶段遇到类型问题，直接在 `.ts` 文件顶部加 `// @ts-nocheck` 并用 `import { defineConfig } from 'vitest/config'`（vitest 官方示例做法）。

创建 `vitest.setup.ts`：

```ts
// 动画组件在 jsdom 里直接走 reduced-motion 分支，不需要真 GSAP
import '@testing-library/jest-dom/vitest'

// jsdom 缺 matchMedia，补一个始终 returns reduced 的 stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: true, media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }),
})
```

> 需要额外 devDependency：`@testing-library/jest-dom`（`npm i -D @testing-library/jest-dom`）。

- [ ] **Step 8: 运行测试**

Run: `npm test`
Expected: Typewriter/Counter/ArchDiagram 相关用例 + 既有 content/nav 用例全过。

- [ ] **Step 9: 运行 build + typecheck**

Run: `npm run build`、`npm run typecheck`
Expected: 通过（Home 仍是临时占位，动画组件仅在 MDX 里被引用时才会进构建）。

- [ ] **Step 10: Commit**

```bash
git add src/components/blog-anim/ src/styles/global.css vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "feat: 动画组件库（Typewriter/Counter/ArchDiagram + registry）
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 文章渲染管线（MDX 编译 + 文章页 + 领域页 + 路由）

**Files:**
- Create: `src/pages/Post.tsx`
- Create: `src/pages/Domain.tsx`
- Modify: `src/routes.tsx`

**Interfaces:**
- Consumes: `getAllPosts/getPost/getPostsByDomain/getAllDomains`（Task 2）、`registry`（Task 4）、`MDXProvider`。
- Produces: 路由 `/blog/:slug`（getStaticPaths 枚举）、`/domain/:slug`；`Post.tsx` 内 `Head` 注入每页独立 title/meta（§9 验收）。

**MDX 编译约定（本 Task 核心决策）：** 用 Vite 原生的 `import.meta.glob(..., { eager: true })` 在构建期把 `content/posts/*.mdx` 编译为 React 组件映射（走 vite-plugin-mdx），按 `post.fileName` 查表取组件。**不做运行时编译**（客户端不引入 `@mdx-js/mdx`）。

- [ ] **Step 1: 写 src/pages/Post.tsx**

```tsx
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { MDXProvider } from '@mdx-js/react'
import { getPost, getAllPosts } from '../lib/content'
import { registry } from '../components/blog-anim'

/* 构建期：所有 content/posts/*.mdx 编译为组件映射（Vite 原生，eager） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*.mdx',
  { eager: true },
)

export function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  const list = useMemo(() => getAllPosts(), [])

  if (!post) {
    return <main className="post-wrap"><p>文章不存在。</p></main>
  }

  const idx = list.findIndex((p) => p.slug === post.slug)
  const prev = idx > 0 ? list[idx - 1] : undefined
  const next = idx < list.length - 1 ? list[idx + 1] : undefined

  const key = Object.keys(mdxModules).find((k) =>
    k.split('/').pop()!.replace(/\.mdx$/, '') === post.fileName,
  )
  const Body = key ? mdxModules[key].default : null

  return (
    <MDXProvider components={{ ...registry }}>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className="post-wrap">
        <div className="post-meta">
          <Link to={`/domain/${encodeURIComponent(post.domain)}`} className="tag">{post.domain}</Link>
          <time>{post.date}</time>
          <span className="anim-badge">{post.anim_profile}</span>
        </div>
        <h1>{post.title}</h1>
        <p className="post-excerpt">{post.excerpt}</p>
        <article className="post-body" id="animations">
          {Body ? <Body /> : <p>正文缺失。</p>}
        </article>
        <nav className="post-nav">
          {prev && <Link to={`/blog/${prev.slug}`}>← {prev.title}</Link>}
          {next && <Link to={`/blog/${next.slug}`}>{next.title} →</Link>}
        </nav>
      </main>
    </MDXProvider>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}
```

> `Head` 来自 `vite-react-ssg`（已确认导出，README §Document head）。`article` 的 `id="animations"` 供 FAQ 跨页锚点 `#animations` 定位（对应 faqs.yaml 的 `target: '/blog/demo-animations#animations'`）。

- [ ] **Step 2: 写 src/pages/Domain.tsx**

```tsx
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getAllDomains, getPostsByDomain } from '../lib/content'

export function Component() {
  const { slug = 'general' } = useParams()
  const posts = getPostsByDomain(slug)
  const domains = getAllDomains()
  return (
    <>
      <Head>
        <title>领域 · {slug}</title>
        <meta name="description" content={`${slug} 领域的文章列表`} />
      </Head>
      <main className="domain-wrap">
        <p className="eyebrow">领域 · DOMAIN</p>
        <h1>{slug}</h1>
        <p className="dim">该领域下 {posts.length} 篇文章</p>
        <ul className="domain-posts">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link to={`/blog/${p.slug}`}>{p.title}</Link>
              <time>{p.date}</time>
            </li>
          ))}
        </ul>
        <nav className="domain-links">
          {domains.map((d) => (
            <Link key={d.slug} to={`/domain/${encodeURIComponent(d.slug)}`} className={d.slug === slug ? 'on' : ''}>
              {d.slug}
            </Link>
          ))}
        </nav>
      </main>
    </>
  )
}

export const entry = 'src/pages/Domain.tsx'

export function getStaticPaths() {
  return getAllDomains().map((d) => `/domain/${encodeURIComponent(d.slug)}`)
}
```

- [ ] **Step 3: 更新 src/routes.tsx 接入新路由**

```tsx
import type { RouteRecord } from 'vite-react-ssg'
import { getAllPosts, getAllDomains } from './lib/content'

export const routes: RouteRecord[] = [
  {
    path: '/',
    Component: () => import('./App'),
    children: [
      { index: true, Component: () => import('./pages/Home') },
      {
        path: 'blog/:slug',
        Component: () => import('./pages/Post'),
        getStaticPaths: () => getAllPosts().map((p) => `/blog/${p.slug}`),
      },
      {
        path: 'domain/:slug',
        Component: () => import('./pages/Domain'),
        getStaticPaths: () => getAllDomains().map((d) => `/domain/${encodeURIComponent(d.slug)}`),
      },
    ],
  },
]
```

> 路由表里直接用 `getAllPosts()/getAllDomains()`（构建期在 Node 侧执行，安全）。若 exec 阶段发现模块加载时序问题（import 提前于 content 读取），回退为显式字符串数组。

- [ ] **Step 4: 运行 build，验证 SSG 产出**

Run: `npm run build`
Expected:
- `dist/index.html`
- `dist/blog/demo-animations/index.html` 存在，且 `grep '示例文章：三种动画是怎么嵌入正文的'` 命中（SSG 预渲染）
- `grep -o '<title>[^<]*</title>' dist/blog/demo-animations/index.html` = `示例文章：三种动画是怎么嵌入正文的 · 示例领域`
- `dist/domain/示例领域/index.html` 存在

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
git add src/pages/Post.tsx src/pages/Domain.tsx src/routes.tsx
git commit -m "feat: 文章页/领域页 + MDX 编译管线（SSG 每路由独立 HTML）
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: FAQ 粘性列 + 跨页跳转逻辑

**Files:**
- Create: `src/components/FAQRail.tsx`
- Create: `src/components/scrollTo.ts`
- Modify: `src/pages/Post.tsx`（挂 FAQ 列，可选：文章页不显示 FAQ 列，仅首页显示）
- Test: `src/components/scrollTo.test.ts`（纯逻辑部分）

**Interfaces:**
- Consumes: `getFAQs()`（Task 2）、`resolveTarget/isSamePage`（Task 3）。
- Produces: `<FAQRail />` 组件（桌面右侧粘性列 + 移动底部抽屉双形态，spec §3.1/§9）；`scrollToHash(target, pathname)` —— 同页平滑滚动并触发动画（返回 Promise），跨页先 `navigate` 再 rAF 滚动。

- [ ] **Step 1: 写 src/components/scrollTo.ts**

```ts
import { resolveTarget, isSamePage } from '../lib/nav'

export function scrollToHash(target: string, pathname: string): void {
  const hash = resolveTarget(target, pathname).split('#')[1]
  const el = hash ? document.getElementById(hash) : document.getElementById('top')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('flash-target')
  void el.offsetWidth
  el.classList.add('flash-target')
}

export function handleFaqClick(target: string, pathname: string, navigate: (to: string) => void): void {
  if (isSamePage(target, pathname)) {
    scrollToHash(target, pathname)
  } else {
    navigate(resolveTarget(target, pathname))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToHash(target, pathname))
    })
  }
}
```

> 跨页跳转：先 `navigate()`（路由切换 → 新页渲染），再双层 rAF 后滚动到目标锚点并触发动画（spec §3.2）。

- [ ] **Step 2: 写 src/components/FAQRail.tsx**

```tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { getFAQs } from '../lib/content'
import { handleFaqClick } from './scrollTo'

export default function FAQRail() {
  const faqs = getFAQs()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside className="faq-rail" aria-label="常见问题导航">
      <p className="faq-title">面试官常问</p>
      <p className="faq-sub">点问题 → 跳到答案并触发动画</p>
      {faqs.map((f) => (
        <button key={f.id} className="faq-item" onClick={() => handleFaqClick(f.target, pathname, navigate)}>
          <span className="faq-no">{f.id}</span>
          <span className="faq-text">{f.text}</span>
          <span className="faq-dash" aria-hidden="true" />
        </button>
      ))}
    </aside>
  )
}
```

- [ ] **Step 3: 追加 FAQ 列样式到 global.css**

```css
.faq-rail { position: sticky; top: 28px; display: flex; flex-direction: column; gap: 2px; }
.faq-title { font: 15px var(--fang); letter-spacing: 0.3em; color: var(--ink-soft); margin: 0 0 6px; }
.faq-sub { font: 12px var(--mono); color: var(--ink-faint); margin: 0 0 16px; letter-spacing: 0.04em; }
.faq-item {
  display: flex; align-items: baseline; gap: 10px;
  width: 100%; text-align: left; background: transparent; border: 0;
  border-bottom: 1px dashed var(--line); padding: 9px 2px;
  cursor: pointer; font-family: inherit;
}
.faq-no { font: 12px var(--mono); color: var(--ink-faint); }
.faq-text { font: 15px var(--fang); letter-spacing: 0.06em; color: var(--ink); }
.faq-dash { width: 18px; height: 1px; background: var(--ink-faint); transition: width 0.2s, background 0.2s; }
.faq-item:hover .faq-dash { width: 44px; background: var(--accent); }
.faq-item:hover .faq-text { color: var(--accent); }
.faq-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.flash-target { animation: flash-target 1s both; }
@keyframes flash-target {
  0% { box-shadow: 0 0 0 3px var(--accent-soft); background: var(--accent-soft); }
  100% { box-shadow: 0 0 0 3px transparent; background: transparent; }
}
@media (max-width: 920px) {
  .faq-rail { position: static; order: -1; }  /* 移动端：顶部堆叠（spec §9：底部抽屉为迭代项） */
}
```

- [ ] **Step 4: 写 src/components/scrollTo.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { resolveTarget, isSamePage } from '../lib/nav'
import { handleFaqClick } from './scrollTo'

describe('scrollTo / handleFaqClick', () => {
  it('同页锚点走平滑滚动路径', () => {
    const navigate = () => { throw new Error('不应导航') }
    // jsdom 无滚动实现，验证不抛错即可
    expect(() => handleFaqClick('#contact', '/', navigate)).not.toThrow()
  })
  it('跨页锚点走导航路径', () => {
    let called = ''
    const navigate = (to: string) => { called = to }
    // rAF 在 jsdom 中同步执行，滚动目标不存在时安全返回
    handleFaqClick('/blog/demo-animations#animations', '/', navigate)
    expect(called).toBe('/blog/demo-animations#animations')
    expect(resolveTarget('/blog/demo-animations#animations', '/')).toContain('demo-animations')
    expect(isSamePage('/blog/demo-animations#animations', '/')).toBe(false)
  })
})
```

- [ ] **Step 5: 运行测试 + build**

Run: `npm test`
Expected: 全部通过。

Run: `npm run build`
Expected: 通过（FAQ 列仅在 Home 挂载后生效，当前 Home 还是占位；Task 7 挂载）。

- [ ] **Step 6: Commit**

```bash
git add src/components/FAQRail.tsx src/components/scrollTo.ts src/components/scrollTo.test.ts src/styles/global.css
git commit -m "feat: FAQ 粘性列 + 同页/跨页锚点跳转逻辑
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 首页 Home（亮点 + 尺寸线 + 博客列表 + WIP + 联系）

**Files:**
- Modify: `src/pages/Home.tsx`
- Create: `src/components/Highlights.tsx`
- Create: `src/components/PostList.tsx`
- Create: `src/components/WipList.tsx`
- Create: `src/components/Contact.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `getAllPosts/getWips/getSite/getFAQs`（Task 2）、`FAQRail`（Task 6）、`handleFaqClick`（Task 6）、`registry`（Task 4）。
- Produces: 完整首页（hero + 亮点图例 + 尺寸线签名 + 博客区 + 动画样张区 + 在做项目 + 联系方式），是 §9 首页验收的落点。

- [ ] **Step 1: 写 src/components/Highlights.tsx**

```tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { getFAQs } from '../lib/content'
import { handleFaqClick } from './scrollTo'

/* 亮点 = FAQ 的另一个视图（spec §3.2）：文案来自 faqs.yaml，跳转行为与 FAQ 一致 */
export default function Highlights() {
  const faqs = getFAQs()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <div className="highlights">
      {faqs.map((f, i) => (
        <button key={f.id} className="hl" style={{ animationDelay: `${0.45 + i * 0.1}s` }}
          onClick={() => handleFaqClick(f.target, pathname, navigate)}>
          <span className="hl-name">{f.text}</span>
          <span className="hl-target">{f.target}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 写 src/components/PostList.tsx**

```tsx
import { Link } from 'react-router-dom'
import { getAllPosts } from '../lib/content'

export default function PostList() {
  const posts = getAllPosts()
  return (
    <section className="posts-section">
      <div className="sec-head"><span className="sec-title"><b>博客</b> · 时间倒序</span><span className="sec-rule" /></div>
      {posts.map((p) => (
        <Link key={p.slug} to={`/blog/${p.slug}`} className="post-card">
          <div className="post-meta">
            <span className="tag">{p.domain}</span>
            <time>{p.date}</time>
          </div>
          <h3>{p.title}</h3>
          <p>{p.excerpt}</p>
          <span className="anim-badge">anim · {p.anim_profile}</span>
        </Link>
      ))}
    </section>
  )
}
```

- [ ] **Step 3: 写 src/components/WipList.tsx**

```tsx
import { getWips } from '../lib/content'

export default function WipList() {
  const wips = getWips()
  if (!wips.length) return null
  return (
    <section className="wip-section">
      <div className="sec-head"><span className="sec-title"><b>在做</b> · WIP</span><span className="sec-rule" /></div>
      {wips.map((w) => (
        <article key={w.slug} className="wip-card">
          <div className="wip-top"><h3>{w.title}</h3><span className="wip-status">{w.status}</span></div>
          <p className="wip-thoughts">{w.thoughts}</p>
          <div className="progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${w.progress}%` }} /></div>
            <span className="progress-num">{w.progress}%</span></div>
        </article>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: 写 src/components/Contact.tsx**

```tsx
import { getSite } from '../lib/content'

export default function Contact() {
  const site = getSite().site
  return (
    <section className="contact" id="contact">
      <p className="eyebrow">联系 · CONTACT</p>
      <div className="contact-lines">
        <div className="c-line"><span className="c-label">邮箱</span><a href={`mailto:${site.email}`}>{site.email}</a></div>
        <div className="c-line"><span className="c-label">GitHub</span><a href={site.github} target="_blank" rel="noreferrer">{site.github}</a></div>
      </div>
      <div className="qr">
        {site.wechat_qr.endsWith('.png')
          ? <img src={site.wechat_qr} alt="微信二维码" />
          : <span>微信二维码<br />占位</span>}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: 重写 src/pages/Home.tsx 为完整首页**

```tsx
import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getSite, getAllPosts, getWips } from '../lib/content'
import Highlights from '../components/Highlights'
import PostList from '../components/PostList'
import WipList from '../components/WipList'
import Contact from '../components/Contact'
import FAQRail from '../components/FAQRail'
import { Counter, Typewriter, ArchDiagram, DEMO_ARCH } from '../components/blog-anim'

export default function Home() {
  const site = getSite().site
  const count = getAllPosts().length
  const wips = getWips()
  return (
    <>
      <Head>
        <title>{site.name} · 个人博客</title>
        <meta name="description" content={site.tagline} />
      </Head>

      <header className="topbar">
        <span className="logo">{site.name}</span>
        <nav className="topnav">
          <Link to="/#blog">博客</Link>
          <Link to="/#contact">联系</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <p className="eyebrow">候选人档案<span className="no">UPDATED 2026-08</span></p>
        <h1 className="hero-h1">{site.tagline}</h1>
        <div className="dim-line">
          <span className="dim-end" /><span className="dim-line-grow" />
          <span className="dim-text">{site.name} · {count} 篇文章 · 示例</span>
          <span className="dim-line-grow" /><span className="dim-end" />
        </div>
        <p className="legend-label">亮点图例</p>
        <Highlights />
        <div className="cta-row">
          <a className="btn btn-solid" href="#contact">直接联系我</a>
          <a className="btn btn-ghost" href="#blog">先看博客 ↓</a>
        </div>
      </section>

      {/* 主体两栏：左内容 + 右 FAQ 列 */}
      <main className="main-grid">
        <div className="main-col">
          <PostList />

          {/* 动画样张区：把三种动画一次性展示（spec §3.2 落地） */}
          <section className="anim-section">
            <div className="sec-head"><span className="sec-title"><b>动画样张</b> · 三种档案</span><span className="sec-rule" /></div>
            <div className="specimens">
              <div className="spec"><div className="spec-label">TYPEWRITER · story</div><div className="spec-body"><Typewriter text="问题不是流量大，是读多写少还要求强一致——我们把缓存当成了第一方案，又亲手把它撤了。" /></div></div>
              <div className="spec"><div className="spec-label">COUNTER · data-narrative</div><div className="spec-body"><Counter from={0} to={4200} suffix=" QPS" label="峰值压测（占位）" /></div></div>
            </div>
            <div className="spec full"><div className="spec-label">ARCH DIAGRAM · architecture · 装配动画</div><ArchDiagram {...DEMO_ARCH} caption="读多写少架构示意（占位数据）" /></div>
          </section>

          <WipList />
        </div>
        <FAQRail />
      </main>

      <Contact />
    </>
  )
}
```

- [ ] **Step 6: 追加首页样式到 global.css**

直接对照 `docs/design/style-tile.html` 的 `.t-hero/.t-h1/.t-dim/.t-highlights/.t-hl/.t-cta-row/.t-btn/.t-main/.t-sec-head/.t-post/.t-wip/.t-progress/.t-contact` 等类，把类名前缀 `t-` 去掉照抄（hero、尺寸线、亮点、按钮、分区标题、文章卡片、WIP、联系、QR）。重点保证：坐标网格已有（Task 1）、hover 上移 2px、`flash-target` 动画（Task 6）在目标 section 上生效。

- [ ] **Step 7: 运行 build，验证首页验收**

Run: `npm run build`
Expected: `dist/index.html` 含 `<title>{site.name} · 个人博客</title>`（来自 site.yaml 的占位名）、hero 文案、`<div class="faq-rail">`、`<div class="highlights">`。

Run: `npm run typecheck`
Expected: 无错误（注意删除 `getAllDomains` 未使用的 import）。

Run: `npm test`
Expected: 全过。

- [ ] **Step 8: Commit**

```bash
git add src/pages/Home.tsx src/components/Highlights.tsx src/components/PostList.tsx src/components/WipList.tsx src/components/Contact.tsx src/styles/global.css
git commit -m "feat: 首页（hero+亮点+博客列表+动画样张+WIP+联系+FAQ 列）
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: 验收清单逐项核验（spec §9）

**Files:** 无（只跑命令 + 读产出）。

- [ ] **Step 1: 构建通过**

Run: `npm run build`
Expected: `dist/` 下有 `index.html`、`blog/demo-animations/index.html`、`domain/示例领域/index.html`。

- [ ] **Step 2: 每页独立 title/meta**

Run: `grep -o '<title>[^<]*</title>' dist/index.html dist/blog/demo-animations/index.html`
Expected: 首页 = 站点名；文章页 = `示例文章：三种动画是怎么嵌入正文的 · 示例领域`。

Run: `grep -o '<meta name="description" content="[^"]*"' dist/blog/demo-animations/index.html`
Expected: 非空（等于该文 excerpt）。

- [ ] **Step 3: 无 JS 可读正文骨架**

Run: `grep -o '示例文章：三种动画是怎么嵌入正文的' dist/blog/demo-animations/index.html`
Expected: 命中（SSG 预渲染证明）。

- [ ] **Step 4: FAQ 列与亮点都在首页**

Run: `grep -c 'faq-item' dist/index.html` 与 `grep -c 'hl-name' dist/index.html`
Expected: 均 ≥ 1。

- [ ] **Step 5: 动画组件出现在文章页 HTML**

Run: `grep -c 'ba-type\|ba-counter\|ag-node' dist/blog/demo-animations/index.html`
Expected: ≥ 1（动画组件在 SSG 期渲染为静态标记，动画运行时 JS 才播）。

- [ ] **Step 6: 本地预览手测**

Run: `npm run preview`，浏览器打开 http://localhost:4173
手测：
- 首页首屏 ≤ 1 屏看到 hero + 亮点 + 联系入口
- 点 FAQ"动画是怎么嵌进正文的" → 跳转到 `/blog/demo-animations#animations`，页面滚动到正文并触发打字机/计数/架构图动画
- 移动宽度（DevTools 375px）FAQ 列堆叠到顶部

- [ ] **Step 7: 记录验收结果**

在计划文件末尾追加一段"验收结果"小节，逐项打勾/记录偏差。

---

### Task 9: 部署到 CloudBase（tcb hosting）

**Files:**
- Create: `.github/workflows/deploy.yml`（可选，先手动部署）

**Interfaces:**
- Consumes: `dist/`（Task 8 产物）、`tcb` CLI（本机 3.8.1 已登录，env `blog-d9glz3crx8ae02654`）。

- [ ] **Step 1: 构建**

Run: `npm run build`
Expected: 通过（Task 8 已验）。

- [ ] **Step 2: 部署**

Run: `tcb hosting deploy dist -e blog-d9glz3crx8ae02654`
Expected: 上传 dist/ 到静态托管；输出部署成功与默认域名。

- [ ] **Step 3: 验证线上**

浏览器打开部署输出的默认域名：
- 首页可访问、样式正确（纸白 + 网格 + 图纸青）
- 直接访问 `https://<domain>/blog/demo-animations/` 可打开文章页（dirStyle=nested → `.../blog/demo-animations/`）
- 微信分享卡片（若有）能读到 title/description

- [ ] **Step 4: （可选）写 GitHub Actions 工作流**

`.github/workflows/deploy.yml`（CI 里 push → build → deploy；secrets 配 `TCB_ENV_ID` + `TCB_SECRET_ID/KEY`）：

```yaml
name: deploy
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build
      - run: npx @cloudbase/cli@latest hosting deploy dist -e ${{ secrets.TCB_ENV_ID }}
        env:
          TENCENTCLOUD_SECRET_ID: ${{ secrets.TCB_SECRET_ID }}
          TENCENTCLOUD_SECRET_KEY: ${{ secrets.TCB_SECRET_KEY }}
```

- [ ] **Step 5: Commit（部署相关文件）**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: CloudBase 静态托管部署工作流
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: 收尾 —— spec 开放点提醒 + 阶段交接

**Files:** 无（只输出）。

- [ ] **Step 1: 确认所有 §9 验收项状态**

对照 spec §9，把 Task 8 记录逐项核对，列出仍为"待填真实数据"的占位（不阻塞）：领域清单、微信二维码图片、公开邮箱、GitHub 链接、hero 文案。

- [ ] **Step 2: 向用户报告**

输出：构建/部署成功、线上域名、占位项清单（等待用户填个人信息后再替换）、下一步建议（GitHub Actions 启用 + 内容填充）。

---

**结束。** 本计划 10 个 Task，每个 Task 独立可测、可 commit。遇到 vite-react-ssg + MDX glob 集成等 spec §10 已列风险时，按该节缓解路径降级（换 vike / Astro 兜底），并在验收记录中说明。
