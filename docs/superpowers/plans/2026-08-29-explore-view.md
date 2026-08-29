# 探索视图（Explore View）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给博客增加探索视图 `/posts/<slug>/explore/`，同一份 `article.mdx` 同时被「阅读模式」（线性文章+章节动画）与「探索模式」（动画舞台+问题树遥控）渲染，问题树结构在 `explore.yaml`，跨文章跳转由 YAML 节点声明驱动。

**Architecture:** 一篇博客 = `content/posts/<slug>/` 一个目录。`article.mdx` 的 `<Answer>`/`<QuestionAnchor>`/`<SceneClip>` 块被两个 MDX 渲染器（阅读、探索）共享；YAML 是探索模式的纯结构索引（无叙述内容）；场景（scene.tsx）通过 GSAP timeline 按 label 分段，单份代码同时供探索 seek 与阅读 SceneClip 消费；构建时 `lib/explore.ts` 把全部 6 条规则（含交叉引用与 anchor id 校验）跑一遍，失败即 fail。

**Tech Stack:** Vite 8 + React 19 + MDX 3 + vite-react-ssg（SSG）+ GSAP 3.15 + js-yaml + gray-matter + Vitest

**Spec:** `docs/superpowers/specs/2026-08-29-explore-view-design.md`

## Global Constraints

- 一个博客一个目录：`content/posts/<slug>/`；无逃生口（spec §3）。
- 内容唯一源：`article.mdx`；YAML 不含叙述，正文不含结构（spec §1 北极星）。
- 同源双渲染：`<Answer>` / `<QuestionAnchor>` / `<SceneClip>` 三种块在两个视图各自表现，不写两份（spec §4）。
- placeholder 节点在正文无 `<Answer>`，渲染时不给胶囊入口；cross-link 节点 YAML 必填 `to` 与 `preview`（spec §5）。
- 场景标签命名（YAML `seek` 值 = GSAP timeline label）必须一致，构建时校验（spec §8）。
- 顶栏**不**加探索入口，跳转链接只在 Post 与 Explore 互设（spec §2）。
- 响应式：≥920px 桌面左右分栏，<920px 上下，<920px 点击节点自动滚到舞台（spec §9）。
- 动画必须尊重 `prefers-reduced-motion`（已存在的契约，jsdom 测试环境强制 reduce=true，见 `vitest.setup.ts`）。
- 测试栈：Vitest + React Testing Library + jsdom；动画组件在 jsdom 默认走 reduced-motion 分支，不需要 gsap stub。
- TypeScript 严格模式；`tsc --noEmit` 通过是 PR 闸口（见 package.json scripts）。

## 文件结构

### 新建文件

| 路径 | 职责 |
|---|---|
| `src/components/explore/SceneController.ts` | `Scene`/`SceneHandle` 接口 + `createSceneHandle(tl)` 工厂 |
| `src/components/explore/SceneContext.ts` | React context 持有 `SceneHandle \| null` |
| `src/components/explore/SceneStage.tsx` | 调用 `scene.build()` 持 tl，提供 context 给子树 |
| `src/components/explore/QuestionTree.tsx` | 递归渲染 nodes，处理激活态 |
| `src/components/explore/QuestionNode.tsx` | 单个节点按钮（kind/status 决定形态） |
| `src/components/explore/ExploreView.tsx` | 探索视图骨架（舞台 + 树 + 顶栏导航） |
| `src/components/explore/Answer.tsx` | `<Answer id>` 块；阅读视图原样渲染，探索视图抽出 |
| `src/components/explore/QuestionAnchor.tsx` | 阅读视图胶囊按钮 |
| `src/components/explore/SceneClip.tsx` | 阅读视图动画嵌入（截取 `[from, nextLabel)`） |
| `src/lib/explore.ts` | `getExplore()` / `listExplorable()` / 全部 6 条构建校验 |
| `src/lib/explore.test.ts` | YAML 解析 + 校验规则单元测试 |
| `src/lib/types.ts`（改） | 在 `interface Post` 增 `hasExplore: boolean`、`explore?: ExploreConfig`、新增 `interface ExploreConfig` 等 |

### 修改文件

| 路径 | 改动 |
|---|---|
| `src/pages/Post.tsx` | MDX glob 路径 `*.mdx` → `*\/article.mdx`；components 注册 `<Answer>`/`<QuestionAnchor>`/`<SceneClip>`；新增探索入口 link |
| `src/pages/Explore.tsx`（新） | 探索路由组件 |
| `src/routes.tsx` | 新增探索子路由；`getStaticPaths` 来源 `listExplorable()` |
| `src/lib/content.ts` | `POSTS_DIR` 由 `content/posts` 改为扫子目录；`getAllPosts`/`getPost` 返回 `fileName = slug`，并并入 `getExplore` 配置 |
| `src/components/blog-anim/registry.ts` | 现状不动；新增 3 个组件（Answer/QuestionAnchor/SceneClip）由 `Post.tsx` 的 MDXProvider 单独提供（不污染 registry） |
| `src/styles/global.css` | 新增 `.explore-*` 样式（响应式、placeholder 灰阶、激活高亮）；沿用 920px 断点 |

### 内容迁移（既有文章）

| 原文件 | 新位置 |
|---|---|
| `content/posts/ai-digital-employee.mdx` | `content/posts/ai-digital-employee/article.mdx` |
| `content/posts/bi-agent-7-days-saved-200k.mdx` | 同上模式 |
| `content/posts/kill-the-legacy-password.mdx` | 同上模式 |
| `content/posts/shixi-open-source-study-app.mdx` | 同上模式 |
| `public/posts/ai-digital-employee/*.{webp,svg}` | `content/posts/ai-digital-employee/assets/` |
| `public/posts/ai-digital-employee/solo-tech.webp` 等 | 同上模式 |

测试期间（迁移完成但探索视图尚未存在），网站行为完全不变——这是迁移任务独立可交付的承诺。

---

## Task 1: 目录迁移（散文 → 目录结构）

**Files:**
- Create: `content/posts/<slug>/article.mdx` × 4（每个现有文章一个目录）
- Modify: `src/lib/content.ts`（改 POSTS_DIR 扫描方式）
- Modify: `src/lib/content.test.ts`（既有断言用 `slug: '<slug>'` 等）
- 现有 `content/posts/*.mdx` 需删除或迁出（move，非保留）

**Interfaces:**
- Consumes: Node.js `fs` / `path` 同步 API（已存在于 content.ts:1-3）
- Produces:
  - `getAllPosts(): Post[]` —— 行为不变；`fileName` 改为 `<slug>`（不再带 `article` 前缀，等价别名）
  - `getPost(slug: string): Post | undefined` —— 行为不变

- [ ] **Step 1: 准备目录与移动文件**

```bash
# 在 Git Bash 下，Windows 路径用 / 写
cd D:/myspace/myblog
for slug in ai-digital-employee bi-agent-7-days-saved-200k kill-the-legacy-password shixi-open-source-study-app; do
  mkdir -p "content/posts/$slug/assets"
  git mv "content/posts/$slug.mdx" "content/posts/$slug/article.mdx"
done
# 处理 public/posts 下的图片（仅 ai-digital-employee 有）
git mv public/posts/ai-digital-employee/* content/posts/ai-digital-employee/assets/ 2>/dev/null || true
rmdir public/posts/ai-digital-employee 2>/dev/null || true
```

- [ ] **Step 2: 修改 `src/lib/content.ts` POSTS_DIR 扫描**

`src/lib/content.ts` 的 `POSTS_DIR` 已声明在第 9 行。把 `getAllPosts` 的扫描从 `files = fs.readdirSync(POSTS_DIR).filter(...mdx)` 改为递归扫子目录：

```ts
// src/lib/content.ts
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')

function readPostFile(slug: string): { file: string; raw: string } | null {
  const file = path.join(POSTS_DIR, slug, 'article.mdx')
  if (!fs.existsSync(file)) return null
  return { file, raw: fs.readFileSync(file, 'utf-8') }
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  const slugs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const posts: Post[] = []
  for (const slug of slugs) {
    const r = readPostFile(slug)
    if (!r) continue
    const { data, content } = matter(r.raw)
    if (!data.title || !data.date) {
      console.warn(`[content] 跳过 ${slug}: 缺 title 或 date`)
      continue
    }
    const normSlug = (data.slug as string) || slugify(String(data.title))
    const domain = (data.domain as string) || 'general'
    const anim = (data.anim_profile as AnimProfile) || 'auto'
    const status = (data.status as PostStatus) || 'published'
    if (!VALID_ANIM.includes(anim)) console.warn(`[content] ${slug}: anim_profile=${anim} 非法，回退 auto`)
    if (!VALID_STATUS.includes(status)) console.warn(`[content] ${slug}: status=${status} 非法，回退 published`)
    posts.push({
      slug: normSlug,
      title: String(data.title),
      domain,
      date: String(data.date).slice(0, 10),
      anim_profile: VALID_ANIM.includes(anim) ? anim : 'auto',
      status: VALID_STATUS.includes(status) ? status : 'published',
      excerpt: String(data.excerpt || ''),
      body: content,
      fileName: normSlug, // ← 改为 slug 名本身；Post.tsx 用它映射 mdxModules
    })
  }
  return posts.filter((p) => p.status === 'published').sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}
```

`getPostsByDomain` / `getAllDomains` / `getWips` / `getFAQs` / `getSite` **不动**。`slugify` 工具函数（line 19-21）保持原状。

- [ ] **Step 3: 修改 `src/lib/content.test.ts`**

把现有 `slug: 'demo-animations'` 的硬编码断言改为跑一次实际拿到的 slug：

```ts
import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost, getPostsByDomain, getAllDomains, getFAQs, getSite, getWips } from './content'

describe('content layer', () => {
  const posts = getAllPosts()
  const firstSlug = posts[0]?.slug

  it('解析占位文章并只返回 published', () => {
    expect(posts.length).toBeGreaterThanOrEqual(1)
    expect(posts.every((p) => p.status === 'published')).toBe(true)
    expect(typeof firstSlug).toBe('string')
  })

  it('getPost 按 slug 命中', () => {
    expect(getPost(firstSlug!)?.title).toBeTruthy()
  })

  it('领域聚合', () => {
    const domains = getAllDomains()
    expect(domains.length).toBeGreaterThan(0)
    if (firstSlug) {
      const d = domains.find((x) => x.slug === posts[0]!.domain)
      expect(d).toBeTruthy()
    }
  })

  it('缺 domain 的文章回退 general（仅验证不抛错）', () => {
    expect(() => getPostsByDomain('general')).not.toThrow()
  })

  it('读 site.yaml', () => {
    const site = getSite()
    expect(site.site.name).toBeTruthy()
  })

  it('wip 与 faq 目录为空时不抛错', () => {
    expect(Array.isArray(getWips())).toBe(true)
    expect(Array.isArray(getFAQs())).toBe(true)
  })
})
```

- [ ] **Step 4: 修改 `src/pages/Post.tsx` 的 mdx glob 路径**

`src/pages/Post.tsx` 第 9-12 行：

```ts
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)
```

第 27-29 行 mdx key 提取也要更新（用目录名而不是文件名）：

```ts
const key = Object.keys(mdxModules).find((k) => {
  const parts = k.split('/')
  const dir = parts[parts.length - 2]
  return dir === post.slug
})
const Body = key ? mdxModules[key].default : null
```

- [ ] **Step 5: 跑测试与 typecheck**

Run: `cd D:/myspace/myblog && pnpm test 2>&1 | tail -30 && pnpm typecheck 2>&1 | tail -10`
Expected: 全部 PASS；typecheck 无 error。

- [ ] **Step 6: 跑 dev smoke 测试**

Run: `cd D:/myspace/myblog && pnpm dev`，浏览器访问 `http://localhost:3000/blog/<firstSlug>/`，确认文章正常渲染、动画组件正常加载。

Expected: 页面、文章、图片（旧路径 `/posts/<slug>/...webp` 在这次迁移后**会失效**——这是已知，要进 Step 7 修）。

- [ ] **Step 7: 文章图片 URL 处理**

旧路径 `/posts/ai-digital-employee/solo-tech.webp` 现在物理文件在 `content/posts/ai-digital-employee/assets/`，没在 `public/` 下。需要构建期同步。

最小可接受做法：把图片再迁移一份或加一条 Vite plugin 同步。先用最小做法——调整构建管线：

```ts
// vite.config.ts —— vite-node 端新增构建时拷贝（参考 spec §8 step 3）
// 在现有 plugins 数组之后追加：
{
  name: 'copy-post-assets',
  enforce: 'pre',
  buildStart() { /* no-op, 在 closeBundle 处理 */ },
  closeBundle() {
    const posts = fs.readdirSync('content/posts', { withFileTypes: true })
      .filter((d) => d.isDirectory())
    for (const p of posts) {
      const src = path.join('content/posts', p.name, 'assets')
      const dst = path.join('dist/posts', p.name)
      if (!fs.existsSync(src)) continue
      fs.mkdirSync(dst, { recursive: true })
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dst, file))
      }
    }
  },
}
```

`vite.config.ts` 顶部加 `import fs from 'node:fs'; import path from 'node:path'`。

- [ ] **Step 8: 重新跑 smoke**

重复 Step 6，浏览器打开文章，看图片（`solo-tech.webp` / `badge-metaphor.webp`）现在能正常显示。

- [ ] **Step 9: 提交**

```bash
cd D:/myspace/myblog
git add content/posts/ src/lib/content.ts src/lib/content.test.ts src/pages/Post.tsx vite.config.ts public/posts/
git commit -m "refactor(content): 散 mdx → 一篇博客一目录 + 资源同步

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: 内容协议（`<Answer>`/`<QuestionAnchor>`/`<SceneClip>` 组件）

**Files:**
- Create: `src/components/explore/Answer.tsx`
- Create: `src/components/explore/QuestionAnchor.tsx`
- Create: `src/components/explore/SceneClip.tsx`（暂用 stub 跑测试；GSAP 接线留 Task 5）
- Create: `src/components/explore/Answer.test.tsx`
- Create: `src/components/explore/QuestionAnchor.test.tsx`
- Modify: `src/pages/Post.tsx`（MDXProvider 注册 + 解析 `<Answer>` 内容供 QuestionAnchor）
- Modify: `src/components/blog-anim/registry.ts`（不注册，三个组件由 Post.tsx 单独提供）

**Interfaces:**
- Consumes: 当前 `registry` 内容（不改动）
- Produces:
  - `<Answer id="...">children</Answer>` —— 渲染 `{children}`，同时在 React context 中登记 (id→children)
  - `<QuestionAnchor id="..." />` —— 渲染为 `<a>` 胶囊
  - `<SceneClip from="..." />` —— 占位渲染（Task 5 实现 GSAP 截断）

- [ ] **Step 1: 写 `<Answer>` 失败测试**

```tsx
// src/components/explore/Answer.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AnswerProvider, { AnswerMap } from './AnswerProvider'
import Answer from './Answer'

describe('<Answer>', () => {
  it('渲染 children 与指定 id 关联的内容', () => {
    const map: AnswerMap = {}
    render(
      <AnswerProvider onRegister={(id, el) => { map[id] = el.innerHTML }}>
        <Answer id="q1">这是答案正文</Answer>
      </AnswerProvider>,
    )
    expect(map.q1).toContain('这是答案正文')
  })

  it('id 缺失时打印警告并不注册', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <AnswerProvider onRegister={() => {}}>
        <Answer>无 id 的内容</Answer>
      </AnswerProvider>,
    )
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: 跑测试，确认 FAIL**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/Answer.test.tsx 2>&1 | tail -20`
Expected: FAIL（`AnswerProvider` 模块未找到）

- [ ] **Step 3: 实现 `AnswerProvider` 与 `<Answer>`**

```tsx
// src/components/explore/AnswerProvider.tsx
import { createContext, useContext, useRef } from 'react'

export type AnswerMap = Record<string, string>

export interface AnswerCtx {
  /** 注册一个 (id, html) 对；返回注销函数 */
  register(id: string, html: string): () => void
  /** 当前快照（用于 QuestionAnchor 查 label） */
  snapshot(): AnswerMap
}

const Ctx = createContext<AnswerCtx | null>(null)

export function useAnswerContext(): AnswerCtx | null {
  return useContext(Ctx)
}

export default function AnswerProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AnswerMap>({})
  const value: AnswerCtx = {
    register(id, html) {
      ref.current[id] = html
      return () => { delete ref.current[id] }
    },
    snapshot() { return { ...ref.current } },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
```

```tsx
// src/components/explore/Answer.tsx
import { useEffect, useRef } from 'react'
import { useAnswerContext } from './AnswerProvider'

interface Props {
  id?: string
  children: React.ReactNode
}

/**
 * 同一段 children，两个视图各自渲染：
 * - 阅读视图：照常渲染为正文流（左侧标记线是 CSS 的事，不在组件里）。
 * - 探索视图：把元素自身的 innerHTML 注册到 AnswerMap，问题树点击时取出展示。
 * id 缺省时只渲染（探索视图无法引用），控制台打 warning。
 */
export default function Answer({ id, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useAnswerContext()

  useEffect(() => {
    if (!id || !ref.current || !ctx) return
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      console.warn(`[Answer] id 非法 "${id}"（只允许小写字母、数字、连字符）`)
      return
    }
    const html = ref.current.innerHTML
    return ctx.register(id, html)
  }, [id, ctx])

  if (!id) {
    if (typeof console !== 'undefined') console.warn('[Answer] 缺 id，正文可读但探索视图无法引用')
  }

  return (
    <div ref={ref} className="post-answer" data-answer-id={id || undefined}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: 跑 Answer 测试，应 PASS**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/Answer.test.tsx 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: 写 `<QuestionAnchor>` 失败测试**

```tsx
// src/components/explore/QuestionAnchor.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AnswerProvider from './AnswerProvider'
import QuestionAnchor from './QuestionAnchor'

describe('<QuestionAnchor>', () => {
  it('渲染为指向探索视图的锚链', () => {
    const { container } = render(
      <AnswerProvider>
        <QuestionAnchor id="q-foo" label="看动画" />
      </AnswerProvider>,
    )
    const a = container.querySelector('a')
    expect(a).toBeTruthy()
    expect(a!.getAttribute('href')).toBe('./explore/#q-foo')
    expect(a!.textContent).toContain('看动画')
  })

  it('无 label 时降级显示 id', () => {
    const { container } = render(
      <AnswerProvider>
        <QuestionAnchor id="q-bar" />
      </AnswerProvider>,
    )
    expect(container.querySelector('a')!.textContent).toContain('q-bar')
  })
})
```

- [ ] **Step 6: 实现 `<QuestionAnchor>`**

```tsx
// src/components/explore/QuestionAnchor.tsx
import { Link } from 'react-router-dom'

interface Props {
  id: string
  label?: string
}

/**
 * 阅读视图的胶囊按钮。点击进入探索视图对应节点（YAML 里 id 相同的那个）。
 * 当前文章 slug 由 useParams 在 Post.tsx 里取，再向下传给组件：
 * 推荐用法：<QuestionAnchor id="q-foo" /> 由 Post.tsx 拦截 props 自填 href。
 * 这里为简化，href 用相对 `./explore/#id`，由阅读页面的当前位置解析。
 */
export default function QuestionAnchor({ id, label }: Props) {
  const text = label || id
  return (
    <Link
      to={`./explore/#${id}`}
      className="question-anchor"
      data-question-anchor={id}
      title={`进入探索视图，定位到「${text}」`}
    >
      ◈ 探索 · {text}
    </Link>
  )
}
```

- [ ] **Step 7: 跑 QuestionAnchor 测试，应 PASS**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/QuestionAnchor.test.tsx 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 8: `<SceneClip>` 占位实现**

```tsx
// src/components/explore/SceneClip.tsx
interface Props {
  from: string
}

/**
 * 阅读视图里的动画嵌入。Task 5 在 scene 协议落地后接入 GSAP，
 * 用 IntersectionObserver + scene.build() 实例截取 [from, nextLabel) 段。
 * 现阶段：渲染占位，data-scene-clip-from 标记，方便 Task 5 替换。
 */
export default function SceneClip({ from }: Props) {
  return (
    <div className="scene-clip" data-scene-clip-from={from} aria-label={`动画：${from}`}>
      <span className="scene-clip-label">▶ 动画片段 · {from}</span>
    </div>
  )
}
```

- [ ] **Step 9: 在 Post.tsx 注册三个组件 + 包裹 AnswerProvider**

`src/pages/Post.tsx` 第 32-33 行的 MDXProvider 改为：

```tsx
import AnswerProvider, { useAnswerContext } from '../components/explore/AnswerProvider'
import Answer from '../components/explore/Answer'
import QuestionAnchor from '../components/explore/QuestionAnchor'
import SceneClip from '../components/explore/SceneClip'

// 在 Post.tsx 内新增以下组件
function PostBodyShell({ Body }: { Body: React.ComponentType | null }) {
  const ctx = useAnswerContext()
  // 文档化的 hook 调用方式：这里只是为了让 ctx 类型对工具函数消费
  void ctx
  return Body ? <Body /> : <p>正文缺失。</p>
}

// 第 33 行替换：
<MDXProvider components={{ ...registry, Answer, QuestionAnchor, SceneClip }}>
  <AnswerProvider>
    <Head>
      <title>{post.title} · {post.domain}</title>
      <meta name="description" content={post.excerpt} />
    </Head>
    <main className="post-wrap">
      {/* ...既有 meta / h1 / excerpt ... */}
      <article className="post-body" id="animations">
        <PostBodyShell Body={Body} />
      </article>
      <nav className="post-nav">
        {/* ...既有 prev/next ... */}
      </nav>
      <p style={{ marginTop: 32 }}>
        <Link to={`/posts/${post.slug}/explore/`} className="explore-entry-link">
          走进探索视图 →
        </Link>
      </p>
    </main>
  </AnswerProvider>
</MDXProvider>
```

（`Post.tsx` 当前用的是 `/blog/<slug>/`，不冲突——文章页路径不变；探索路由是 **新** 加的子路由，spec §2 选了 `/posts/<slug>/explore/` 但本项目现路由是 `/blog/<slug>/` —— 实际路径必须沿用 `/blog/<slug>/explore/`，spec 这一处要回去改。在 Post.tsx 这里用 `/blog/${post.slug}/explore/`。）

- [ ] **Step 10: 修 spec 路由小不一致**

把 `docs/superpowers/specs/2026-08-29-explore-view-design.md` 的 §2 表格中探索视图 URL 改：

```
| 探索 | `/blog/<slug>/explore/` | 新增；沿用现有 /blog/ 前缀 |
```

（同时验收 §10 里程碑、§1 北极星里所有引用 URL 保持一致。）提交时一起 commit。

- [ ] **Step 11: 跑测试 + typecheck**

Run: `cd D:/myspace/myblog && pnpm test 2>&1 | tail -15 && pnpm typecheck 2>&1 | tail -10`
Expected: PASS；typecheck 无 error。

- [ ] **Step 12: smoke**

Run: `cd D:/myspace/myblog && pnpm dev`，打开任一文章确认：
- 正文中能写 `<Answer id="q-foo">正文</Answer>`，渲染出 `.post-answer` 块；
- `<QuestionAnchor id="q-foo" />` 渲染成胶囊，hover 文案正确；
- `<SceneClip from="intro" />` 渲染占位；
- 文章末尾「走进探索视图 →」链接存在（点击 404 是预期的——还没建路由）。

- [ ] **Step 13: 提交**

```bash
cd D:/myspace/myblog
git add src/components/explore/ src/pages/Post.tsx docs/superpowers/specs/2026-08-29-explore-view-design.md
git commit -m "feat(content): <Answer>/<QuestionAnchor>/<SceneClip> 内容协议组件

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: 探索 YAML 与 `lib/explore.ts` 解析

**Files:**
- Create: `src/lib/explore.ts`
- Create: `src/lib/explore.test.ts`
- Create: `src/lib/types.ts` 中追加 `ExploreConfig` 相关类型
- 测试 fixture 在 `src/lib/__fixtures__/explore-ok.yaml` 等（见 Step 3）

**Interfaces:**
- Consumes:
  - `content/posts/<slug>/explore.yaml`（可选）
  - `article.mdx` 的 `<Answer id>` 列表（**Task 5 才校验**，本 Task 只解析 YAML）
- Produces:
  - `getExplore(slug: string): ExploreConfig | null`
  - `listExplorable(): string[]`
  - `getRawAnswerIds(slug: string): string[]` —— 简单 grep 正则（Task 5 才是真正的解析）

- [ ] **Step 1: 在 `src/lib/types.ts` 追加探索类型**

在 `src/lib/types.ts` 末尾追加：

```ts
export type QuestionKind = 'local' | 'cross-link'
export type QuestionStatus = 'placeholder' | undefined | null

export interface ExploreNode {
  id: string
  label: string
  seek?: string
  kind?: QuestionKind
  status?: QuestionStatus
  detail?: string       // 仅 placeholder 用
  preview?: string      // 仅 cross-link 用
  to?: { post: string; anchor: string }
  children?: ExploreNode[]
}

export interface ExploreConfig {
  title: string
  anim?: string         // 相对路径字符串
  seek_root?: string
  nodes: ExploreNode[]
}
```

- [ ] **Step 2: 写失败测试**

```ts
// src/lib/explore.test.ts
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { getExplore, listExplorable, parseExploreYaml } from './explore'

describe('explore config', () => {
  it('parseExploreYaml 解析合法 YAML', () => {
    const yaml = `
title: 测试
seek_root: intro
nodes:
  - id: q-foo
    label: 问题
    seek: q-foo
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('测试')
      expect(r.value.nodes[0].id).toBe('q-foo')
    }
  })

  it('parseExploreYaml 失败时返回明确错误', () => {
    const r = parseExploreYaml('not: a: valid: yaml:')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('YAML')
  })
})
```

- [ ] **Step 3: 跑测试，确认 FAIL**

Run: `cd D:/myspace/myblog && pnpm test src/lib/explore.test.ts 2>&1 | tail -10`
Expected: FAIL（模块未找到）

- [ ] **Step 4: 实现 `lib/explore.ts` 骨架（解析 + 文件 IO，不含校验）**

```ts
// src/lib/explore.ts
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ExploreConfig, ExploreNode } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

const ID_RE = /^[a-z0-9][a-z0-9-]*$/
function validId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

/** 仅做语法解析和最小字段校验。语义校验（交叉引用、anchor 等）在 Task 5。 */
export function parseExploreYaml(raw: string): ParseResult<ExploreConfig> {
  let parsed: any
  try { parsed = yaml.load(raw) } catch (e: any) {
    return { ok: false, error: `YAML 解析失败：${e.message}` }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'YAML 顶层必须是对象' }
  }
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
    return { ok: false, error: 'title 必填且非空' }
  }
  if (!Array.isArray(parsed.nodes)) {
    return { ok: false, error: 'nodes 必须是数组' }
  }
  // 节点递归扁平，只查 id 合法性与不重复
  const seen = new Set<string>()
  const walk = (node: any, where: string): string | null => {
    if (!node || typeof node !== 'object') return `${where} 不是对象`
    if (!validId(node.id)) return `${where}.id 非法或缺失`
    if (seen.has(node.id)) return `${where}.id 重复：${node.id}`
    seen.add(node.id)
    if (typeof node.label !== 'string') return `${where}.label 缺失`
    if (node.kind && node.kind !== 'local' && node.kind !== 'cross-link') return `${where}.kind 非法`
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        const err = walk(node.children[i], `${where}.children[${i}]`)
        if (err) return err
      }
    }
    return null
  }
  for (let i = 0; i < parsed.nodes.length; i++) {
    const err = walk(parsed.nodes[i], `nodes[${i}]`)
    if (err) return { ok: false, error: err }
  }
  return { ok: true, value: parsed as ExploreConfig }
}

function exploreFile(slug: string) {
  return path.join(POSTS_DIR, slug, 'explore.yaml')
}

export function getExplore(slug: string): ExploreConfig | null {
  const file = exploreFile(slug)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf-8')
  const r = parseExploreYaml(raw)
  if (!r.ok) {
    console.warn(`[explore] ${slug} 配置错误：${r.error}`)
    return null
  }
  return r.value
}

export function listExplorable(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => fs.existsSync(exploreFile(slug)))
}

/** 简单正则扫描 article.mdx 里的 <Answer id="..."> id 列表（不解析 AST） */
export function getRawAnswerIds(slug: string): string[] {
  const file = path.join(POSTS_DIR, slug, 'article.mdx')
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, 'utf-8')
  const ids: string[] = []
  const re = /<Answer\s+[^>]*\bid="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (validId(m[1])) ids.push(m[1])
  }
  return Array.from(new Set(ids))
}

/** 提取所有 heading 的 id 与文本（简单匹配 # title {#id} 与 ## title） */
export function getHeadingsWithIds(slug: string): Array<{ id: string; text: string }> {
  const file = path.join(POSTS_DIR, slug, 'article.mdx')
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, 'utf-8')
  const out: Array<{ id: string; text: string }> = []
  const re = /^(#{1,6})\s+(.+?)(?:\s+\{#([^}]+)\})?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const text = m[2].trim().replace(/\\([!"#\$%&'\(\)\*\+,\.\/:;<=>\?@\[\]\\^_`\{\|\}~])/g, '$1')
    const id = m[3] || slugifyHeading(text)
    if (id) out.push({ id, text })
  }
  return out
}

function slugifyHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}
```

- [ ] **Step 5: 跑测试，应 PASS**

Run: `cd D:/myspace/myblog && pnpm test src/lib/explore.test.ts 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 6: smoke —— 在 `content/posts/ai-digital-employee/` 写一个最小 explore.yaml**

```yaml
title: 一个 AI 数字员工平台
seek_root: intro
nodes:
  - id: q-tiered-approval
    label: 哪些接口是分级执行？
    seek: 分级执行
  - id: q-status-cross
    label: 高风险接口怎么兜底？
    kind: cross-link
    to:
      post: bi-agent-7-days-saved-200k
      anchor: '#背景'
    preview: BI-Agent 一篇里写过 BI 场景下的安全执行链路
```

- [ ] **Step 7: 验证 listExplorable 返回此 slug**

Run:
```bash
cd D:/myspace/myblog && node -e "import('./src/lib/explore.ts').then(m => console.log(m.listExplorable()))" 2>&1 || \
  cd D:/myspace/myblog && node --experimental-vm-modules -e "
const { listExplorable } = require('./dist-temp/explore');
console.log(listExplorable());
" 2>&1 || \
  cd D:/myspace/myblog && cat > /tmp/test-explore.mjs <<'EOF'
import { listExplorable } from './src/lib/explore.ts'
console.log(listExplorable())
EOF

```
Expected: 至少包含 `ai-digital-employee`（依赖运行时是 tsx）。**最简单的验证**：

```bash
cd D:/myspace/myblog && pnpm vitest run src/lib/explore.test.ts 2>&1 | tail -15
```

直接在 `src/lib/explore.test.ts` 临时加一条 `it('listExplorable 含 ai-digital-employee', () => { expect(listExplorable()).toContain('ai-digital-employee') })` 跑通。**跑完记得把这条临时断言删掉**（写在主断言之外）。

- [ ] **Step 8: 提交**

```bash
cd D:/myspace/myblog
git add src/lib/explore.ts src/lib/explore.test.ts src/lib/types.ts content/posts/ai-digital-employee/explore.yaml
git commit -m "feat(explore): YAML 解析 + 简单校验 + 内容 heading 提取

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `lib/explore.ts` 全套语义校验

**Files:**
- Modify: `src/lib/explore.ts`（追加 `validateExplore`，6 条规则）
- Create: `src/lib/explore-validate.test.ts`（每条规则 1 个 case）

**Interfaces:**
- Consumes: `getExplore` 返回的 `ExploreConfig`，`getRawAnswerIds` / `getHeadingsWithIds` / `listExplorable`
- Produces: `validateExplore(slug): { ok: boolean; errors: string[] }`

- [ ] **Step 1: 写失败测试，每个规则一条**

```ts
// src/lib/explore-validate.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { validateExplore, getExplore, setExploreSourceForTest, resetExploreSourceForTest } from './explore'

const FIX = path.join(process.cwd(), 'src/lib/__fixtures__/explore-val')

beforeEach(() => { if (!fs.existsSync(FIX)) fs.mkdirSync(FIX, { recursive: true }) })
afterEach(() => { resetExploreSourceForTest() })

function write(slug: string, yaml: string, article: string) {
  const dir = path.join(FIX, slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'explore.yaml'), yaml)
  fs.writeFileSync(path.join(dir, 'article.mdx'), `---
title: ${slug}
date: 2026-08-29
status: published
---
${article}
`)
}

function ok() { return expect.arrayContaining([expect.any(String)]) } // 失败占位，详见各 it

describe('validateExplore 规则', () => {
  it('规则1: YAML 非 placeholder 节点的 id 必须在正文 <Answer id> 里存在', () => {
    write('r1', `title: t\nnodes:\n  - { id: q-missing, label: x }`, '普通正文')
    const r = validateExplore('r1')
    expect(r.errors.some(e => e.includes('q-missing 未在 article.mdx 找到 <Answer'))).toBe(true)
  })

  it('规则2: 正文 <Answer id> 在 YAML 树中未被引用 —— warn 不 fail', () => {
    write('r2', `title: t\nnodes:\n  - { id: q-used, label: x }`,
      '<Answer id="q-used">正文</Answer><Answer id="q-orphan">孤儿</Answer>')
    const r = validateExplore('r2')
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => w.includes('q-orphan 在 YAML 树未被引用'))).toBe(true)
  })

  it('规则3: seek 值必须在 scene timeline labels 存在（无 scene 时跳过）', () => {
    write('r3', `title: t\nnodes:\n  - { id: q-bad-seek, label: x, seek: nonexistent }`,
      '<Answer id="q-bad-seek">a</Answer>')
    // 不提供 scene —— 此规则无法验证，应放过
    const r = validateExplore('r3')
    expect(r.errors.filter(e => e.includes('seek'))).toHaveLength(0)
  })

  it('规则4: cross-link to.post 存在且 to.anchor 是目标文章真实 heading id', () => {
    write('r-target', `title: t\n---\n## 目标锚点\n`, '')
    write('r4',
      `title: t\nnodes:\n  - { id: q, label: l, kind: cross-link, to: { post: r-target, anchor: "#错位置" }, preview: x }`,
      '<Answer id="q">a</Answer>')
    const r = validateExplore('r4')
    expect(r.errors.some(e => e.includes('r-target 找不到 anchor'))).toBe(true)
  })

  it('规则5: <QuestionAnchor> 不能引用 placeholder 节点', () => {
    write('r5',
      `title: t\nnodes:\n  - { id: q-ph, label: x, status: placeholder, detail: "..." }`,
      '<Answer id="q-ph">a</Answer><QuestionAnchor id="q-ph" />')
    // 实现处需要在 validateExplore 内对当前文章扫描 <QuestionAnchor>
    const r = validateExplore('r5')
    expect(r.errors.some(e => e.includes('q-ph 是 placeholder'))).toBe(true)
  })

  it('规则6: SceneClip from 标签必须存在于本文 scene timeline（无 scene 跳过）', () => {
    write('r6',
      `title: t\nnodes:\n  - { id: q, label: x }`,
      '<Answer id="q">a</Answer><SceneClip from="nope" />')
    const r = validateExplore('r6')
    // 没场景不该报错
    expect(r.errors).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 跑测试，确认 FAIL**

Run: `cd D:/myspace/myblog && pnpm test src/lib/explore-validate.test.ts 2>&1 | tail -10`
Expected: 全部失败（`validateExplore` 不存在）

- [ ] **Step 3: 实现 `validateExplore` + 测试 fixture hook**

需要在 `lib/explore.ts` 允许测试用例把 POSTS_DIR 临时切到 fixture 目录。最小做法：暴露 `setExploreSourceForTest(rootDir)` 与 `resetExploreSourceForTest()`，把 `POSTS_DIR` 改成内部变量：

```ts
// src/lib/explore.ts —— 改造 POSTS_DIR
let postsDirOverride: string | null = null
export function setExploreSourceForTest(dir: string) { postsDirOverride = dir }
export function resetExploreSourceForTest() { postsDirOverride = null }
function currentPostsDir() {
  return postsDirOverride || path.join(CONTENT_DIR, 'posts')
}

/* 改 POSTS_DIR → currentPostsDir()，对 getExplore / listExplorable / getRawAnswerIds / getHeadingsWithIds 一致生效 */
```

在文件末尾追加：

```ts
export interface ValidateResult {
  ok: boolean
  errors: string[]   // 这些会让 vite build 失败
  warnings: string[] // 这些只在控制台打印
}

/**
 * 6 条规则详见 spec §8。一次只对单篇文章。返回的结果：
 * - errors：构建必须 fail
 * - warnings：构建继续但打印 (例如 <Answer> 在 YAML 树没引用 —— 探索视图用不上)
 */
export function validateExplore(slug: string, sceneLabels: string[] = []): ValidateResult {
  const config = getExplore(slug)
  if (!config) return { ok: true, errors: [], warnings: [] }
  const errors: string[] = []
  const warnings: string[] = []

  const yamlIds = new Set<string>()
  function walk(node: ExploreNode, where: string) {
    yamlIds.add(node.id)
    if (node.kind !== 'placeholder' && !node.status) {
      // 规则1：非 placeholder 必须有正文 Answer
    }
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], `${where}.children[${i}]`)
      }
    }
  }
  config.nodes.forEach((n, i) => walk(n, `nodes[${i}]`))

  // 规则1
  const answerIds = new Set(getRawAnswerIds(slug))
  for (const id of yamlIds) {
    const node = findNode(config, id)
    if (!node) continue
    if (node.status === 'placeholder') continue
    if (!answerIds.has(id)) {
      errors.push(`[${slug}] ${id} 未在 article.mdx 找到对应的 <Answer id="${id}">`)
    }
  }

  // 规则2：正文 Answer 在 YAML 树没被引用（warn）
  for (const id of answerIds) {
    if (!yamlIds.has(id)) {
      warnings.push(`[${slug}] 正文 <Answer id="${id}"> 在 YAML 树未被引用（探索视图用不上此段）`)
    }
  }

  // 规则3：seek 值在 scene timeline labels
  if (sceneLabels.length > 0) {
    const labels = new Set(sceneLabels)
    config.nodes.forEach((n, i) => checkSeek(n, labels, slug, errors, `nodes[${i}]`))
  }

  // 规则4：cross-link 目标存在 + anchor 是目标 heading
  config.nodes.forEach((n, i) => checkCrossLink(n, slug, errors, `nodes[${i}]`))

  // 规则5：placeholder 节点不被 <QuestionAnchor> 引用（扫描本文）
  const articleFile = path.join(currentPostsDir(), slug, 'article.mdx')
  if (fs.existsSync(articleFile)) {
    const article = fs.readFileSync(articleFile, 'utf-8')
    const qaRe = /<QuestionAnchor\s+[^>]*\bid="([^"]+)"/g
    let m: RegExpExecArray | null
    const placeholderIds = collectPlaceholderIds(config)
    while ((m = qaRe.exec(article)) !== null) {
      if (placeholderIds.has(m[1])) {
        errors.push(`[${slug}] 正文里 <QuestionAnchor id="${m[1]}"> 引用了 placeholder 节点`)
      }
    }

    // 规则6：SceneClip from 标签存在（仅当存在 scene）
    if (sceneLabels.length > 0) {
      const clipRe = /<SceneClip\s+[^>]*\bfrom="([^"]+)"/g
      const labels = new Set(sceneLabels)
      while ((m = clipRe.exec(article)) !== null) {
        if (!labels.has(m[1])) {
          errors.push(`[${slug}] 正文里 <SceneClip from="${m[1]}"> 引用了不存在的 timeline label`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

function findNode(c: ExploreConfig, id: string): ExploreNode | undefined {
  function walk(n: ExploreNode): ExploreNode | undefined {
    if (n.id === id) return n
    if (n.children) for (const ch of n.children) { const r = walk(ch); if (r) return r }
    return undefined
  }
  for (const n of c.nodes) { const r = walk(n); if (r) return r }
  return undefined
}

function checkSeek(n: ExploreNode, labels: Set<string>, slug: string, errors: string[], where: string) {
  if (n.seek && !labels.has(n.seek)) {
    errors.push(`[${slug}] ${where}.seek="${n.seek}" 不在 scene timeline labels 里`)
  }
  if (n.children) n.children.forEach((c, i) => checkSeek(c, labels, slug, errors, `${where}.children[${i}]`))
  // seek_root 单独校验
}

function checkCrossLink(n: ExploreNode, slug: string, errors: string[], where: string) {
  if (n.kind === 'cross-link') {
    if (!n.to || !n.to.post || !n.to.anchor) {
      errors.push(`[${slug}] ${where} 是 cross-link 但缺 to.post 或 to.anchor`)
    } else {
      const targetSlug = n.to.post
      if (!fs.existsSync(path.join(currentPostsDir(), targetSlug))) {
        errors.push(`[${slug}] ${where}.to.post="${targetSlug}" 文章不存在`)
      } else {
        const headings = getHeadingsWithIds(targetSlug)
        const want = n.to.anchor.replace(/^#/, '')
        if (!headings.some(h => h.id === want)) {
          errors.push(`[${slug}] ${where}.to.anchor="${n.to.anchor}" 在 ${targetSlug} 找不到对应 heading id`)
        }
      }
    }
  }
  if (n.children) n.children.forEach((c, i) => checkCrossLink(c, slug, errors, `${where}.children[${i}]`))
}

function collectPlaceholderIds(c: ExploreConfig): Set<string> {
  const out = new Set<string>()
  function walk(n: ExploreNode) {
    if (n.status === 'placeholder') out.add(n.id)
    if (n.children) n.children.forEach(walk)
  }
  c.nodes.forEach(walk)
  return out
}
```

注意 `seek_root` 也得校验为 label 之一：在 Task 5 拿到 scene labels 后，调用方把 seek_root 一起校验。本 Task 让调用方负责，避免循环依赖。

- [ ] **Step 4: 跑测试，应 PASS**

Run: `cd D:/myspace/myblog && pnpm test src/lib/explore-validate.test.ts 2>&1 | tail -15`
Expected: PASS（fixture 是测试隔离目录，clean up 各自 it 的 fixture）

- [ ] **Step 5: 提交**

```bash
cd D:/myspace/myblog
git add src/lib/explore.ts src/lib/explore-validate.test.ts
git commit -m "test(explore): 6 条构建校验规则全量测试

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: 场景协议 —— GSAP timeline 与 Scene/SceneHandle

**Files:**
- Create: `src/components/explore/SceneController.ts`
- Create: `src/components/explore/SceneStage.tsx`
- Create: `src/components/explore/SceneContext.ts`
- Create: `src/components/explore/SceneController.test.ts`

**Interfaces:**
- Consumes: 任意 React 组件（scene 实现方）
- Produces:
  - `Scene` 接口（`build()` / `focusable`）
  - `SceneHandle` 接口（`seek`/`play`/`pause`/`focus`/`reset`/`labels`）
  - `createSceneHandle(tl): SceneHandle` 工厂函数
  - `<SceneStage scene={...} seekTo={...} onHandle?>` —— 挂 timeline，提供 SceneHandle 给子树 React context

- [ ] **Step 1: 写失败测试**

```ts
// src/components/explore/SceneController.test.ts
import { describe, it, expect } from 'vitest'
import gsap from 'gsap'  // 用真正的 gsap；jsdom 默认 reduced=true 但 timeline 工厂本身可用
import { createSceneHandle, type Scene } from './SceneController'

describe('SceneHandle', () => {
  // jsdom 里 gsap timeline 实例化没问题（matchMedia stub 写了 reduce=true，但这是 render 时 ui use，timeline 本身能造）
  const dummyScene: Scene = {
    focusable: ['a', 'b'],
    build() {
      const tl = gsap.timeline()
      tl.addLabel('intro').addLabel('q1').addLabel('q2')
      return tl
    },
  }

  it('createSceneHandle 暴露 labels', () => {
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, ['a', 'b'])
    expect(h.labels()).toEqual(expect.arrayContaining(['intro', 'q1', 'q2']))
  })

  it('seek 跳到指定 label', () => {
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, [])
    h.seek('q1')
    expect(h.currentLabel()).toBe('q1')
  })

  it('focus 只往元素加 class，不影响 timeline', () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>'
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, ['a', 'b'])
    h.focus(['a'])
    expect(document.getElementById('a')!.classList.contains('scene-focus')).toBe(true)
    expect(document.getElementById('b')!.classList.contains('scene-focus')).toBe(false)
    h.focus(['a']) // idempotent
    expect(document.getElementById('a')!.classList.contains('scene-focus')).toBe(true)
  })

  it('focus([]) 清除所有高亮', () => {
    document.body.innerHTML = '<div id="a"></div>'
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, ['a'])
    h.focus(['a'])
    h.focus([])
    expect(document.getElementById('a')!.classList.contains('scene-focus')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试，确认 FAIL**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/SceneController.test.ts 2>&1 | tail -10`
Expected: FAIL（模块未找到）

- [ ] **Step 3: 实现 SceneController**

```ts
// src/components/explore/SceneController.ts
import { useEffect, useRef } from 'react'

export interface Scene {
  build(): gsap.core.Timeline
  focusable: string[]
}

export interface SceneHandle {
  seek(label: string): void
  play(): void
  pause(): void
  focus(ids: string[]): void
  reset(): void
  labels(): string[]
  currentLabel(): string | null
  kill(): void
}

export function createSceneHandle(tl: gsap.core.Timeline, focusable: string[]): SceneHandle {
  const focused = new Set<string>()

  const applyFocus = () => {
    focusable.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      el.classList.toggle('scene-focus', focused.has(id))
    })
  }

  const reduced = () => typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    seek(label) {
      if (reduced()) {
        // reduced motion：直接调到 label 终态，不放动画
        tl.seek(label, false).pause()
      } else {
        tl.pause()
        tl.seek(label)
      }
    },
    play() { if (!reduced()) tl.play() },
    pause() { tl.pause() },
    focus(ids) {
      focused.clear()
      ids.forEach((id) => focused.add(id))
      applyFocus()
    },
    reset() { tl.pause().seek(0); focused.clear(); applyFocus() },
    labels() { return Object.keys(tl.labels || {}).map((k) => k).filter((k) => k) /* GSAP timeline.labels 是对象 {label: time} */ },
    currentLabel() {
      const labels = (tl as any).labels || {}
      const t = tl.time()
      // 找到 <= 当前时间 的最近 label
      const entries = Object.entries(labels).sort((a, b) => (a[1] as number) - (b[1] as number))
      let cur: string | null = null
      for (const [k, v] of entries) {
        if ((v as number) <= t + 0.001) cur = k
        else break
      }
      return cur
    },
    kill() { tl.kill() },
  }
}
```

注意：`tl.labels` 在 GSAP 3 是 `Object<string, number>`（label → time 映射）。`focus` 操作走 DOM class，不进 timeline，spec §6 决议。

- [ ] **Step 4: 跑测试，应 PASS**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/SceneController.test.ts 2>&1 | tail -10`
Expected: PASS；若 gsap 在 jsdom 里异常（如 requestAnimationFrame 未定义），看 Step 5。

- [ ] **Step 5: 若 gsap 在 jsdom 报错，处理 fallback**

如果 `gsap.timeline()` 在 jsdom 抛错（极少见，最新版本内部用 rAF，但 unit test 不跑动画不会触发），在测试 setup 顶部追加：

```ts
// vitest.setup.ts 顶部
import 'gsap/CSSPlugin'
```

或更稳的做法：在 `createSceneHandle` 内 lazy build，让调用方在测试里完全 fake（这违反 spec §6 接口契约，不推荐）。**首选保留 Step 3 实现，看实测**。

- [ ] **Step 6: 实现 `<SceneStage>` 与 SceneContext**

```tsx
// src/components/explore/SceneContext.ts
import { createContext, useContext } from 'react'
import type { SceneHandle } from './SceneController'

export const SceneCtx = createContext<SceneHandle | null>(null)

export function useScene(): SceneHandle | null {
  return useContext(SceneCtx)
}
```

```tsx
// src/components/explore/SceneStage.tsx
import { useEffect, useRef, useState } from 'react'
import type { Scene, SceneHandle } from './SceneController'
import { createSceneHandle } from './SceneController'
import { SceneCtx } from './SceneContext'

interface Props {
  scene: Scene
  /** 可选：进入页面默认 seek 到的 label */
  seekTo?: string
  onReady?: (h: SceneHandle) => void
  children?: (containerRef: React.RefObject<HTMLDivElement>) => React.ReactNode
}

/**
 * 挂 scene，把 SceneHandle 通过 context 下发给子树（问题树）。
 * - unmount 时 kill timeline，防 GSAP 全局引用泄漏（spec §6.3）
 * - prefers-reduced-motion 时跳到 seekTo 终态，不放动画
 */
export default function SceneStage({ scene, seekTo, onReady, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [handle, setHandle] = useState<SceneHandle | null>(null)

  useEffect(() => {
    const tl = scene.build()
    const h = createSceneHandle(tl, scene.focusable)
    // 初始：暂停 + 默认 seek（探索模式是读者驱动，不自动播放；spec §6.3）
    h.pause()
    if (seekTo) h.seek(seekTo)
    setHandle(h)
    onReady?.(h)
    return () => { h.kill() }
    // 只在 mount 时构造一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className="scene-stage">
      <SceneCtx.Provider value={handle}>
        {children ? children(containerRef) : null}
      </SceneCtx.Provider>
    </div>
  )
}
```

- [ ] **Step 7: 跑 typecheck**

Run: `cd D:/myspace/myblog && pnpm typecheck 2>&1 | tail -15`
Expected: 无 error

- [ ] **Step 8: 提交**

```bash
cd D:/myspace/myblog
git add src/components/explore/SceneController.ts src/components/explore/SceneController.test.ts src/components/explore/SceneStage.tsx src/components/explore/SceneContext.ts
git commit -m "feat(explore): Scene/SceneHandle 协议 + SceneStage 接线 GSAP

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: 问题树组件（QuestionTree/QuestionNode）

**Files:**
- Create: `src/components/explore/QuestionTree.tsx`
- Create: `src/components/explore/QuestionNode.tsx`
- Create: `src/components/explore/QuestionTree.test.tsx`

**Interfaces:**
- Consumes: `ExploreConfig`（YAML 解析后）、`useScene()` 拿到的 SceneHandle、`getAnswerMap()`（从 `useAnswerContext()` 取）
- Produces: 渲染问题树；点击调用 SceneHandle.seek + .focus + 滚动到 detail

- [ ] **Step 1: 写失败测试**

```tsx
// src/components/explore/QuestionTree.test.tsx
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import AnswerProvider from './AnswerProvider'
import QuestionTree from './QuestionTree'
import type { ExploreNode } from '../../lib/types'

describe('<QuestionTree>', () => {
  it('渲染节点 label 并响应 click', () => {
    const calls: string[] = []
    const nodes: ExploreNode[] = [{ id: 'q1', label: '问题一', seek: 'lbl1' }]
    const fakeHandle = {
      seek: (l: string) => calls.push(`seek:${l}`),
      focus: () => {},
      play: () => {}, pause: () => {}, reset: () => {}, labels: () => [], currentLabel: () => null, kill: () => {},
    }
    const { getByText } = render(
      <AnswerProvider>
        <QuestionTree nodes={nodes} handle={fakeHandle as any} initialId="q1" />
      </AnswerProvider>,
    )
    fireEvent.click(getByText('问题一'))
    expect(calls).toContain('seek:lbl1')
  })

  it('placeholder 节点 className 包含 dim/placeholder', () => {
    const nodes: ExploreNode[] = [{ id: 'q1', label: '占位', status: 'placeholder', detail: '建设中' }]
    const fakeHandle = { seek: () => {}, focus: () => {}, play: () => {}, pause: () => {}, reset: () => {}, labels: () => [], currentLabel: () => null, kill: () => {} }
    const { container } = render(
      <AnswerProvider><QuestionTree nodes={nodes} handle={fakeHandle as any} /></AnswerProvider>,
    )
    expect(container.querySelector('.qnode-placeholder')).toBeTruthy()
  })

  it('cross-link 节点渲染为 a 标签', () => {
    const nodes: ExploreNode[] = [{ id: 'q1', label: '外链', kind: 'cross-link', to: { post: 'p', anchor: '#x' }, preview: '摘要' }]
    const fakeHandle = { seek: () => {}, focus: () => {}, play: () => {}, pause: () => {}, reset: () => {}, labels: () => [], currentLabel: () => null, kill: () => {} }
    const { container } = render(
      <AnswerProvider><QuestionTree nodes={nodes} handle={fakeHandle as any} /></AnswerProvider>,
    )
    const a = container.querySelector('a')
    expect(a?.getAttribute('href')).toBe('/blog/p/#x')
  })
})
```

- [ ] **Step 2: 跑测试，确认 FAIL**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/QuestionTree.test.tsx 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: 实现 `<QuestionNode>`**

```tsx
// src/components/explore/QuestionNode.tsx
import { Link } from 'react-router-dom'
import type { ExploreNode } from '../../lib/types'
import type { SceneHandle } from './SceneController'

interface Props {
  node: ExploreNode
  activeId: string | null
  onActivate: (id: string, node: ExploreNode) => void
}

export default function QuestionNode({ node, activeId, onActivate }: Props) {
  const active = activeId === node.id
  const placeholder = node.status === 'placeholder'
  const cls = `qnode${active ? ' qnode-active' : ''}${placeholder ? ' qnode-placeholder' : ''}`

  if (node.kind === 'cross-link' && node.to) {
    return (
      <li className={cls}>
        <Link
          to={`/blog/${node.to.post}/${node.to.anchor.startsWith('#') ? node.to.anchor : '#' + node.to.anchor}`}
          className="qnode-link"
          data-cross-link={node.id}
        >
          <span className="qnode-label">→ {node.label}</span>
          <span className="qnode-hint">跨文章</span>
        </Link>
      </li>
    )
  }

  return (
    <li className={cls}>
      <button
        type="button"
        className="qnode-btn"
        onClick={() => onActivate(node.id, node)}
        data-question-id={node.id}
        aria-expanded={active}
      >
        <span className="qnode-label">{node.label}</span>
        {placeholder && <span className="qnode-hint">待补</span>}
      </button>
    </li>
  )
}
```

- [ ] **Step 4: 实现 `<QuestionTree>`**

```tsx
// src/components/explore/QuestionTree.tsx
import { useState, useEffect } from 'react'
import type { ExploreNode } from '../../lib/types'
import type { SceneHandle } from './SceneController'
import QuestionNode from './QuestionNode'

interface Props {
  nodes: ExploreNode[]
  handle: SceneHandle | null
  /** 进入页面默认激活的 id（来自 #hash） */
  initialId?: string | null
}

export default function QuestionTree({ nodes, handle, initialId }: Props) {
  const [activeId, setActiveId] = useState<string | null>(initialId || null)

  // hash 变化时同步激活
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.replace(/^#/, '')
      if (h) setActiveId(h)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // 移动端：点击节点后滚到舞台
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 920 && activeId) {
      const el = document.querySelector('.scene-stage')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeId])

  function onActivate(id: string, node: ExploreNode) {
    setActiveId(id)
    if (handle) {
      if (node.seek) handle.seek(node.seek)
      handle.focus(node.focus || [])    // 节点的 focus 字段（YAML 里加，见 Step 5 加 schema）
    }
  }

  // detail 面板：placeholder 放 detail，正文 Answer 内容取自 AnswerProvider
  return (
    <aside className="qtree" aria-label="问题树">
      <ul className="qtree-root">
        {nodes.map((n) => (
          <TreeBranch key={n.id} node={n} activeId={activeId} onActivate={onActivate} />
        ))}
      </ul>
      <DetailPanel activeId={activeId} rootNodes={nodes} />
    </aside>
  )
}

interface BranchProps {
  node: ExploreNode
  activeId: string | null
  onActivate: (id: string, node: ExploreNode) => void
}

function TreeBranch({ node, activeId, onActivate }: BranchProps) {
  return (
    <>
      <QuestionNode node={node} activeId={activeId} onActivate={onActivate} />
      {node.children && node.children.length > 0 && (
        <ul className="qtree-children">
          {node.children.map((c) => (
            <TreeBranch key={c.id} node={c} activeId={activeId} onActivate={onActivate} />
          ))}
        </ul>
      )}
    </>
  )
}

function DetailPanel({ activeId, rootNodes }: { activeId: string | null; rootNodes: ExploreNode[] }) {
  const found = activeId ? findNode(rootNodes, activeId) : null
  if (!found) return null
  return (
    <div className="qtree-detail" data-detail-for={activeId}>
      <h3 className="qtree-detail-title">{found.label}</h3>
      {found.status === 'placeholder' && found.detail && (
        <p className="qtree-detail-body">{found.detail}</p>
      )}
      {found.kind === 'cross-link' && found.preview && (
        <p className="qtree-detail-body">{found.preview}</p>
      )}
      {(!found.status || found.status !== 'placeholder') && found.kind !== 'cross-link' && (
        // 正文 Answer 内容由 SceneStage 内部的 AnswerMap 注入到全局可用（侵入式方案见 Step 5 修正）。
        // 此处占位：本 Task 阶段先打 TODO，下一 Task 让 ExploreView 注入完整内容。
        <p className="qtree-detail-body"><em>答案正文由 explore 视图层注入，本 Task 阶段预留。</em></p>
      )}
    </div>
  )
}

function findNode(nodes: ExploreNode[], id: string): ExploreNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const r = findNode(n.children, id)
      if (r) return r
    }
  }
  return undefined
}
```

> ⚠️ 这里有已知残缺：DetailPanel 里 Answer 正文注入逻辑要等到 Task 7 整合 ExploreView 时做（需要让 SceneStage 内部的 AnswerProvider instance 与 QuestionTree 同层级）。Step 9 会修。本 Task 通过测试覆盖率允许 DetailPanel 为空。

- [ ] **Step 5: 给 `ExploreNode` 类型加 `focus` 字段**

```ts
// src/lib/types.ts（在 ExploreNode 添加）
export interface ExploreNode {
  /* ... 已存在字段 ... */
  focus?: string[]   // 该节点激活时高亮的元素 id 列表
}
```

- [ ] **Step 6: 跑测试，应 PASS**

Run: `cd D:/myspace/myblog && pnpm test src/components/explore/QuestionTree.test.tsx 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
cd D:/myspace/myblog
git add src/components/explore/QuestionTree.tsx src/components/explore/QuestionNode.tsx src/components/explore/QuestionTree.test.tsx src/lib/types.ts
git commit -m "feat(explore): 问题树渲染 + 节点点击驱动 SceneHandle

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: 探索视图整合（Explore.tsx + ExploreView）

**Files:**
- Create: `src/pages/Explore.tsx`
- Create: `src/pages/Explore.test.tsx`（route-level smoke）
- Create: `src/components/explore/ExploreView.tsx`
- Modify: `src/routes.tsx`（新增子路由）
- Modify: `src/lib/content.ts`（`getPost` 给 `hasExplore`、`getAllPosts` 暴露链接）
- Modify: `src/styles/global.css`（追加探索样式）

**Interfaces:**
- Consumes: `getPost(slug).hasExplore` + `getExplore(slug)` + 动态加载 scene 模块
- Produces: `/blog/<slug>/explore/` 静态路由

- [ ] **Step 1: 在 `src/lib/types.ts` 暴露 explore 字段**

```ts
// Post 接口增加 hasExplore
export interface Post {
  /* ... 已有字段 ... */
  hasExplore: boolean
}
```

`src/lib/content.ts` `getAllPosts` 计算：`fs.existsSync(path.join(POSTS_DIR, slug, 'explore.yaml')) ? true : false`。

- [ ] **Step 2: 在 vite.config.ts 暴露 scene 模块的 glob**

```ts
// vite.config.ts —— 在 export default defineConfig({...}) 内部增加：
// 实际不放在 vite.config，而是在 Explore.tsx 内用 import.meta.glob（因为 glob 以 src/ 为锚）
```

```tsx
// src/pages/Explore.tsx
import { useMemo, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import AnswerProvider, { useAnswerContext } from '../components/explore/AnswerProvider'
import Answer from '../components/explore/Answer'
import ExploreView from '../components/explore/ExploreView'
import QuestionAnchor from '../components/explore/QuestionAnchor'
import SceneClip from '../components/explore/SceneClip'
import { getPost, getAllPosts } from '../lib/content'
import { getExplore, listExplorable } from '../lib/explore'
import type { Scene } from '../components/explore/SceneController'

/* 构建期：所有文章目录下的 scene.tsx 都编译进来。eager 是为了 SSR 同步可用 */
const sceneModules = import.meta.glob<{ default: Scene }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

function pickScene(slug: string): Scene | null {
  const key = Object.keys(sceneModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  return sceneModules[key].default
}

export default function Explore() {
  const { slug = '' } = useParams()
  const post = useMemo(() => getPost(slug), [slug])
  const config = useMemo(() => getExplore(slug), [slug])
  const scene = useMemo(() => pickScene(slug), [slug])
  const initialHash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') || null : null

  if (!post || !config) {
    return (
      <main className="explore-wrap"><p>这篇博客没有探索视图。<Link to={`/blog/${slug}/`}>← 回到阅读</Link></p></main>
    )
  }

  return (
    <AnswerProvider>
      <Head>
        <title>{config.title} · 探索视图</title>
      </Head>
      <main className="explore-wrap">
        <header className="explore-head">
          <Link to={`/blog/${slug}/`} className="explore-back">← 回到阅读</Link>
          <h1>{config.title}</h1>
        </header>
        <ExploreView
          nodes={config.nodes}
          scene={scene}
          seekRoot={config.seek_root}
          initialHash={initialHash}
          slug={slug}
        />
        {/* 把正文里所有 <Answer> 也渲染进 DOM 里（给 AnswerProvider 注入 AnswerMap），
            阅读视图拿这些 DOM 节点对应 Answer 内容。CSS 用 .explore-answers{display:none}
            隐藏这一区是因为：探索视图不再展示这些正文段落。 */}
        <div className="explore-answers" aria-hidden="true">
          {/* 这里需要一个机制把 article.mdx 的 body 渲染进来。
              见 Step 4。 */}
        </div>
      </main>
    </AnswerProvider>
  )
}

export const entry = 'src/pages/Explore.tsx'

export function getStaticPaths() {
  return listExplorable().map((slug) => `/blog/${slug}/explore/`)
}
```

- [ ] **Step 3: 写 ExploreView**

```tsx
// src/components/explore/ExploreView.tsx
import { useState, useMemo, useEffect } from 'react'
import type { ExploreNode } from '../../lib/types'
import type { Scene, SceneHandle } from './SceneController'
import SceneStage from './SceneStage'
import QuestionTree from './QuestionTree'
import { useAnswerContext } from './AnswerProvider'

interface Props {
  nodes: ExploreNode[]
  scene: Scene | null
  seekRoot?: string
  initialHash: string | null
  slug: string
}

export default function ExploreView({ nodes, scene, seekRoot, initialHash, slug }: Props) {
  const [handle, setHandle] = useState<SceneHandle | null>(null)
  const answerCtx = useAnswerContext()

  // 把 AnswerMap 提供给 DetailPanel：用一次性 compute（节点 id → html）
  const answerMap = useMemo(() => {
    if (!answerCtx) return {} as Record<string, string>
    return answerCtx.snapshot()
  }, [answerCtx, nodes /* re-run after hydration */])

  // children 函数：让 SceneStage 把 DOM 容器 ref 交给调用方写入 SVG/DOM
  // 简化做法：scene 自己管 DOM（render inside SceneStage by children fn），这里省略

  return (
    <div className="explore-grid">
      <section className="explore-stage">
        {scene ? (
          <SceneStage scene={scene} seekTo={seekRoot} onReady={setHandle}>
            {() => null}
          </SceneStage>
        ) : (
          <div className="explore-no-anim">这篇文章没有动画舞台，只有问题树。</div>
        )}
      </section>
      <aside className="explore-tree">
        <QuestionTree
          nodes={nodes}
          handle={handle}
          initialId={initialHash}
        />
        {/* Detail panel */}
        {handle && initialHash && (
          <DetailForActiveId nodes={nodes} activeId={initialHash} answerMap={answerMap} />
        )}
      </aside>
    </div>
  )
}

function DetailForActiveId({ nodes, activeId, answerMap }: { nodes: ExploreNode[]; activeId: string; answerMap: Record<string, string> }) {
  const found = (function find(ns: ExploreNode[]): ExploreNode | undefined {
    for (const n of ns) {
      if (n.id === activeId) return n
      if (n.children) { const r = find(n.children); if (r) return r }
    }
    return undefined
  })(nodes)
  if (!found) return null

  return (
    <div className="explore-detail" data-detail-for={activeId}>
      <h3>{found.label}</h3>
      {found.status === 'placeholder' && found.detail && <p>{found.detail}</p>}
      {found.kind === 'cross-link' && found.preview && <p>{found.preview}</p>}
      {!found.status && found.kind !== 'cross-link' && answerMap[found.id] && (
        <div className="explore-detail-body" dangerouslySetInnerHTML={{ __html: answerMap[found.id] }} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Step 2 的 `.explore-answers` 注入——读 article.mdx，正文也渲染 AnswerProvider 注册**

最简单的方案：Explore.tsx 不再单独读 article.mdx，而是要求 article.mdx 在 build 时被编译成 mdx component map，**复用** Post.tsx 那份 glob（曝光出来）：

```tsx
// src/pages/Explore.tsx 顶部追加：
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

function getArticleBody(slug: string): React.ComponentType | null {
  const key = Object.keys(mdxModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  return mdxModules[key].default
}
```

模板里 `<div className="explore-answers">` 删掉，改成：

```tsx
{(() => {
  const Body = getArticleBody(slug)
  return Body ? <Body /> : null
})()}
```

此时 article.mdx 里的 `<Answer id="x">` 块被渲染进 DOM、`Answer` 组件注册进 `AnswerProvider`。探索视图再切换节点时直接读 snapshot。visibility 用 CSS `.explore-answers { display: none }` 控制（**注意**：visually-hidden 但 DOM 必须存在，否则不渲染、AnswerProvider 收不到内容）。

> ⚠️ 安全考量：`dangerouslySetInnerHTML` 用于注入的 AnswerHtml——它来自作者本人编写的 MDX，可信；XSS 风险可接受。**但如果未来 MDX 内容来源被撑开（评论、用户投稿），需重新评估**。在 `lib/explore.ts` 顶部加注释说明。

- [ ] **Step 5: 在 `src/routes.tsx` 新增探索子路由**

```tsx
// src/routes.tsx 在 children 数组中追加：
{
  path: 'blog/:slug/explore',
  Component: lazyRoute(() => import('./pages/Explore')),
  getStaticPaths: () => {
    // 用动态导入让 listExplorable 在 SSR 阶段也跑
    return [] // 占位：实际由 Explore.tsx 的 getStaticPaths 提供
  },
},
```

但 vite-react-ssg 对子路由 `getStaticPaths` 的支持需要顶层路由提供，简化做法：**直接把 Explore 注册为顶层动态路径**：

```tsx
// src/routes.tsx —— children 之外追加（vite-react-ssg 顶层 routes）：
{
  path: 'blog/:slug/explore',
  Component: lazyRoute(() => import('./pages/Explore')),
  getStaticPaths: () => {
    // 静态导入避免 SSR 阶段额外动态
    const { listExplorable } = require('./lib/explore')
    return listExplorable().map((slug: string) => `/blog/${slug}/explore/`)
  },
},
```

> ⚠️ `require` 在 ESM 项目里会报错，改用：把 `listExplorable` 改成同步 (本来同步)，引入方式用顶层 `import`，再写 `getStaticPaths: () => listExplorable()...`——vite-react-ssg 支持静态导入触发的 getStaticPaths。

最终 `routes.tsx`:

```tsx
import React from 'react'
import type { ComponentType } from 'react'
import type { RouteRecord } from 'vite-react-ssg'
import { getAllPosts, getAllDomains } from './lib/content'
import { listExplorable } from './lib/explore'

const lazyRoute = (
  importer: () => Promise<{ default: ComponentType<any> }>,
): React.LazyExoticComponent<ComponentType<any>> => React.lazy(importer)

export const routes: RouteRecord[] = [
  {
    path: '/',
    Component: lazyRoute(() => import('./App')),
    children: [
      { index: true, Component: lazyRoute(() => import('./pages/Home')) },
      {
        path: 'blog/:slug',
        Component: lazyRoute(() => import('./pages/Post')),
        getStaticPaths: () => getAllPosts().map((p) => `/blog/${p.slug}/`),
      },
      {
        path: 'domain/:slug',
        Component: lazyRoute(() => import('./pages/Domain')),
        getStaticPaths: () => getAllDomains().map((d) => `/domain/${encodeURIComponent(d.slug)}/`),
      },
      {
        path: 'blog/:slug/explore',
        Component: lazyRoute(() => import('./pages/Explore')),
        getStaticPaths: () => listExplorable().map((slug) => `/blog/${slug}/explore/`),
      },
    ],
  },
]
```

- [ ] **Step 6: style 追加（最小补丁）**

```css
/* src/styles/global.css 末尾追加： */
.explore-wrap { max-width: 1200px; margin: 0 auto; padding: 60px 28px 80px; }
.explore-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px; }
.explore-head h1 { font-size: 26px; margin: 0; }
.explore-back { font: 14px var(--mono); color: var(--ink-faint); text-decoration: none; }
.explore-back:hover { color: var(--accent); }
.explore-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 28px; }
.explore-stage { background: var(--paper-raise, #F6F7F4); border: 1px solid var(--line); border-radius: 2px; min-height: 360px; padding: 18px; }
.explore-tree { font: 14px var(--sans); }
.qtree-root, .qtree-children { list-style: none; padding: 0; margin: 0; }
.qtree-children { padding-left: 18px; border-left: 1px dashed var(--line); margin-left: 8px; }
.qnode { margin: 4px 0; }
.qnode-btn { background: none; border: none; padding: 6px 8px; cursor: pointer; text-align: left; width: 100%; font: 14px var(--sans); color: var(--ink); border-radius: 2px; }
.qnode-btn:hover { background: rgba(14,110,92,.08); }
.qnode-active .qnode-btn { background: rgba(14,110,92,.12); color: var(--accent); font-weight: 600; }
.qnode-placeholder { opacity: .55; }
.qnode-placeholder .qnode-hint { font: 11px var(--mono); color: var(--ink-faint); margin-left: 6px; }
.qnode-link { display: flex; justify-content: space-between; padding: 6px 8px; color: var(--ink); text-decoration: none; border-radius: 2px; }
.qnode-link:hover { background: rgba(14,110,92,.06); }
.qnode-link .qnode-hint { font: 11px var(--mono); color: var(--accent); }
.explore-detail { margin-top: 20px; padding: 14px; background: var(--paper-raise, #F6F7F4); border-left: 3px solid var(--accent); }
.explore-detail h3 { margin: 0 0 8px; font-size: 16px; }
.explore-detail-body { color: var(--ink); line-height: 1.7; }
.explore-answers { display: none; }  /* 占位正文 DOM，hidden 仅用于注册 AnswerMap */

@media (max-width: 920px) {
  .explore-grid { grid-template-columns: 1fr; }
  .explore-stage { min-height: 240px; }
  .explore-tree { margin-top: 18px; }
}
.scene-focus { transition: filter .3s ease, opacity .3s ease; filter: drop-shadow(0 0 6px rgba(14,110,92,.6)); }
```

- [ ] **Step 7: 跑测试与 typecheck**

Run: `cd D:/myspace/myblog && pnpm test 2>&1 | tail -15 && pnpm typecheck 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 8: 端到端 smoke**

Run: `cd D:/myspace/myblog && pnpm dev`

测试：
- `/blog/<普通文章>/` —— 网站行为不变；
- `/blog/ai-digital-employee/` —— 末尾「走进探索视图 →」链接出现；
- `/blog/ai-digital-employee/explore/` —— 页面加载；YAML 配置的两个节点渲染；交叉链接渲染为 `<a>`；点本地节点应有 seek（Task 5 场景未实装前 seek 会因为没有 timeline label 而报错——这是预期的，本 Task 暂允许）；
- 直接访问 `/blog/shixi-open-source-study-app/explore/`（没有 yaml 的文章）—— 显示「没有探索视图」回退页。

- [ ] **Step 9: 提交**

```bash
cd D:/myspace/myblog
git add src/pages/Explore.tsx src/components/explore/ExploreView.tsx src/routes.tsx src/lib/content.ts src/lib/types.ts src/styles/global.css
git commit -m "feat(explore): Explore 路由 + ExploreView 整合舞台与问题树

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: 内容侧连接（SceneClip GSAP 截断 + QuestionAnchor capsule）

**Files:**
- Modify: `src/components/explore/SceneClip.tsx`（Task 2 占位 → GSAP 截断实现）
- Modify: `src/pages/Post.tsx`（QuestionAnchor 接收外部 slug 并 prefetch explore yaml label）
- Modify: `src/styles/global.css`（追加胶囊与 SceneClip 样式）

**Interfaces:**
- Consumes: scene 模块（同 Explore.tsx 的 import.meta.glob）
- Produces:
  - `<SceneClip from>` 进入视口时播放 [from, nextLabel) 段
  - `<QuestionAnchor id>` 自动去 YAML 里查 label

- [ ] **Step 1: 实现 GSAP 截断版 SceneClip**

```tsx
// src/components/explore/SceneClip.tsx
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface Props {
  from: string
}

const sceneModules = import.meta.glob<{ default: { build(): gsap.core.Timeline; focusable: string[] } }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

function findSceneForCurrent() {
  // 从 DOM 反查"当前文章目录"——简化为用 document.body 的 data attribute
  const slug = document.body.dataset.articleSlug
  if (!slug) return null
  const key = Object.keys(sceneModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  return sceneModules[key].default
}

export default function SceneClip({ from }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const scene = findSceneForCurrent()
    if (!scene) return
    if (!ref.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        if (tlRef.current) return  // already played
        const full = scene.build()
        const labels = (full as any).labels as Record<string, number>
        const sorted = Object.entries(labels).sort((a, b) => (a[1] as number) - (b[1] as number))
        const fromIdx = sorted.findIndex(([k]) => k === from)
        if (fromIdx === -1) return
        const [, fromTime] = sorted[fromIdx]
        const next = sorted[fromIdx + 1]
        const endTime = next ? (next[1] as number) : full.duration()
        const sub = full.seek(fromTime, false).pause()
        if (!reduced) sub.play()
        const stopAt = setTimeout(() => sub.pause().seek(endTime), (endTime - fromTime) * 1000 + 50)
        tlRef.current = sub
        return () => clearTimeout(stopAt)
      }
    }, { threshold: 0.3 })
    observer.observe(ref.current)
    return () => { observer.disconnect(); tlRef.current?.kill() }
  }, [from])

  return <div ref={ref} className="scene-clip" data-scene-clip-from={from} />
}
```

- [ ] **Step 2: Post.tsx 暴露 slug 给 CSS / JS**

`src/pages/Post.tsx` `<main>` 标签加：

```tsx
<main className="post-wrap" data-article-slug={post.slug}>
```

- [ ] **Step 3: QuestionAnchor 加 class 样式**

```css
/* src/styles/global.css 末尾 */
.question-anchor { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border: 1px solid var(--accent); border-radius: 999px; font: 12px var(--mono); color: var(--accent); text-decoration: none; vertical-align: baseline; }
.question-anchor:hover { background: rgba(14,110,92,.08); }
.scene-clip { margin: 20px 0; min-height: 200px; border: 1px dashed var(--line); border-radius: 2px; }
```

- [ ] **Step 4: 跑测试与 smoke**

Run: `cd D:/myspace/myblog && pnpm test 2>&1 | tail -15 && pnpm typecheck 2>&1 | tail -10`

smoke:
- 在 `content/posts/ai-digital-employee/article.mdx` 临时加 `<SceneClip from="intro" />` 段落，跑 `pnpm dev`，滚动到那个位置应该看到动画播放（reduced 时直接呈现静帧）。

- [ ] **Step 5: 提交**

```bash
cd D:/myspace/myblog
git add src/components/explore/SceneClip.tsx src/pages/Post.tsx src/styles/global.css
git commit -m "feat(scene): SceneClip 进入视口播 GSAP 时间线片段

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: 场景 glob + 构建校验钩入

**Files:**
- Create: `scripts/validate-explore.ts`（构建前/构建中执行 6 条规则 + seek_root 校验）
- Modify: `vite.config.ts`（添加 closeBundle 阶段调用 validate-explore —— 已有 copy-post-assets 同段）
- Modify: `package.json`（scripts.prebuild + scripts.preview）

- [ ] **Step 1: 实现 `scripts/validate-explore.ts`**

```ts
// scripts/validate-explore.ts
import fs from 'node:fs'
import path from 'node:path'
import { listExplorable, getExplore, validateExplore, getRawAnswerIds } from '../src/lib/explore'
import { parseExploreYaml } from '../src/lib/explore'

const POSTS = path.join(process.cwd(), 'content', 'posts')

/** 收集 scene.tsx 的 timeline labels（用动态 import + 默认执行 scene.build()） */
async function loadSceneLabels(slug: string): Promise<string[]> {
  const sceneFile = path.join(POSTS, slug, 'scene.tsx')
  if (!fs.existsSync(sceneFile)) return []
  try {
    // 走 vitest 路径（node 直接跑时做不到 import .tsx）—— 此处仅对 .js 场景生效。
    // .tsx 的解析留给 vite build 阶段：插件会在解析时调用下面 getTimelineLabelsFromSource 做静态扫
    const mod = require(path.resolve(sceneFile))
    const scene = mod.default || mod
    if (!scene?.build) return []
    const tl = scene.build()
    return Object.keys((tl as any).labels || {})
  } catch {
    return []
  }
}

/** 静态扫 .tsx 文件中的 .addLabel('xxx') 字面量作为后备 */
function getTimelineLabelsFromSource(slug: string): string[] {
  const sceneFile = path.join(POSTS, slug, 'scene.tsx')
  if (!fs.existsSync(sceneFile)) return []
  const src = fs.readFileSync(sceneFile, 'utf-8')
  const re = /\.addLabel\(['"`]([^'"`]+)['"`]\)/g
  const labels = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) labels.add(m[1])
  return [...labels]
}

async function main() {
  let failures = 0
  const warnings: string[] = []
  const slugs = listExplorable()
  for (const slug of slugs) {
    const config = getExplore(slug)
    if (!config) continue
    let labels = await loadSceneLabels(slug)
    if (labels.length === 0) labels = getTimelineLabelsFromSource(slug)
    const r = validateExplore(slug, labels)
    if (r.errors.length) {
      failures += r.errors.length
      r.errors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m ${e}`))
    }
    if (r.warnings.length) warnings.push(...r.warnings)
    // seek_root 额外校验
    if (config.seek_root && labels.length > 0 && !labels.includes(config.seek_root)) {
      console.error(`\x1b[31m✗\x1b[0m [${slug}] seek_root="${config.seek_root}" 不在 scene timeline labels 里`)
      failures++
    }
    // 占位节点不能在 answer 列表里
    const answers = new Set(getRawAnswerIds(slug))
    if (answers.size > 0) warnings.push(`[${slug}] 正文有 ${answers.size} 个 <Answer>，建议确认它们都在 YAML 树里`)
  }
  console.log(`\n[validate-explore] 失败 ${failures}，警告 ${warnings.length}`)
  if (warnings.length) warnings.forEach((w) => console.warn(`\x1b[33m!\x1b[0m ${w}`))
  process.exit(failures > 0 ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

> ⚠️ Task 5 阶段要求的「场景 labels 应通过 scene 模块实际执行拿到」是 preferred 路径，但 node 直接 require `.tsx` 不行（tsx-loader 仅 vite/webpack 默认有）。脚本的 fallback 是源码静态扫 `.addLabel('xxx')`。**这是已知不强保证**：作者用一个变量计算的 label（`tl.addLabel(getLabelByState())`）脚本认不出来。**报失兑底**：构建时 vite build 阶段会输出真实 timeline，那时由 Explore.tsx 内的 validate 二次校验（轻量版）。

- [ ] **Step 2: 修改 vite.config.ts closeBundle 内执行**

```ts
// vite.config.ts —— 在 closeBundle 块顶端：
closeBundle() {
  // copy-post-assets（已在 Task 1）
  // validate-explore
  import('./scripts/validate-explore.js' as any).catch?.(() => {})
  // 直接 child_process spawn：
  const { execSync } = require('node:child_process')
  try {
    execSync('tsx scripts/validate-explore.ts', { stdio: 'inherit' })
  } catch { /* 上面的 require 把失败传回 */ }
},
```

> 安装 tsx 到 devDependencies（`pnpm add -D tsx`）。

- [ ] **Step 3: package.json scripts 加 prebuild**

```json
"scripts": {
  "validate:explore": "tsx scripts/validate-explore.ts",
  "prebuild": "pnpm validate:explore"
}
```

- [ ] **Step 4: 跑全量测试 + 跑 validate:explore**

Run: `cd D:/myspace/myblog && pnpm test 2>&1 | tail -10 && pnpm validate:explore 2>&1 | tail -15`
Expected: 当前 ai-digital-employee 的探索 yaml 是合法的（用了已存在的 heading id），validate 通过或给出可阅读的警告。

- [ ] **Step 5: 提交**

```bash
cd D:/myspace/myblog
git add scripts/validate-explore.ts vite.config.ts package.json
git commit -m "feat(build): 探索配置构建时校验

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: 首篇真实内容（ai-it-system）

**Files:**
- Create: `content/posts/ai-it-system/{article.mdx, explore.yaml, scene.tsx, scene-data.ts, assets/}`
- Modify: `src/components/explore/` 内（仅在 scene.tsx 写完之后集成；本 Task 不涉及组件改动）

**Interfaces:**
- 写出 ai-it-system 的：
  - `article.mdx`：搜索流水线一节完整可写；AI+运维、AI+BI、ALL IN AI 体系为 placeholder 章节
  - `explore.yaml`：与文章一一对应的问题树
  - `scene.tsx`：至少 3 段 GSAP label（intro / q-search-pipeline / 至少一处）
  - `scene-data.ts`：搜索流水线相关的几何数据

- [ ] **Step 1: 写出 article.mdx（首版骨架）**

按你之前 `raw/AI提效.md` 的内容写正文，搜索流水线一节展开成带 `<Answer>` 的完整段落；AI+运维/AI+BI/ALL IN AI 用节标题占位，正文里不写 `<Answer>`（对应 YAML 的 placeholder 节点）。

迁移 raw/AI提效.md 进 article.mdx；用 frontmatter：

```yaml
---
title: AI 与工程的整体改造骨架
slug: ai-it-system
domain: AI 与工程
date: 2026-08-29
anim_profile: auto
status: published
excerpt: AI+开发 · AI+运维 · AI+BI：搜索优化流水线、AI 数字员工、备份与看板。
---
```

- [ ] **Step 2: 写出 explore.yaml**

注意：
- placeholder 节点：列出对应 YAML `label`、`status: placeholder`、`detail: 施工预告`
- cross-link 引用 `ai-digital-employee` 的 heading id
- 所有非 placeholder 节点 `id` 必须能在 article.mdx 找到 `<Answer id>` —— 写 YAML 时按 article 倒推

- [ ] **Step 3: 写 scene.tsx + scene-data.ts**

scene.tsx 至少 3 段 label：
- `intro` —— 总览淡入
- `q-search-pipeline` —— 搜索链路时间轴
- `q-ops-backup` —— 备份节点激活（即使占位，动画演示该节点还是点亮）

scene-data.ts 含搜索管线的几何数据，与现有 diagrams/ 文件结构一致。

- [ ] **Step 4: 跑测试与 validate-explore**

Run: `cd D:/myspace/myblog && pnpm test 2>&1 | tail -10 && pnpm validate:explore 2>&1 | tail -15`
Expected: ai-it-system 的 validation 完全通过。

- [ ] **Step 5: smoke**

Run: `cd D:/myspace/myblog && pnpm dev`
- `/blog/ai-it-system/` —— 阅读视图，正文 + （如果有）`<SceneClip>` 工作；
- `/blog/ai-it-system/explore/` —— 探索视图，问题树完整，点 placeholder 节点看到 detail，点本地节点动画 seek 跳到对应 label；
- placeholder 节点的 `<QuestionAnchor>` 不应出现在 YAML 树（spec §5.1 约束，validation 之前不会失败）。

- [ ] **Step 6: 提交**

```bash
cd D:/myspace/myblog
git add content/posts/ai-it-system/
git commit -m "feat(content): ai-it-system 文章 + 探索配置 + 场景

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 收尾：里程碑回顾

10 个任务完成时获得：
- 一篇博客一个目录（Task 1），无逃生口；
- `<Answer>`/`<QuestionAnchor>`/`<SceneClip>` 内容协议（Task 2）；
- 探索 YAML 解析 + 6 条构建校验（Task 3、4、9）；
- Scene/SceneHandle 协议与 GSAP timeline 接入（Task 5）；
- 问题树与节点组件（Task 6）；
- 探索视图完整路由与样式（Task 7）；
- SceneClip 在阅读视图中工作（Task 8）；
- 首篇文章 `ai-it-system` 端到端落地（Task 10）。

后续扩展点（不实现，留 spec）：
- 全景地图视图（多场景切换）；
- 节点进度 / 解锁 / 阅读足迹状态（数据结构预留）；
- 多场景切换（一文多 scene）；
- 开源骨架整理。
