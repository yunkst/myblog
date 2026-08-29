# 探索视图 v2 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 v1"双视图（阅读 + /explore/）"重构为 v2"单页面场景平铺"——全部场景按章节顺序竖排，`<SceneClip>` 滚入播放，右侧场景目录 + 每场景出口 chips 提供跳转探索，跨文章跳页落地锚点。

**Architecture:** 删除整个双视图层（Explore.tsx/ExploreView/QuestionTree/AnswerProvider 等），`explore.yaml` v2 schema（场景图：entry + scenes[] + features/questions 出口），scene.tsx 从单一 Scene 改为 `demos: Record<string, Scene>` 字典，lib/explore.ts 变纯函数（yaml 经 `?raw` glob 进 bundle，build 与浏览器同源），mock-ui 原子组件（ChatPane/Typewriter/MockButton/MockCursor）支撑体验型 demo。

**Tech Stack:** Vite 8 + React 19 + TypeScript + vite-react-ssg + MDX 3.1.1 + GSAP 3.15.0（core，无 club 插件）+ js-yaml 4 + vitest + pnpm

**Spec:** `docs/superpowers/specs/2026-08-29-explore-view-design-v2.md`（本计划从它论证；冲突时以 spec 为准）

## Global Constraints

- 包管理器 **pnpm**；测试 `pnpm test`（vitest run）、类型 `pnpm typecheck`（tsc --noEmit）必须绿才允许 commit。
- **不推送远端**；每个 Task 恰好一个 commit（fix 允许追加 commit）。
- **placeholder 废除**（spec §5.3）：yaml 场景缺 demo 或缺 `<Answer>` 即校验失败；"施工中"只出现在正文章节。
- **内容只写一遍**：解说文字只在 article.mdx 的 `<Answer id>` 里；yaml 不写叙述文案。
- demo 键书写契约（静态扫描用）：`export const demos` 的键必须写成行首缩进≥2 的 `name: {` 或 `'name': {` 形式。
- GSAP 只用 **core**：SVG `<text>` 文本变更必须用 `tl.call(() => el.textContent = ...)`，不能用 `tl.set(el, {text})`。
- 所有 demo 在 `prefers-reduced-motion: reduce` 下必须直接呈现终态静帧。
- 响应式断点 **920px**（沿用现有站点约定）；UI 文案全部中文。
- 保留字 `#entry`：跨文章 `to: { post, scene: 'entry' }` 的 href 为 `/blog/<post>/#entry`，Post 页 hydration 后把 `#entry` 解析滚动到 config.entry 场景。
- 旧类名清理：v1 的 `.explore-grid/.explore-tree/.qtree*/.scene-stage` 等死 CSS 在收尾任务删除。

---

### Task 1: lib 层 v2（types + explore.ts 纯函数化 + validator 重写 + 旧消费端清理）

**Files:**
- Modify: `src/lib/types.ts`
- Rewrite: `src/lib/explore.ts`（删除全部 node:fs；变成纯函数模块）
- Rewrite: `src/lib/explore.test.ts`
- Rewrite: `src/lib/explore-validate.test.ts`
- Delete: `src/lib/explore.client.ts`
- Delete: `src/lib/__fixtures__/explore-val/`（整个目录）
- Rewrite: `scripts/validate-explore.ts`
- Modify: `src/routes.tsx`（删除 explore 路由）
- Delete: `src/pages/Explore.tsx`、`src/pages/Explore.test.tsx`
- Delete: `content/posts/ai-digital-employee/explore.yaml`、`content/posts/ai-it-system/explore.yaml`（v1 格式，git 历史保留；Task 6/8 以 v2 重建）
- Modify: `vite.config.ts`（删除 `lib/explore` → `lib/explore.client` 的 alias 分支）

**Interfaces:**
- Produces: `types.ts` 新类型（下方 Step 1 原文）；`explore.ts` 导出 `parseExploreYaml(raw: string): ParseResult<ExploreConfig>`、`getRawAnswerIds(mdxRaw: string): string[]`、`getHeadingsWithIds(mdxRaw: string): Array<{id,text}>`、`slugifyHeading(text: string): string`、`validateExploreConfig(slug: string, config: ExploreConfig, ctx: ValidateCtx): { errors: string[]; warnings: string[] }`、`resolveExploreHref(to: ExploreTarget, config: ExploreConfig): string`、`scanDemoNames(sceneSource: string): string[]`
- Consumes: 无（本任务自洽）；`Post.hasExplore` 字段保留不动。

- [ ] **Step 1: 写失败测试（parse + validate + href + scanDemoNames）**

`src/lib/types.ts` 中删除 `QuestionKind/QuestionStatus/ExploreNode/ExploreConfig`，新增：

```ts
export type ExploreTarget = string | { post: string; scene: string }

export interface ExploreExit {
  text: string
  to: ExploreTarget
}

export interface ExploreScene {
  id: string
  label: string
  demo: string
  features?: ExploreExit[]
  questions?: ExploreExit[]
}

export interface ExploreConfig {
  title: string
  entry: string
  scenes: ExploreScene[]
}
```

`src/lib/explore.test.ts` 全文替换为（内联 yaml 字符串，不再用 fixture 目录）：

```ts
import { describe, it, expect } from 'vitest'
import { parseExploreYaml, resolveExploreHref, scanDemoNames } from './explore'

const good = `
title: 一个 AI 数字员工平台
entry: q-problem
scenes:
  - id: q-problem
    label: 公司的技术问题，都是谁在解决？
    demo: message-flood
    features:
      - { text: 看方案, to: q-badge-metaphor }
    questions:
      - { text: 去别的文章, to: { post: other-post, scene: entry } }
  - id: q-badge-metaphor
    label: 把工牌借给 AI
    demo: badge-metaphor
`

describe('parseExploreYaml v2', () => {
  it('合法配置解析成功', () => {
    const r = parseExploreYaml(good)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.entry).toBe('q-problem')
      expect(r.value.scenes).toHaveLength(2)
      expect(r.value.scenes[0].features?.[0].to).toBe('q-badge-metaphor')
    }
  })
  it('非对象顶层报错', () => {
    const r = parseExploreYaml('- a\n- b\n')
    expect(r.ok).toBe(false)
  })
  it('title 缺失报错', () => {
    const r = parseExploreYaml('entry: a\nscenes:\n  - { id: a, label: x, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('title')
  })
  it('entry 缺失报错', () => {
    const r = parseExploreYaml('title: t\nscenes:\n  - { id: a, label: x, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('entry')
  })
  it('scenes 空数组报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes: []\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('scenes')
  })
  it('scene.id 非法报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - { id: "A!", label: x, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('id')
  })
  it('scene.id 重复报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - { id: a, label: x, demo: d }\n  - { id: a, label: y, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('重复')
  })
  it('demo 缺失报错（placeholder 废除，spec §5.3）', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - { id: a, label: x }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('demo')
  })
  it('exit.to 非法形态报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - id: a\n    label: x\n    demo: d\n    features:\n      - { text: t, to: { post: p } }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('to')
  })
})

describe('resolveExploreHref', () => {
  const config = parseExploreYaml(good)
  it('本地目标 → #id', () => {
    expect(config.ok && resolveExploreHref('q-badge-metaphor', config.value)).toBe('#q-badge-metaphor')
  })
  it('跨文章 entry → /blog/<post>/#entry（保留字别名）', () => {
    expect(config.ok && resolveExploreHref({ post: 'other-post', scene: 'entry' }, config.value))
      .toBe('/blog/other-post/#entry')
  })
  it('跨文章具体场景 → /blog/<post>/#<scene-id>', () => {
    expect(config.ok && resolveExploreHref({ post: 'p2', scene: 'q-x' }, config.value))
      .toBe('/blog/p2/#q-x')
  })
})

describe('scanDemoNames（demo 键书写契约：缩进≥2 的 name: { 形式）', () => {
  it('扫出字面量键', () => {
    const src = `export const demos: Record<string, Scene> = {
  'message-flood': {
    name: 'message-flood',
    Stage: FloodStage,
    build() { return gsap.timeline() },
  },
  badge: { name: 'badge', Stage: B, build: () => gsap.timeline() },
}`
    expect(scanDemoNames(src).sort()).toEqual(['badge', 'message-flood'])
  })
  it('无 demos 导出返回空数组', () => {
    expect(scanDemoNames('export default {}')).toEqual([])
  })
})
```

`src/lib/explore-validate.test.ts` 全文替换为：

```ts
import { describe, it, expect } from 'vitest'
import { parseExploreYaml, validateExploreConfig, type ValidateCtx } from './explore'

function makeConfig(yaml: string) {
  const r = parseExploreYaml(yaml)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const baseYaml = `
title: t
entry: q-a
scenes:
  - id: q-a
    label: A
    demo: demo-a
    questions:
      - { text: 去那篇, to: { post: other, scene: entry } }
  - id: q-b
    label: B
    demo: demo-b
`

const baseCtx: ValidateCtx = {
  answerIds: ['q-a', 'q-b'],
  demoNames: ['demo-a', 'demo-b'],
  sceneFileExists: true,
  knownPosts: ['self', 'other'],
  scenesOfPost: (p) => (p === 'other' ? ['q-o1'] : null),
}

describe('validateExploreConfig v2', () => {
  it('合法配置零错误', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), baseCtx)
    expect(r.errors).toEqual([])
  })
  it('规则1 entry 不在 scenes 报错', () => {
    const c = makeConfig(baseYaml)
    const r = validateExploreConfig('self', c, { ...baseCtx, answerIds: ['q-a', 'q-b'] })
    c.entry = 'q-nope'
    const r2 = validateExploreConfig('self', c, baseCtx)
    expect(r2.errors.some((e) => e.includes('entry'))).toBe(true)
    void r
  })
  it('规则2 场景缺 Answer 报错', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, answerIds: ['q-a'] })
    expect(r.errors.some((e) => e.includes('q-b') && e.includes('Answer'))).toBe(true)
  })
  it('规则3 未被场景引用的 Answer 警告', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, answerIds: ['q-a', 'q-b', 'q-extra'] })
    expect(r.warnings.some((w) => w.includes('q-extra'))).toBe(true)
  })
  it('规则4 demo 不存在报错', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, demoNames: ['demo-a'] })
    expect(r.errors.some((e) => e.includes('demo-b'))).toBe(true)
  })
  it('规则4b scene.tsx 不存在报错（demo 必填的推论）', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, sceneFileExists: false })
    expect(r.errors.length).toBeGreaterThan(0)
  })
  it('规则5 本地 to 指向不存在场景报错', () => {
    const y = baseYaml.replace('to: q-b', 'to: q-nope').replace('- { text: 去那篇, to: { post: other, scene: entry } }', '')
    const r = validateExploreConfig('self', makeConfig(y), baseCtx)
    expect(r.errors.some((e) => e.includes('q-nope'))).toBe(true)
  })
  it('规则5b 跨文章 post 不存在报错', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, knownPosts: ['self'] })
    expect(r.errors.some((e) => e.includes('other'))).toBe(true)
  })
  it('规则5c 跨文章目标场景不存在报错', () => {
    const y = baseYaml.replace("scene: entry }", "scene: q-nope }")
    const r = validateExploreConfig('self', makeConfig(y), baseCtx)
    expect(r.errors.some((e) => e.includes('q-nope'))).toBe(true)
  })
  it('规则5d 跨文章 scene: entry 且目标无 yaml 报错', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, scenesOfPost: () => null })
    expect(r.errors.some((e) => e.includes('other'))).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/lib/explore.test.ts src/lib/explore-validate.test.ts`
Expected: FAIL（新导出不存在）

- [ ] **Step 3: 实现 explore.ts v2（纯函数，无 node:fs）**

```ts
// src/lib/explore.ts
//
// v2：纯函数模块。yaml/mdx/scene 源码由调用方读入（构建侧 scripts/validate-explore.ts
// 用 node:fs；浏览器侧 Post.tsx 用 import.meta.glob('?raw')）。build 与浏览器跑同一份代码，
// v1 的 explore.client.ts 双文件模式废除（spec §8.4）。
import yaml from 'js-yaml'
import type { ExploreConfig, ExploreTarget } from './types'

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

const ID_RE = /^[a-z0-9][a-z0-9-]*$/
function validId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

export function parseExploreYaml(raw: string): ParseResult<ExploreConfig> {
  let parsed: any
  try { parsed = yaml.load(raw) } catch (e: any) {
    return { ok: false, error: `YAML 解析失败：${e.message}` }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'YAML 顶层必须是对象' }
  }
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) return { ok: false, error: 'title 必填且非空' }
  if (!validId(parsed.entry)) return { ok: false, error: 'entry 必填且为合法 id（小写字母/数字/连字符）' }
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) return { ok: false, error: 'scenes 必须是非空数组' }
  const seen = new Set<string>()
  for (let i = 0; i < parsed.scenes.length; i++) {
    const s = parsed.scenes[i]
    const where = `scenes[${i}]`
    if (!s || typeof s !== 'object' || Array.isArray(s)) return { ok: false, error: `${where} 不是对象` }
    if (!validId(s.id)) return { ok: false, error: `${where}.id 非法或缺失` }
    if (seen.has(s.id)) return { ok: false, error: `${where}.id 重复：${s.id}` }
    seen.add(s.id)
    if (typeof s.label !== 'string' || !s.label.trim()) return { ok: false, error: `${where}.label 缺失` }
    if (typeof s.demo !== 'string' || !s.demo.trim()) {
      return { ok: false, error: `${where}.demo 必填——无 demo 的场景禁止存在（spec §5.3 placeholder 废除）` }
    }
    for (const key of ['features', 'questions'] as const) {
      const list = s[key]
      if (list === undefined) continue
      if (!Array.isArray(list)) return { ok: false, error: `${where}.${key} 必须是数组` }
      for (let j = 0; j < list.length; j++) {
        const e = list[j]
        if (!e || typeof e !== 'object' || typeof e.text !== 'string' || !e.text.trim()) {
          return { ok: false, error: `${where}.${key}[${j}].text 缺失` }
        }
        const to = e.to
        const okStr = validId(to)
        const okObj = !!to && typeof to === 'object' && !Array.isArray(to)
          && typeof to.post === 'string' && to.post.length > 0
          && typeof to.scene === 'string' && (to.scene === 'entry' || validId(to.scene))
        if (!okStr && !okObj) return { ok: false, error: `${where}.${key}[${j}].to 必须是场景 id 或 { post, scene }` }
      }
    }
  }
  return { ok: true, value: parsed as ExploreConfig }
}

export interface ValidateCtx {
  answerIds: string[]
  demoNames: string[]
  sceneFileExists: boolean
  knownPosts: string[]
  /** 返回目标文章的场景 id 全集；目标文章无 explore.yaml 时返回 null */
  scenesOfPost(post: string): string[] | null
}

export function validateExploreConfig(
  slug: string, config: ExploreConfig, ctx: ValidateCtx,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const ids = new Set(config.scenes.map((s) => s.id))

  // 规则1：entry 指向存在的场景
  if (!ids.has(config.entry)) errors.push(`[${slug}] entry="${config.entry}" 不在 scenes 里`)

  // 规则2：每个场景有 <Answer>
  for (const s of config.scenes) {
    if (!ctx.answerIds.includes(s.id)) {
      errors.push(`[${slug}] 场景 ${s.id} 未在 article.mdx 找到 <Answer id="${s.id}">`)
    }
  }

  // 规则3：未被场景引用的 Answer → 警告
  for (const a of ctx.answerIds) {
    if (!ids.has(a)) warnings.push(`[${slug}] ${a} 未被任何场景引用（场景目录/首页入口用不上）`)
  }

  // 规则4：demo 存在
  if (!ctx.sceneFileExists) {
    errors.push(`[${slug}] 声明了场景但 scene.tsx 不存在`)
  } else {
    const demos = new Set(ctx.demoNames)
    for (const s of config.scenes) {
      if (!demos.has(s.demo)) errors.push(`[${slug}] 场景 ${s.id} 的 demo="${s.demo}" 不在 scene.tsx 的 demos 导出里`)
    }
  }

  // 规则5：出口目标存在
  for (const s of config.scenes) {
    for (const key of ['features', 'questions'] as const) {
      const list = s[key] ?? []
      list.forEach((e, j) => {
        const where = `${s.id}.${key}[${j}]`
        if (typeof e.to === 'string') {
          if (!ids.has(e.to)) errors.push(`[${slug}] ${where}.to="${e.to}" 不在本文 scenes 里`)
        } else {
          const { post, scene } = e.to
          if (!ctx.knownPosts.includes(post)) {
            errors.push(`[${slug}] ${where}.to.post="${post}" 文章目录不存在`)
            return
          }
          const target = ctx.scenesOfPost(post)
          if (target === null) {
            errors.push(`[${slug}] ${where}.to.post="${post}" 没有 explore.yaml`)
            return
          }
          if (scene === 'entry') return // 保留字：目标 yaml 存在即合法
          if (!target.includes(scene)) errors.push(`[${slug}] ${where}.to 场景 "${scene}" 不在 ${post} 的 scenes 里`)
        }
      })
    }
  }

  return { errors, warnings }
}

/** 出口 → href。本地：#id；跨文章：/blog/<post>/#<scene|entry>（entry 为保留字别名） */
export function resolveExploreHref(to: ExploreTarget, config: ExploreConfig): string {
  if (typeof to === 'string') return `#${to}`
  const sceneId = to.scene === 'entry' ? 'entry' : to.scene
  return `/blog/${to.post}/#${sceneId}`
}

/** 静态扫描 scene.tsx 的 demos 键。书写契约：键在行首缩进≥2，形如 name: { 或 'name': {。 */
export function scanDemoNames(sceneSource: string): string[] {
  const names = new Set<string>()
  const re = /^\s{2,}'?([\w-]+)'?\s*:\s*\{\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(sceneSource)) !== null) {
    if (m[1] !== 'demos') names.add(m[1])
  }
  return [...names]
}

export function getRawAnswerIds(mdxRaw: string): string[] {
  const ids: string[] = []
  const re = /<Answer\s+[^>]*\bid="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(mdxRaw)) !== null) if (validId(m[1])) ids.push(m[1])
  return Array.from(new Set(ids))
}

export function slugifyHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

export function getHeadingsWithIds(mdxRaw: string): Array<{ id: string; text: string }> {
  const out: Array<{ id: string; text: string }> = []
  const re = /^(#{1,6})\s+(.+?)(?:\s+\{#([^}]+)\})?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(mdxRaw)) !== null) {
    const text = m[2].trim().replace(/\\([!"#\$%&'\(\)\*\+,\.\/:;<=>\?@\[\]\\^_`\{\|\}~])/g, '$1')
    const id = m[3] || slugifyHeading(text)
    if (id) out.push({ id, text })
  }
  return out
}
```

注意：v1 版文件顶部的 XSS 安全注释**保留**（Answer innerHTML 的信任模型说明仍然适用，v2 ExitChips/目录虽然不再注入 HTML，但 Answer.tsx 沿用）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test src/lib/`
Expected: PASS（content.test.ts / nav.test.ts 不受影响）

- [ ] **Step 5: 重写 scripts/validate-explore.ts（node:fs 读文件 + 纯函数校验）**

```ts
// scripts/validate-explore.ts（v2）
import fs from 'node:fs'
import path from 'node:path'
import {
  parseExploreYaml, validateExploreConfig, scanDemoNames, getRawAnswerIds,
} from '../src/lib/explore'
import type { ExploreConfig } from '../src/lib/types'

const POSTS = path.join(process.cwd(), 'content', 'posts')

function readIfExists(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null
}

function loadConfig(slug: string): ExploreConfig | null {
  const raw = readIfExists(path.join(POSTS, slug, 'explore.yaml'))
  if (raw === null) return null
  const r = parseExploreYaml(raw)
  if (!r.ok) {
    console.error(`\x1b[31m✗\x1b[0m [${slug}] ${r.error}`)
    process.exitCode = 1
    return null
  }
  return r.value
}

function knownPosts(): string[] {
  return fs.existsSync(POSTS)
    ? fs.readdirSync(POSTS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
}

function main() {
  let failures = 0
  const warnings: string[] = []
  const posts = knownPosts()

  for (const slug of posts) {
    const config = loadConfig(slug)
    if (!config) continue
    const article = readIfExists(path.join(POSTS, slug, 'article.mdx')) ?? ''
    const sceneSrc = readIfExists(path.join(POSTS, slug, 'scene.tsx'))
    const r = validateExploreConfig(slug, config, {
      answerIds: getRawAnswerIds(article),
      demoNames: sceneSrc ? scanDemoNames(sceneSrc) : [],
      sceneFileExists: sceneSrc !== null,
      knownPosts: posts,
      scenesOfPost: (p) => {
        const t = loadConfig(p)
        return t ? t.scenes.map((s) => s.id) : null
      },
    })
    failures += r.errors.length
    r.errors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m ${e}`))
    warnings.push(...r.warnings)
  }

  console.log(`\n[validate-explore] 失败 ${failures}，警告 ${warnings.length}`)
  warnings.forEach((w) => console.warn(`\x1b[33m!\x1b[0m ${w}`))
  if (failures > 0) process.exit(1)
}

main()
```

- [ ] **Step 6: 删除旧消费端 + v1 yaml + vite alias**

1. `git rm src/pages/Explore.tsx src/pages/Explore.test.tsx src/lib/explore.client.ts`
2. `git rm -r src/lib/__fixtures__`
3. `git rm content/posts/ai-digital-employee/explore.yaml content/posts/ai-it-system/explore.yaml`
4. `src/routes.tsx`：删除 `import { listExplorable } from './lib/explore'` 和整个 `{ path: 'blog/:slug/explore', ... }` 路由项。
5. `vite.config.ts`：删除 resolve.alias 中把 `lib/explore` 指到 `lib/explore.client` 的条件分支（保留其他 alias）。

- [ ] **Step 7: 全量验证**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore`
Expected: 全绿（此时 ai-digital-employee / ai-it-system 无 yaml → validator 跳过；Post.tsx 仍引用 v1 组件不受影响；Explore.tsx 已删而 routes 已摘除）

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(explore): lib 层 v2——纯函数 explore.ts + validator 重写 + 删除双视图路由与 v1 yaml"
```

---

### Task 2: 组件层清理——删除旧探索组件 + Answer 原位化 + Post.tsx 精简

**Files:**
- Delete: `src/components/explore/ExploreView.tsx`、`QuestionTree.tsx`、`QuestionTree.test.tsx`、`QuestionNode.tsx`、`QuestionAnchor.tsx`、`QuestionAnchor.test.tsx`、`AnswerProvider.tsx`、`SceneStage.tsx`、`SceneContext.ts`、`SceneController.test.ts`（v1 测试随接口一起在 Task 3 重写）
- Rewrite: `src/components/explore/Answer.tsx`
- Rewrite: `src/components/explore/Answer.test.tsx`
- Modify: `src/pages/Post.tsx`
- Modify: `src/pages/Post.test.tsx`（若它断言了 QuestionAnchor/AnswerProvider 相关 DOM）
- Modify: `src/styles/global.css`（删除 `.explore-grid/.explore-stage/.explore-tree/.explore-detail/.qtree*/.qnode*/.scene-focus/.explore-no-anim/.explore-back/.explore-head/.explore-wrap` 等死样式；`.explore-answers` 一并删除；保留 `.scene-svg` 系列——ai-it-system 仍用）

**Interfaces:**
- Consumes: Task 1 无直接依赖（组件层独立）；SceneController v1 / SceneClip v1 保持原样（Task 3 才动）。
- Produces: `Answer.tsx` 新接口 `export default function Answer({ id, children }: { id: string; children: ReactNode })`——渲染 `<div className="answer-block" id={id}>{children}</div>`，无 context 耦合。Post 页 `<main data-article-slug>` 属性保留（SceneClip 反查依赖）。

- [ ] **Step 1: 写失败测试**

`src/components/explore/Answer.test.tsx` 全文替换：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Answer from './Answer'

describe('Answer（v2 原位渲染）', () => {
  it('渲染为带 id 的 answer-block，子内容可见', () => {
    render(<Answer id="q-problem"><p>正文段落</p></Answer>)
    const block = document.getElementById('q-problem')
    expect(block).not.toBeNull()
    expect(block?.className).toContain('answer-block')
    expect(screen.getByText('正文段落')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/components/explore/Answer.test.tsx`
Expected: FAIL（当前 Answer 依赖 AnswerProvider context，无 provider 时抛错或无 id）

- [ ] **Step 3: 实现**

`src/components/explore/Answer.tsx` 全文替换：

```tsx
import type { ReactNode } from 'react'

/**
 * v2：原位渲染块。阅读与探索是同一页面的两种用法，Answer 不再有
 * "注册到 Provider、被探索面板抽取"的第二渲染路径——id 即锚点，
 * 场景目录 / 出口 chips / 首页悬念按钮都指向 #<id>。
 */
export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="answer-block" id={id}>
      {children}
    </div>
  )
}
```

删除文件（`git rm`）：`ExploreView.tsx QuestionTree.tsx QuestionTree.test.tsx QuestionNode.tsx QuestionAnchor.tsx QuestionAnchor.test.tsx AnswerProvider.tsx SceneStage.tsx SceneContext.ts SceneController.test.ts`

`src/pages/Post.tsx` 改动：
1. 删除 imports：`AnswerProvider, useAnswerContext`、`QuestionAnchor`；
2. 删除 `PostBodyShell` 组件，`<article>` 内直接 `<MDXProvider components={{ ...registry, Answer, SceneClip }}>` 包裹 `{Body ? <Body /> : <p>正文缺失。</p>}`；
3. 删除 `</MDXProvider>` 前的 `</AnswerProvider>` 对应闭合（重排 JSX）；
4. 底部"走进探索视图 →"链接块整块删除（v2 无独立页面；探索入口由 Task 5 的 SceneToc/首页按钮接管，`hasExplore` 字段保留给 Task 5 用）；
5. 文件头注释更新：说明 v2 单页面方案。

`src/styles/global.css`：新增 `.answer-block { border-left: 3px solid rgba(14,110,92,.25); padding-left: 14px; margin: 18px 0; }`（v1 阅读视图已有类似样式可沿用其值）；删除上列死类名选择器。

- [ ] **Step 4: 跑全量验证**

Run: `pnpm test && pnpm typecheck`
Expected: PASS。注意 `pnpm validate:explore` 此刻也应绿（Task 1 已保证）。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(explore): 删除旧探索组件层——Answer 原位渲染，Post 页去除 Provider/胶囊"
```

---

### Task 3: Scene v2 接口 + SceneClip v2 + ai-it-system scene 适配

**Files:**
- Rewrite: `src/components/explore/SceneController.ts`
- Create: `src/components/explore/SceneController.test.ts`（v2 版）
- Rewrite: `src/components/explore/SceneClip.tsx`
- Create: `src/components/explore/SceneClip.test.tsx`
- Modify: `content/posts/ai-it-system/scene.tsx`（default export Scene → `export const demos`）
- Modify: `content/posts/ai-it-system/article.mdx`（`<SceneClip from="q-search-pipeline" />` → `<SceneClip demo="badcase-journey" />`）

**Interfaces:**
- Produces（后续所有 demo 任务依赖，签名精确）:

```ts
// SceneController.ts v2
import type { ComponentType } from 'react'
import type {} from 'gsap'

export interface Scene {
  name: string                       // 与 yaml scenes[].demo 对齐
  Stage: ComponentType               // 静态 DOM 框架（GSAP 操纵的真实元素都在里面）
  build(): gsap.core.Timeline        // 事件序列编排；每个 demo 独立 timeline
}

export interface DemoHandle {
  play(): void
  pause(): void
  reset(): void                      // pause + seek(0)
  replay(): void                     // seek(0) + play
  finished(): boolean
  kill(): void
}

export function createDemoHandle(tl: gsap.core.Timeline): DemoHandle
```

- Consumes: 无。

- [ ] **Step 1: 写失败测试**

`src/components/explore/SceneController.test.ts`：

```ts
import { describe, it, expect, vi } from 'vitest'
import { gsap } from 'gsap'
import { createDemoHandle } from './SceneController'

describe('createDemoHandle v2', () => {
  it('play/pause/reset/replay 驱动 timeline', () => {
    const tl = gsap.timeline()
    tl.to({}, { duration: 1 })
    const h = createDemoHandle(tl)
    h.play()
    expect(tl.isActive() || tl.progress() > 0).toBe(true)
    h.pause()
    h.reset()
    expect(tl.progress()).toBe(0)
    h.replay()
    h.kill()
  })
  it('finished() 在播完后为 true', () => {
    const tl = gsap.timeline()
    tl.to({}, { duration: 0.1 })
    const h = createDemoHandle(tl)
    expect(h.finished()).toBe(false)
    tl.progress(1)
    expect(h.finished()).toBe(true)
    h.kill()
  })
  it('reduced-motion 下 play 直达终态', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    } as any)
    const tl = gsap.timeline()
    tl.to({}, { duration: 1 })
    const h = createDemoHandle(tl)
    h.play()
    expect(tl.progress()).toBe(1)
    h.kill()
    matchMedia.mockRestore()
  })
})
```

`src/components/explore/SceneClip.test.tsx`：

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SceneClip from './SceneClip'

describe('SceneClip v2', () => {
  it('渲染容器并带 data-scene-clip-demo', () => {
    render(<SceneClip demo="message-flood" />)
    const el = document.querySelector('[data-scene-clip-demo="message-flood"]')
    expect(el).not.toBeNull()
  })
  it('无 IntersectionObserver 环境（jsdom）不崩溃', () => {
    expect(() => render(<SceneClip demo="x" />)).not.toThrow()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/components/explore/`
Expected: FAIL（createDemoHandle 不存在；SceneClip 无 demo prop）

- [ ] **Step 3: 实现 SceneController v2**

```ts
import type { ComponentType } from 'react'
import type {} from 'gsap'

export interface Scene {
  name: string
  Stage: ComponentType
  build(): gsap.core.Timeline
}

export interface DemoHandle {
  play(): void
  pause(): void
  reset(): void
  replay(): void
  finished(): boolean
  kill(): void
}

export function createDemoHandle(tl: gsap.core.Timeline): DemoHandle {
  const reduced = () => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    play() {
      if (reduced()) { tl.pause().progress(1); return }
      tl.play()
    },
    pause() { tl.pause() },
    reset() { tl.pause().seek(0) },
    replay() {
      tl.pause().seek(0)
      if (!reduced()) tl.play()
    },
    finished() { return tl.progress() >= 1 },
    kill() { tl.kill() },
  }
}
```

- [ ] **Step 4: 实现 SceneClip v2**

```tsx
import { useEffect, useRef } from 'react'
import type {} from 'gsap'
import type { Scene } from './SceneController'
import { createDemoHandle } from './SceneController'

/* 与 v1 同一 glob 手法，但消费 demos 字典而非 default Scene */
const demoModules = import.meta.glob<{ demos: Record<string, Scene> }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

function findDemo(slug: string | null, demo: string): Scene | null {
  if (!slug) return null
  const key = Object.keys(demoModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  const mod = key ? demoModules[key] : null
  return mod?.demos?.[demo] ?? null
}

/**
 * v2：唯一 demo 播放入口（spec §4.3）。
 * - slug 反查祖先 [data-article-slug]（沿用 v1 约定）
 * - 首次进入视口（threshold 0.3）：build timeline + 自动 play；播完停终态
 * - 离开视口：未播完则 pause；再进入从未播完处继续
 * - 播完后渲染 ↻ 重看按钮；点击 replay()
 * - reduced-motion：play() 直达终态（createDemoHandle 内处理）
 * - demo 不存在（yaml/正文引用了未定义的键）：空容器降级，控制台 warn
 */
export default function SceneClip({ demo }: { demo: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const host = el.closest('[data-article-slug]')
    const slug = host?.getAttribute('data-article-slug') ?? null
    const scene = findDemo(slug, demo)
    if (!scene) {
      console.warn(`[SceneClip] ${slug} 没有 demo "${demo}"`)
      return
    }

    const tl = scene.build()
    const handle = createDemoHandle(tl)
    let started = false

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          if (!started) { started = true; handle.play() }
          else if (!handle.finished()) handle.play()
        } else if (started && !handle.finished()) {
          handle.pause()
        }
      }
    }, { threshold: 0.3 })

    observer.observe(el)
    const btn = btnRef.current
    btn?.addEventListener('click', handle.replay)

    return () => {
      observer.disconnect()
      btn?.removeEventListener('click', handle.replay)
      handle.kill()
    }
  }, [demo])

  return (
    <div ref={ref} className="scene-clip" data-scene-clip-demo={demo} aria-label={`动画：${demo}`}>
      <button ref={btnRef} type="button" className="scene-replay" aria-label="重看">↻ 重看</button>
    </div>
  )
}
```

`.scene-replay` 样式（global.css，追加到 `.scene-clip` 附近）：默认 `opacity: 0; pointer-events: none;`，`.scene-clip:has(.scene-replay:hover)` 不需要——简化为按钮固定显示在容器右下角：`position:absolute; right:8px; bottom:8px;`（给 `.scene-clip` 加 `position:relative;`）。`.scene-clip { min-height: 120px; }` 兜底空容器高度。

- [ ] **Step 5: ai-it-system 适配**

`content/posts/ai-it-system/scene.tsx`：
1. 删除 `const scene: Scene = {...}` 与 `export default scene`；
2. 把原 build() 的整段 timeline 逻辑原样搬进：

```ts
export const demos: Record<string, Scene> = {
  'badcase-journey': {
    name: 'badcase-journey',
    Stage: PipelineSvg,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      // …原 v1 timeline 主体（intro + q-search-pipeline 两段合并为一条连续叙事，
      //   删除 q-ops-backup 段——它原本就是死 label）
      return tl
    },
  },
}
```

具体节拍：`set` 全部节点 opacity 0 → subtitle 淡入"全链路总览" → 节点 stagger 淡入（0.12 间隔）→ subtitle 切换为"搜索优化流水线：问题报告 → AI 分析 → 提交分支 → CI/CD → 审查合并"（用 `tl.call` 改 textContent）→ 节点再次从左到右 stagger 点亮（0.35 间隔）。总时长约 4s。

`content/posts/ai-it-system/article.mdx`：`<SceneClip from="q-search-pipeline" />` → `<SceneClip demo="badcase-journey" />`。

- [ ] **Step 6: 全量验证**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore`
Expected: 全绿

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(explore): Scene v2 接口（demos 字典 + DemoHandle）+ SceneClip 滚入播放 + ai-it-system 适配"
```

---

### Task 4: mock-ui 原子组件

**Files:**
- Create: `src/components/explore/mock-ui/ChatPane.tsx`
- Create: `src/components/explore/mock-ui/Bubble.tsx`
- Create: `src/components/explore/mock-ui/Typewriter.tsx`
- Create: `src/components/explore/mock-ui/MockCursor.tsx`
- Create: `src/components/explore/mock-ui/index.ts`
- Create: `src/components/explore/mock-ui/mock-ui.test.tsx`
- Modify: `src/styles/global.css`（mock-ui 样式段）

**Interfaces:**
- Produces（Task 6/7/8 的 demo 用）:

```tsx
// ChatPane：聊天窗口框架。children = 消息列表容器内容
export function ChatPane({ title, children, className }: { title: string; children: ReactNode; className?: string })
// 渲染 <div className="mock-chat-pane"><div className="mock-chat-head">{title}</div><div className="mock-chat-body">{children}</div></div>

// Bubble：消息气泡。side left=对方 right=自己；data-mock-bubble 供 GSAP 选择
export function Bubble({ side, children, id }: { side: 'left' | 'right'; children: ReactNode; id?: string })
// 渲染 <div id={id} data-mock-bubble className={`mock-bubble mock-bubble-${side}`}>{children}</div>

// Typewriter：打字机目标。GSAP 用 tl.call 逐字设置 textContent；
// 组件本身渲染 <span className="mock-typing" data-typing-target>{initial}</span>
export function Typewriter({ text, id }: { text: string; id?: string })

// MockCursor：模拟鼠标。absolute 定位，GSAP tl.to(el, {x, y}) 移动
export function MockCursor({ id }: { id?: string })
// 渲染 <div id={id} className="mock-cursor">➤</div> —— 用 CSS 画箭头（border 三角或 emoji 均可，取简）
```

`index.ts` re-export 全部四个。

- [ ] **Step 1: 写失败测试**

```tsx
// mock-ui.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChatPane, Bubble, Typewriter, MockCursor } from './index'

describe('mock-ui 原子', () => {
  it('ChatPane 渲染标题与 body', () => {
    render(<ChatPane title="公司群"><Bubble side="left">消息</Bubble></ChatPane>)
    expect(document.querySelector('.mock-chat-head')?.textContent).toContain('公司群')
    expect(document.querySelector('.mock-bubble-left')).not.toBeNull()
  })
  it('Bubble right / data-mock-bubble', () => {
    render(<Bubble side="right" id="b1">hi</Bubble>)
    expect(document.getElementById('b1')?.getAttribute('data-mock-bubble')).toBe('')
  })
  it('Typewriter 渲染初始文本', () => {
    render(<Typewriter text="加载中" />)
    expect(document.querySelector('.mock-typing')?.textContent).toBe('加载中')
  })
  it('MockCursor 可定位', () => {
    render(<MockCursor id="cur" />)
    expect(document.getElementById('cur')?.className).toBe('mock-cursor')
  })
})
```

- [ ] **Step 2: 跑测试确认失败** — `pnpm test src/components/explore/mock-ui/` → FAIL（模块不存在）

- [ ] **Step 3: 实现**（四个组件按 Interfaces 注释的 JSX 逐字实现，各自带 2 行中文注释说明 GSAP 操纵方式）

- [ ] **Step 4: global.css 追加样式段**

```css
/* ===== mock-ui（体验型 demo 原子）===== */
.mock-chat-pane { background:#fff; border:1px solid var(--line); border-radius:10px; max-width:420px; margin:0 auto; box-shadow:0 8px 24px rgba(0,0,0,.06); overflow:hidden; }
.mock-chat-head { padding:10px 14px; font:600 13px var(--sans); border-bottom:1px solid var(--line); background:var(--paper-raise,#F6F7F4); }
.mock-chat-body { padding:14px; display:flex; flex-direction:column; gap:10px; min-height:220px; position:relative; }
.mock-bubble { max-width:78%; padding:8px 12px; border-radius:12px; font:14px/1.5 var(--sans); }
.mock-bubble-left { align-self:flex-start; background:#F1F3EE; color:var(--ink); }
.mock-bubble-right { align-self:flex-end; background:rgba(14,110,92,.9); color:#fff; }
.mock-typing { font:inherit; }
.mock-cursor { position:absolute; width:0; height:0; border-left:10px solid var(--ink); border-top:6px solid transparent; border-bottom:6px solid transparent; filter:drop-shadow(0 1px 2px rgba(0,0,0,.3)); z-index:5; }
```

- [ ] **Step 5: 跑测试 + Commit**

Run: `pnpm test && pnpm typecheck` → 全绿

```bash
git add -A
git commit -m "feat(explore): mock-ui 原子组件（ChatPane/Bubble/Typewriter/MockCursor）"
```

---

### Task 5: SceneToc + ExitChips + Post 页探索集成 + PostList 悬念按钮

**Files:**
- Create: `src/components/explore/SceneToc.tsx` + `SceneToc.test.tsx`
- Create: `src/components/explore/ExitChips.tsx` + `ExitChips.test.tsx`
- Modify: `src/pages/Post.tsx`
- Modify: `src/lib/content.ts` + `src/lib/content.client.ts`（Post 增 `exploreEntry` 字段）
- Modify: `src/lib/types.ts`（Post 接口）
- Modify: `src/components/PostList.tsx`
- Modify: `src/styles/global.css`（scene-toc / exit-chips 样式）

**Interfaces:**
- Consumes: Task 1 的 `parseExploreYaml / resolveExploreHref`、`ExploreConfig/ExploreExit` 类型；Task 2 的 `<Answer id>` 锚点。
- Produces:
  - `SceneToc({ config }: { config: ExploreConfig | null })`——null 时渲染 null；
  - `ExitChips({ group, exits, config }: { group: 'features' | 'questions'; exits: ExploreExit[]; config: ExploreConfig })`——本地目标 `<a href="#id">`（点击 preventDefault + smooth scroll + `history.pushState` 更新 hash）；跨文章 `<Link to={resolveExploreHref(...)}>`；
  - `Post.exploreEntry?: { id: string; label: string }`。

- [ ] **Step 1: 写失败测试**

```tsx
// SceneToc.test.tsx
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SceneToc from './SceneToc'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: '场景A', demo: 'd-a' },
    { id: 'q-b', label: '场景B', demo: 'd-b' },
  ],
}

describe('SceneToc', () => {
  it('config 为 null 渲染 null', () => {
    const { container } = render(<SceneToc config={null} />)
    expect(container.innerHTML).toBe('')
  })
  it('目录顺序 = yaml 顺序，点击滚动到目标', () => {
    render(<SceneToc config={config} />)
    const items = document.querySelectorAll('.scene-toc a')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('场景A')
    const target = document.createElement('div')
    target.id = 'q-b'
    document.body.appendChild(target)
    const scroll = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scroll
    fireEvent.click(items[1])
    expect(scroll).toHaveBeenCalled()
  })
})
```

```tsx
// ExitChips.test.tsx（MemoryRouter 包裹，因跨文章用 react-router Link）
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import ExitChips from './ExitChips'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [{ id: 'q-a', label: 'A', demo: 'd' }, { id: 'q-b', label: 'B', demo: 'd' }],
}

describe('ExitChips', () => {
  it('本地目标渲染 #id 链接，点击 smooth 滚动', () => {
    render(<MemoryRouter><ExitChips group="features" config={config}
      exits={[{ text: '看B', to: 'q-b' }]} /></MemoryRouter>)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.getAttribute('href')).toBe('#q-b')
    const scroll = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scroll
    fireEvent.click(a!)
    expect(scroll).toHaveBeenCalled()
  })
  it('跨文章目标渲染 /blog/<post>/#… 链接', () => {
    render(<MemoryRouter><ExitChips group="questions" config={config}
      exits={[{ text: '去那篇', to: { post: 'other', scene: 'entry' } }]} /></MemoryRouter>)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.getAttribute('href')).toBe('/blog/other/#entry')
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL（模块不存在）

- [ ] **Step 3: 实现 SceneToc / ExitChips**

```tsx
// SceneToc.tsx
import type { ExploreConfig, ExploreScene } from '../../lib/types'

function scrollTo(id: string, e?: React.MouseEvent) {
  e?.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 右侧悬浮场景目录（桌面）+ 顶部折叠目录（移动）。顺序 = yaml 场景顺序。不改 hash。 */
export default function SceneToc({ config }: { config: ExploreConfig | null }) {
  if (!config) return null
  const items = (s: ExploreScene) => (
    <li key={s.id}>
      <a href={`#${s.id}`} onClick={(e) => scrollTo(s.id, e)}>{s.label}</a>
    </li>
  )
  return (
    <>
      <nav className="scene-toc" aria-label="场景目录"><ul>{config.scenes.map(items)}</ul></nav>
      <details className="scene-toc-mobile">
        <summary>场景目录</summary>
        <ul>{config.scenes.map(items)}</ul>
      </details>
    </>
  )
}
```

```tsx
// ExitChips.tsx
import { Link } from 'react-router-dom'
import type { ExploreConfig, ExploreExit } from '../../lib/types'
import { resolveExploreHref } from '../../lib/explore'

interface Props {
  group: 'features' | 'questions'
  exits: ExploreExit[]
  config: ExploreConfig
}

/** 场景下方出口按钮组。本地：smooth 滚动 + pushState（前进后退可用）；跨文章：整页跳转。 */
export default function ExitChips({ group, exits, config }: Props) {
  if (exits.length === 0) return null
  return (
    <div className={`exit-chips exit-chips-${group}`}>
      {exits.map((e) => {
        if (typeof e.to === 'string') {
          const id = e.to
          return (
            <a key={e.text} className="exit-chip" href={`#${id}`}
              onClick={(ev) => { ev.preventDefault(); history.pushState(null, '', `#${id}`); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}>
              {e.text} →
            </a>
          )
        }
        return (
          <Link key={e.text} className="exit-chip" to={resolveExploreHref(e.to, config)}>
            {e.text} →
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: content 层 exploreEntry + Post/PostList 接线**

`src/lib/types.ts` Post 接口追加：`exploreEntry?: { id: string; label: string }`。

`src/lib/content.ts`（getAllPosts 内，`hasExplore` 计算处）：

```ts
let exploreEntry: Post['exploreEntry']
const exploreFile = path.join(POSTS_DIR, slug, 'explore.yaml')
if (fs.existsSync(exploreFile)) {
  try {
    const parsed = yaml.load(fs.readFileSync(exploreFile, 'utf-8')) as any
    if (parsed?.entry && parsed?.scenes) {
      const entry = parsed.scenes.find((s: any) => s.id === parsed.entry)
      if (entry?.label) exploreEntry = { id: String(parsed.entry), label: String(entry.label) }
    }
  } catch { /* yaml 坏不阻塞文章列表；validate:explore 会报 */ }
}
// push 时带 exploreEntry
```

`src/lib/content.client.ts`：对称实现（它用 `import.meta.glob('.../explore.yaml', { query: '?raw' })` 的话，解析同一逻辑；先读该文件再动手，保持其现有取数模式）。

`src/pages/Post.tsx`：
1. 顶部追加 yaml glob 与解析（SSG 与浏览器同源，无 hydration 差异）：

```tsx
const exploreYamls = import.meta.glob<string>('/content/posts/*/explore.yaml', { query: '?raw', import: 'default', eager: true })
function exploreConfigFor(slug: string): ExploreConfig | null {
  const key = Object.keys(exploreYamls).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  const r = parseExploreYaml(exploreYamls[key])
  return r.ok ? r.value : null
}
```

2. 组件内 `const exploreConfig = useMemo(() => exploreConfigFor(post.slug), [post.slug])`；
3. `#entry` 保留字落地（spec §3.3）：`useEffect` 监听一次——若 `location.hash === '#entry' && exploreConfig`，`replaceState` 为 `#<config.entry>` 并 smooth 滚动到该 id；
4. `{exploreConfig && <p className="explore-hint">本文可顺序阅读；点击各场景下方的出口按钮可跳转探索。</p>}`（置于 h1 之后）；
5. `<SceneToc config={exploreConfig} />` 渲染在 `<main>` 内（fixed 定位元素放哪都行，放 main 尾部）。

`src/components/PostList.tsx`：excerpt 之后追加：

```tsx
{p.exploreEntry && (
  <span className="explore-entry-btn" aria-hidden="false">▶ {p.exploreEntry.label}</span>
)}
```

外层 `<Link to={...}>` 已是整卡链接；把卡片 `to` 改为 `p.exploreEntry ? { pathname: `/blog/${p.slug}/`, hash: `#${p.exploreEntry.id}` } : `/blog/${p.slug}/``——悬念按钮即卡片的默认落点（spec §3.2）。样式 `.explore-entry-btn { display:inline-block; margin-top:8px; font:600 13px var(--sans); color:var(--accent); }`。

global.css 追加：

```css
/* ===== 场景目录 + 出口 chips（v2）===== */
.scene-toc { position:fixed; right:20px; top:120px; width:200px; max-height:60vh; overflow:auto; font:13px var(--sans); }
.scene-toc ul { list-style:none; margin:0; padding:0; }
.scene-toc a { display:block; padding:6px 8px; color:var(--ink-soft); text-decoration:none; border-left:2px solid var(--line); }
.scene-toc a:hover { color:var(--accent); border-left-color:var(--accent); }
.scene-toc-mobile { display:none; }
@media (max-width:920px) {
  .scene-toc { display:none; }
  .scene-toc-mobile { display:block; margin:0 0 16px; font:14px var(--sans); }
  .scene-toc-mobile ul { list-style:none; padding-left:8px; }
}
.exit-chips { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 6px; }
.exit-chip { display:inline-block; padding:4px 12px; border:1px solid var(--accent); border-radius:999px; font:12px var(--mono); color:var(--accent); text-decoration:none; background:none; cursor:pointer; }
.exit-chip:hover { background:rgba(14,110,92,.08); }
.exit-chips-questions .exit-chip { border-style:dashed; }
.explore-hint { font:13px var(--mono); color:var(--ink-faint); }
```

- [ ] **Step 5: 全量验证**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(explore): SceneToc 场景目录 + ExitChips 出口 + 首页悬念按钮入口"
```

---

### Task 6: ai-digital-employee 内容落地（yaml v2 + article 改造 + 2 体验型 demo + 9 stub）

**Files:**
- Create: `content/posts/ai-digital-employee/explore.yaml`（v2 全量 11 场景）
- Create: `content/posts/ai-digital-employee/scene.tsx`（demos 字典：2 个完整体验型 + 9 个 stub）
- Modify: `content/posts/ai-digital-employee/article.mdx`（Answer 包裹 + 入口 Answer + 11 处 SceneClip）

**Interfaces:**
- Consumes: Task 3 `Scene/DemoHandle` 接口、Task 4 mock-ui 原子、Task 5 SceneToc/ExitChips（无需直接 import——通过 yaml 数据生效）。
- Produces: `demos` 键集合（11 个）：`message-flood, tiered-confirm, openclaw-pitfalls, four-prerequisites, badge-metaphor, protocol-repo, unified-identity, tiered-execution, threat-model, limits, dev-flow`。**本任务后 validator 必须绿**——9 个概念型 demo 先以 stub 占位（同分支 Task 7 立即替换为真实现）。

- [ ] **Step 1: 写 explore.yaml（spec §10.1 逐字采用）**

```yaml
title: 一个 AI 数字员工平台
entry: q-problem

scenes:
  - id: q-problem
    label: 公司的技术问题，都是谁在解决？
    demo: message-flood
    features:
      - { text: AI 分身怎么安全上岗？, to: q-badge-metaphor }
      - { text: 直接看确认流程, to: q-tiered-confirm }
    questions:
      - { text: 第一次尝试为什么失败？, to: q-why-not-openclaw }
      - { text: 这套方案的边界, to: q-limits }
      - { text: 未来还能怎么扩展？, to: q-future }

  - id: q-why-not-openclaw
    label: 第一次尝试：为什么没用 openclaw？
    demo: openclaw-pitfalls
    questions:
      - { text: 正确的前提是什么？, to: q-four-prerequisites }

  - id: q-four-prerequisites
    label: AI 安全上岗的四个前提
    demo: four-prerequisites
    questions:
      - { text: 看整体设计, to: q-badge-metaphor }

  - id: q-badge-metaphor
    label: 一句话方案：把工牌借给 AI
    demo: badge-metaphor
    features:
      - { text: 协议仓库, to: q-protocol-repo }
      - { text: 统一身份, to: q-unified-identity }
      - { text: 分级执行, to: q-tiered-execution }
    questions:
      - { text: 直接看分级确认流程, to: q-tiered-confirm }

  - id: q-protocol-repo
    label: 第一层：让接口自报家门
    demo: protocol-repo
    questions:
      - { text: 上一层：工牌比喻, to: q-badge-metaphor }
      - { text: 下一层：统一身份, to: q-unified-identity }

  - id: q-unified-identity
    label: 第二层：AI 走人一样的权限通道
    demo: unified-identity
    questions:
      - { text: 上一层：协议仓库, to: q-protocol-repo }
      - { text: 下一层：分级执行, to: q-tiered-execution }

  - id: q-tiered-execution
    label: 第三层：分级执行（总览）
    demo: tiered-execution
    questions:
      - { text: 看一段真实确认流程, to: q-tiered-confirm }

  - id: q-tiered-confirm
    label: 一段确认流程
    demo: tiered-confirm
    features:
      - { text: 回到问题入口, to: q-problem }
      - { text: 看分级策略总览, to: q-tiered-execution }
    questions:
      - { text: 这套方案解决不了什么？, to: q-limits }

  - id: q-threat-model
    label: 威胁模型：平台约束的是 AI，不是人
    demo: threat-model
    questions:
      - { text: 回到入口, to: q-problem }

  - id: q-limits
    label: 这套方案解决不了什么
    demo: limits
    questions:
      - { text: 未来还能怎么扩展？, to: q-future }
      - { text: 回到入口, to: q-problem }

  - id: q-future
    label: 未来拓展：让 AI 替我接需求
    demo: dev-flow
    questions:
      - { text: 回到入口, to: q-problem }
```

- [ ] **Step 2: article.mdx 改造（映射表逐条执行）**

frontmatter 不动。imports 段把 `import SceneClip from '../../../src/components/explore/SceneClip'` 保留（v2 兼容 demo prop）。

Answer 包裹映射（`<Answer id="…">` 开标签放在章节标题行之后，闭标签放在该章节末段之后）：

| scene id | 包裹的章节标题 | SceneClip 插入位置 |
|---|---|---|
| q-problem | `## 背景：公司技术就我一个人` | 标题后、第一个 `<p>` 前（demo 先行，正文解说其后）|
| q-why-not-openclaw | `## 第一次尝试：OpenClaw 数字分身，为什么最终没上线` | 标题后 |
| q-four-prerequisites | `## 想清楚：让 AI 安全上岗的四个前提` | 标题后 |
| q-badge-metaphor | `## 总体设计：三层结构`（含工牌比喻整节直到 ArchDiagram 之前）| 标题后 |
| q-protocol-repo | `### 第一层：协议仓库——让每个接口"自报家门"` | 标题后 |
| q-unified-identity | `### 第二层：统一身份——AI 走和人一模一样的权限通道` | 标题后 |
| q-tiered-execution | `### 第三层：分级执行——AI 发疯也有兜底` | 标题后 |
| q-tiered-confirm | 无独立章节——新增 `### 一段确认流程` 小节，插在第三层章节末尾（`到这里，四个前提全部闭环…` 段之后），Answer 文字见下方 | 标题后 |
| q-threat-model | `## 这套方案的威胁模型：平台约束的是 AI，不是人` | 标题后 |
| q-limits | `## 坦诚地说：这套方案解决不了什么` | 标题后 |
| q-future | `## 未来拓展：让 AI 替我接需求` | 标题后 |

入口 Answer 新增文字（插在引言 blockquote 之后、`## 背景` 之前，独立小节）：

```mdx
<Answer id="q-problem-intro">

> 下面的内容有两种读法：从上往下顺序读，是完整的设计论证；每节开头有一段动画演示，点各节下方的出口按钮可以跳跃式探索。建议第一次先顺序读完，再回头点你感兴趣的问题。

</Answer>
```

注意：`q-problem-intro` 不在 yaml scenes 里——它会被 validator 规则 3 警告（未被场景引用）。**避免办法**：这段引言不用 `<Answer>`，直接用普通 blockquote（引言不是场景，不需要锚点）。采用此办法，上面块改为普通 `> 引导文字`。

`### 一段确认流程` 新增小节的 Answer 正文（qi-profile 体验型 demo 的解说）：

```mdx
### 一段确认流程

<Answer id="q-tiered-confirm">
左边演示的是一次典型的「安全写」操作：运维同事在 IM 里说"给张三开通 BI 看板权限"，
AI 识别出这不是只读操作，弹回一张确认卡——操作的完整参数、以谁的身份执行、影响哪个系统，
全部列清楚。点下确认，动作才真正发生。全程审计日志记的是操作人本人，而不是"AI"。
这正是分级执行里"安全写接口：获得人类确认后立即触发"的那条路径。
</Answer>

<SceneClip demo="tiered-confirm" />
```

「顺手的事：知识库问答」「AI 侧审计」「最后」三章保持纯文字（spec §10.3：不为平铺硬凑动画）。

- [ ] **Step 3: scene.tsx——2 个体验型 demo + 9 个 stub**

`content/posts/ai-digital-employee/scene.tsx` 骨架：

```tsx
import { gsap } from 'gsap'
import type { Scene } from '../../../src/components/explore/SceneController'
import { ChatPane, Bubble, Typewriter, MockCursor } from '../../../src/components/explore/mock-ui'
import { FloodStage, ConfirmStage } from './scene-stages'
// 概念型 9 demo 用轻量内联 Stage（div + ul），全部写在本文件
```

（建议把两个体验型的 Stage 拆到 `scene-stages.tsx`，本文件只留 demos 注册与 timeline——单文件不超 300 行。）

**message-flood（Stage = FloodStage）**：FloodStage 渲染 `<ChatPane title="公司群">`，内含 5 条 left Bubble（id b1..b5，各自文本：「软件崩了，快来」「后台怎么配置？」「这个需求帮我做下」「又挂了？？」「在吗？在吗？在吗？」，初始 `opacity:0`），溢出用一个 `position:relative` 容器让气泡可越出（GSAP y 位移），底部两条字幕 `#flood-line1`（「公司的技术人员，只有我一个。」）、`#flood-line2`（「能不能做一个 AI 数字分身，替我处理这些？」），均 opacity 0。

build() 节拍（总长约 8s）：

```ts
build() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const bubbles = ['#b1', '#b2', '#b3', '#b4', '#b5']
  tl.set(bubbles, { opacity: 0, y: 14 })
  tl.set(['#flood-line1', '#flood-line2'], { opacity: 0 })
  // 1) 消息逐条弹出，越来越快（0.9 → 0.35 间隔）
  bubbles.forEach((b, i) => {
    tl.to(b, { opacity: 1, y: 0, duration: 0.3 }, i === 0 ? 0.4 : '>')
    if (i < bubbles.length - 1) tl.to({}, { duration: 0.9 - i * 0.14 })
  })
  // 2) 气泡堆整体上移溢出，窗体轻震
  tl.to('.mock-chat-body', { y: -60, duration: 0.8 }, '+=0.2')
  tl.to('.mock-chat-pane', { x: 3, duration: 0.05, repeat: 5, yoyo: true }, '<')
  // 3) 静默 + 点题
  tl.to(['.mock-chat-body', '.mock-chat-head'], { opacity: 0.25, duration: 0.6 }, '+=0.4')
  tl.to('#flood-line1', { opacity: 1, duration: 0.8 }, '<+0.3')
  tl.to('#flood-line2', { opacity: 1, duration: 0.8 }, '+=0.9')
  return tl
}
```

**tiered-confirm（Stage = ConfirmStage）**：ConfirmStage 渲染 `<ChatPane title="AI 数字员工">`，内含：right Bubble（含 `<Typewriter text="请给张三开通 BI 看板权限" id="tc-input" />`）、left Bubble id `tc-ai-thinking`（内容 `…`）、left Bubble id `tc-ai-ask`（「该操作涉及【安全写】，需要您确认」）、确认卡 `#tc-card`（一个 mock 面板：标题「开通看板权限」、参数行「目标：张三 · 权限：BI 看板 · 身份：张三本人」、`#tc-btn` 确认按钮，初始 `opacity:0; scale:0.9`）、left Bubble id `tc-done`（「已完成：张三的看板权限已开通」）、`<MockCursor id="tc-cursor" />`。状态灯 `#tc-light`（小圆点，初始灰）。

build() 节拍（总长约 8s）：

```ts
build() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set(['#tc-ai-thinking', '#tc-ai-ask', '#tc-done'], { opacity: 0 })
  tl.set('#tc-card', { opacity: 0, scale: 0.9 })
  tl.set('#tc-cursor', { x: 300, y: 200, opacity: 0 })
  // 1) 打字机输入
  const inputText = '请给张三开通 BI 看板权限'
  for (let i = 1; i <= inputText.length; i++) {
    tl.call(() => { const el = document.getElementById('tc-input'); if (el) el.textContent = inputText.slice(0, i) })
    tl.to({}, { duration: 0.06 })
  }
  // 2) AI thinking（三点闪烁用 opacity yoyo）
  tl.to('#tc-ai-thinking', { opacity: 1, duration: 0.2 })
  tl.to('#tc-ai-thinking', { opacity: 0.4, duration: 0.3, repeat: 3, yoyo: true })
  // 3) AI 弹回确认卡
  tl.set('#tc-ai-thinking', { opacity: 0 })
  tl.to('#tc-ai-ask', { opacity: 1, duration: 0.3 })
  tl.to('#tc-card', { opacity: 1, scale: 1, duration: 0.4 })
  // 4) 模拟鼠标移到确认键 + 点击
  tl.to('#tc-cursor', { opacity: 1, duration: 0.2 })
  tl.to('#tc-cursor', { x: <按 ConfirmStage 布局实测填写>, y: <同上>, duration: 0.8 })
  tl.to('#tc-btn', { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 })
  tl.set('#tc-light', { backgroundColor: '#0E6E5C' })  // 状态灯变绿
  // 5) 完成
  tl.to('#tc-done', { opacity: 1, duration: 0.4 })
  tl.to('#tc-cursor', { opacity: 0, duration: 0.3 }, '<')
  return tl
}
```

（cursor 移动终点坐标依赖 ConfirmStage 布局，实现者渲染后用 devtools/测试断言取实际按钮位置——Step 里给的 x/y 是待定值这一点**必须**在实现时落实为具体数字，不能留 `<按…填写>` 字样。）

**9 个 stub demo**（统一模式，Task 7 替换）：

```ts
function stubStage(label: string) {
  return function Stub() {
    return <div className="demo-stub" data-demo-stub={label}>{label}</div>
  }
}
// demos 里：
openclaw-pitfalls: { name: 'openclaw-pitfalls', Stage: stubStage('openclaw-pitfalls'), build: () => gsap.timeline().to({}, { duration: 0.1 }) },
// …其余 8 个同构
```

`.demo-stub` 样式：居中灰字占位。

- [ ] **Step 4: demo smoke 测试**

Create `content/posts/ai-digital-employee/scene.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('ai-digital-employee demos', () => {
  it('11 个 demo 齐全且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual([
      'badge-metaphor', 'dev-flow', 'four-prerequisites', 'limits', 'message-flood',
      'openclaw-pitfalls', 'protocol-repo', 'tiered-confirm', 'tiered-execution',
      'threat-model', 'unified-identity',
    ])
    for (const [k, v] of Object.entries(demos)) expect(v.name).toBe(k)
  })
  it('每个 build() 返回正时长 timeline（jsdom 下 gsap 可运行）', () => {
    for (const v of Object.values(demos)) {
      const tl = v.build()
      expect(tl.duration()).toBeGreaterThan(0)
      tl.kill()
    }
  })
})
```

Run: `pnpm test content/posts/ai-digital-employee/scene.test.tsx` → 先 FAIL（scene.tsx 不存在）再 PASS。

- [ ] **Step 5: 全量验证**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore`
Expected: 全绿（validator 对 ai-digital-employee 全规则通过；对警告规则 3 零条——所有 Answer 均被场景引用）

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(content): ai-digital-employee v2——11 场景 yaml + article Answer/SceneClip 改造 + 2 体验型 demo"
```

---

### Task 7: ai-digital-employee 9 个概念型 demos 真实现（替换 stub）

**Files:**
- Modify: `content/posts/ai-digital-employee/scene.tsx`（或 scene-stages.tsx，若拆分）
- Modify: `src/styles/global.css`（概念型 demo 通用样式：`.concept-demo .concept-item` 列表项、`.concept-title` 等）

**Interfaces:**
- Consumes: Task 6 的 demos 注册表与键名（**不得改名**，yaml 已引用）。
- Produces: 9 个完整 demo，替换同键 stub；`scene.test.tsx` 的键集合断言保持通过。

- [ ] **Step 1: 通用概念型模式**

每个概念型 demo = 一个 Stage（`<div className="concept-demo">` + 若干 `<div className="concept-item" data-idx>`，初始 opacity 0）+ timeline（逐条 stagger 出现 + 一处强调动作）。通用节拍模板：

```ts
build() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const items = '.concept-demo .concept-item'
  tl.set(items, { opacity: 0, y: 12 })
  tl.to(items, { opacity: 1, y: 0, duration: 0.5, stagger: 0.6 })
  return tl
}
```

- [ ] **Step 2: 9 个 demo 的节拍表（逐个实现，强调动作各不相同）**

| demo | Stage 内容（条目文本） | 强调动作 |
|---|---|---|
| `openclaw-pitfalls` | 3 条：凭证隔离问题 / 细粒度权限做不到 / 审计是黑洞 | 第 3 条出现后全部变灰（opacity 0.4）+ 右侧浮现「未上线」标签 |
| `four-prerequisites` | 4 条：权限划分准确 / AI 发疯有兜底 / 行为可预测 / 开发可持续 | 每条出现时左侧编号方块依次点亮（背景色 → accent） |
| `badge-metaphor` | 一个门 + 一张工牌图形（div 拼）：工牌从人手移到 AI 手，然后门变绿 | 工牌移动用 `tl.to('#badge', {x,y})`；门开时 `#door` 边框变 accent |
| `protocol-repo` | 3 个接口方块（只读/安全写/高风险 各带标签）→ 一条箭头流向「协议仓库」方块 | 三方块依次闪一下后箭头出现 |
| `unified-identity` | 请求链：员工 → 平台 → Apisix → 后台（4 方块横排）+ 一个「身份=张三」徽章沿链移动 | 徽章 `tl.to` 逐段移动，每停一站该方块边框闪 accent |
| `tiered-execution` | 4 行策略：只读→直调 / 安全写→确认 / 可逆→预演+锁定 / 高风险→管理员审批 | 4 行依次出现；第 4 行出现时加粗 + 「兜底」角标弹出 |
| `threat-model` | 两个框：传统后台（不动）+ 平台增量层（半透明叠上来） | 平台框从上方叠落（y -40 → 0）+「纯增量，不收缩任何权限」字幕 |
| `limits` | 5 条：撤回有边界 / 会议室兜底 / 分级过滥退化 / 防不住诱导 / 测试服数据陈旧 | 每条出现配一个 ⚠ 前缀闪现 |
| `dev-flow` | 6 节点横排：需求 → 方案 Agent → 审查 → 落地 Agent → CI/CD → 发布 | 节点逐个亮 + 箭头线依次生长（scaleX 0→1） |

每个 demo 总时长控制在 3–6 秒。实现写在 `scene.tsx`（或已拆分的 `scene-stages.tsx`），**stub 删除**——完成后文件内不得残留 `stubStage`。

- [ ] **Step 3: 测试保持 + 全量验证**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore`
Expected: 全绿（scene.test.tsx 键集合不变、duration>0 不变）

- [ ] **Step 4: 手测（dev server）**

Run: `pnpm dev` 后访问 `/blog/ai-digital-employee/`：
- 11 处 demo 滚入自动播放、离开暂停、↻ 重看可用；
- 右侧目录 11 项、点击平滑滚动；
- 出口 chips：本地跳转平滑滚动 + hash 变化；跨文章 chip（如有）跳页。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(content): ai-digital-employee 9 个概念型 demo 真实现，stub 清零"
```

---

### Task 8: ai-it-system v2 内容（yaml + article Answer + badcase 旅程升级）

**Files:**
- Create: `content/posts/ai-it-system/explore.yaml`
- Modify: `content/posts/ai-it-system/scene.tsx`（badcase-journey 升级为叙事节拍）
- Modify: `content/posts/ai-it-system/article.mdx`（Answer 包裹既有流水线叙述）

**Interfaces:**
- Consumes: Task 3 的 demos 结构（已有 `badcase-journey` 键）、Task 4 mock-ui、Task 5 组件。
- Produces: ai-it-system 探索可用；`q-search-pipeline` 作为唯一场景 id。

- [ ] **Step 1: explore.yaml**

```yaml
title: AI 与工程的整体改造骨架
entry: q-search-pipeline

scenes:
  - id: q-search-pipeline
    label: 一条 badcase 报告的旅程
    demo: badcase-journey
    features:
      - { text: ALL IN AI 总体设计, to: { post: ai-digital-employee, scene: q-badge-metaphor } }
    questions:
      - { text: 一段确认流程长什么样？, to: { post: ai-digital-employee, scene: q-tiered-confirm } }
      - { text: 这套方案的边界, to: { post: ai-digital-employee, scene: q-limits } }
```

- [ ] **Step 2: article.mdx Answer 包裹**

`<Answer id="q-search-pipeline">` 包裹「### 搜索优化流水线：问题报告到合并上线」小节内从「**典型一次优化的执行链路**」到「**未来会拓展更多场景**」整段（该 Answer v1 已存在则保持原 id 不动，仅确认包裹范围）。`<SceneClip demo="badcase-journey" />` 已在 Task 3 换好。「AI+运维」「AI+BI」两章施工预告保留原样（spec：预告写正文，不上树）。

- [ ] **Step 3: badcase-journey 升级叙事**

在 Task 3 基础骨架上（PipelineSvg 之上叠加 mock 层）：舞台顶部加一条 left Bubble（「搜索 badcase：query X 召回不全，预期 Y 实际 Z」打字机出现）→ 时间线走原节点点亮 → CI 节点亮时旁边小方块由灰转绿（`tl.set('#ci-light', {backgroundColor:'#0E6E5C'})`）→ MR 节点亮时右上角「✓ merged」标签淡入 → 底部字幕最终变为「全程几乎零沟通：人只在报告与验收出现两次」。总长 5–7s。

- [ ] **Step 4: 验证 + Commit**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore && pnpm build`
Expected: 全绿；`dist/blog/ai-it-system/index.html` 与 `dist/blog/ai-digital-employee/index.html` 产出。

```bash
git add -A
git commit -m "feat(content): ai-it-system v2——badcase 旅程场景 + 跨文章出口"
```

---

### Task 9: 回归收尾

**Files:**
- Modify: `src/styles/global.css`（清死样式终检）
- Modify: `docs/superpowers/specs/2026-08-29-explore-view-design-v2.md`（状态行改「已实现」）
- 全仓库回归

**Interfaces:**
- Consumes: 全部前序任务。
- Produces: 干净的 main 候选树。

- [ ] **Step 1: 死代码/死样式扫描**

Run: `grep -rn "QuestionAnchor\|AnswerProvider\|ExploreView\|QuestionTree\|QuestionNode\|SceneStage\|SceneContext\|explore.client\|seek_root\|cross-link" src/ content/ scripts/ vite.config.ts`
Expected: 仅 spec/plan 文档与历史注释命中，**源代码零命中**。

Run: `grep -n "explore-grid\|explore-tree\|qtree\|qnode\|scene-stage\|explore-wrap\|explore-answers\|scene-focus" src/styles/global.css`
Expected: 零命中（v1 死样式清完）。

- [ ] **Step 2: 全量闸门**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore && pnpm build`
Expected: 全绿；build 产出不含 `dist/blog/*/explore/` 目录。

- [ ] **Step 3: 手测清单（dev server + 移动视口）**

- 桌面 ≥920px：右侧悬浮目录、滚入播放、↻ 重看、出口本地滚动 + hash、跨文章跳页落锚；
- 移动 <920px：目录折叠 details、出口 chips 换行、demo 全宽；
- `prefers-reduced-motion`（devtools 模拟）：demo 直达终态；
- 首页卡片悬念按钮落到 `#q-problem` / `#q-search-pipeline`；
- 浏览器后退回到先前 hash。

- [ ] **Step 4: spec 状态更新 + Commit**

`2026-08-29-explore-view-design-v2.md` 头部 `**状态**: 起草，待评审（替换 v1）` → `**状态**: 已实现（见 plans/2026-08-29-explore-view-v2.md）`。

```bash
git add -A
git commit -m "chore(explore): v2 重构收尾——死样式清理 + spec 状态更新"
```

---

## Self-Review 记录

1. **Spec 覆盖**：§2 场景/目录/出口 → Task 3/5；§3 路由与入口 → Task 1（路由删除）+ Task 5（悬念按钮/#entry 别名）；§4 Answer/SceneClip → Task 2/3；§5 yaml schema → Task 1；§6 Scene 接口与 mock UI → Task 3/4；§7 组件结构 → Task 1/2/5；§8 校验 → Task 1；§9 响应式 → Task 5 样式 + Task 9 手测；§10 内容 → Task 6/7/8；§11 测试 → 各任务 + Task 9；§12 里程碑一一对应 Task 1–9。无缺口。
2. **占位符扫描**：Task 6 Step 3 中 cursor 坐标是唯一"实现时定值"——已显式标注必须落实，不属于允许的 TBD；其余步骤均有完整代码/文本。
3. **类型一致性**：`ExploreTarget/ExploreExit/ExploreScene/ExploreConfig` 在 Task 1 定义、Task 5 消费一致；`Scene{name,Stage,build}` 在 Task 3 定义、Task 6/7/8 消费一致；`parseExploreYaml/resolveExploreHref/scanDemoNames` 签名在 Task 1 与消费方一致；demos 键集合在 Task 6 定义、Task 7 保持。
