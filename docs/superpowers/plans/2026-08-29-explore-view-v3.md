# 探索视图 v3 版式与演出 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不动 v2 架构（路由/yaml/Scene 协议/demo 动画/MDX 内容）的前提下，把探索文章页从"720px 博客版式"改造为"暗厅 CRT 剧场版式"，并为文字加 GSAP 打字机与 IO 错峰演出。

**Architecture:** 全部新样式挂在 `.post-wrap--stage` 作用域前缀下（无 explore.yaml 的文章零影响）；Answer.tsx 重构为分区渲染（act-head/stage/dialogue/choices）；打字机是操作已渲染 DOM 的 GSAP timeline 构建器（SSG 直出原文，hydration 后增强）；IO 触发沿用 SceneClip 手法。

**Tech Stack:** Vite 8 + React 19 + TS + GSAP 3.15 core（无插件）+ vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-08-29-explore-view-design-v3.md`

## Global Constraints

- pnpm 为唯一包管理器；不新增任何依赖
- GSAP core only（无 TextPlugin 等插件）；打字机用 `tl.call(() => { el.textContent = ... })` 手法
- `content/posts/**` 零改动（铁律：MDX/yaml/scene.tsx 一个字不动）
- demo 动画（scene-builds/scene-stages/mock-ui）零改动
- 所有新 CSS 必须在 `.post-wrap--stage` 作用域内（无 explore 文章零回归）
- SSG 安全：所有"初始隐藏"必须在 hydration 后才生效——无 JS 时内容完整可读
- reduced-motion：文字演出直达终态（与 demo 行为一致）
- 测试命令：`pnpm test`（vitest run）、`pnpm typecheck`、`pnpm validate:explore`；全绿才允许 commit
- 920px 断点为移动/桌面分界（沿用）；新增 1400px 为目录显隐分界
- 中文注释；文件末尾换行

---

### Task 1: 中文序号纯函数 + GSAP 打字机构建器

**Files:**
- Modify: `src/lib/explore.ts`（文件末尾追加函数）
- Test: `src/lib/explore.test.ts`（文件末尾追加 describe）
- Create: `src/components/explore/useTypewriter.ts`
- Test: `src/components/explore/useTypewriter.test.ts`

**Interfaces:**
- Consumes: 无（全新函数）
- Produces:
  - `toChineseOrdinal(n: number): string` — 1→'第一'…12→'第十二'；0/负数/非整数抛 `RangeError`
  - `buildTypewriterTimeline(el: HTMLElement, opts?: { charMs?: number }): gsap.core.Timeline | null` — null 表示 reduced-motion（调用方跳过演出直接显示终态）

- [ ] **Step 1: 写失败测试（toChineseOrdinal）**

在 `src/lib/explore.test.ts` 末尾追加：

```ts
describe('toChineseOrdinal（v3 幕序号）', () => {
  it('1-12 正确转换', () => {
    const expectArr = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
    expectArr.forEach((c, i) => expect(toChineseOrdinal(i + 1)).toBe(c))
  })
  it('非正整数抛 RangeError', () => {
    expect(() => toChineseOrdinal(0)).toThrow(RangeError)
    expect(() => toChineseOrdinal(-1)).toThrow(RangeError)
    expect(() => toChineseOrdinal(1.5)).toThrow(RangeError)
  })
})
```

（import 行同步追加 `toChineseOrdinal`。）

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/lib/explore.test.ts`
Expected: FAIL（toChineseOrdinal is not a function / 未导出）

- [ ] **Step 3: 实现 toChineseOrdinal**

在 `src/lib/explore.ts` 末尾追加：

```ts
/** v3：场景幕序号中文数字（1→一 … 12→十二；>12 按 digit 组合，当前 11 场景够用） */
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
export function toChineseOrdinal(n: number): string {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError(`幕序号必须是正整数: ${n}`)
  if (n < 10) return CN_DIGITS[n]
  if (n === 10) return '十'
  if (n < 20) return `十${CN_DIGITS[n - 10]}`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test src/lib/explore.test.ts`
Expected: PASS（原有用例全绿）

- [ ] **Step 5: 写失败测试（buildTypewriterTimeline）**

新建 `src/components/explore/useTypewriter.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import gsap from 'gsap'

/** jsdom 无真实 layout；matchMedia mock 成 reduce（验证直出分支）与非 reduce 两态 */
const mockedReduce = vi.hoisted(() => ({ value: false }))
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
  matches: mockedReduce.value && q.includes('prefers-reduced-motion'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})))

import { buildTypewriterTimeline } from './useTypewriter'

describe('buildTypewriterTimeline', () => {
  beforeEach(() => { mockedReduce.value = false })
  afterEach(() => { gsap.globalTimeline.clear() })

  it('reduced-motion 时返回 null（调用方直达终态）', () => {
    mockedReduce.value = true
    const el = document.createElement('p')
    el.textContent = '你好世界'
    expect(buildTypewriterTimeline(el)).toBeNull()
  })

  it('timeline 推进后字符逐个揭示、onComplete 恢复 innerHTML', () => {
    const el = document.createElement('p')
    el.innerHTML = '普通的<em>强调</em>文本'
    const original = el.innerHTML
    const tl = buildTypewriterTimeline(el)!
    expect(tl).not.toBeNull()
    // 打字开始：内容清空
    expect(el.textContent).toBe('')
    // 推进到中段：字符数 > 0 且 < 全部
    tl.progress(0.5)
    const mid = el.textContent!.length
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan('普通的强调文本'.length)
    // 推进到终点：innerHTML 恢复（强调标记视觉回归）
    tl.progress(1)
    expect(el.innerHTML).toBe(original)
  })
})
```

- [ ] **Step 6: 跑测试确认失败**

Run: `pnpm test src/components/explore/useTypewriter.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 7: 实现 useTypewriter.ts**

```ts
import gsap from 'gsap'
import type {} from 'gsap/typeings' // 若该行报错删除——仅类型增强占位

/**
 * v3 打字机（spec §4.3）：对已渲染 DOM 的文本做 GSAP 逐字揭示。
 * - 读 textContent 切字符，timeline 内 tl.call 逐字符回写——与 mock-ui
 *   Typewriter 同款手法（GSAP core，无 TextPlugin）。
 * - 内联标记（strong/em…）：打字时只回写纯文本，onComplete 恢复原
 *   innerHTML——标记视觉一次性回归（样张 D 验证）。
 * - reduced-motion：返回 null，调用方跳过演出。
 * - SSG 安全：本函数只在 hydration 后被调用；SSG HTML 直出原文。
 */
export function buildTypewriterTimeline(
  el: HTMLElement,
  opts: { charMs?: number } = {},
): gsap.core.Timeline | null {
  const reduced =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return null

  const original = el.innerHTML
  const chars = Array.from(el.textContent ?? '')
  if (chars.length === 0) return null
  const charMs = opts.charMs ?? 28

  el.innerHTML = ''
  const tl = gsap.timeline()
  for (let i = 1; i <= chars.length; i++) {
    tl.call(() => {
      el.textContent = chars.slice(0, i).slice(-1)[0] === '\n' && i >= 2
        ? chars.slice(0, i).join('')
        : chars.slice(0, i).join('')
    }, undefined, i * charMs)
  }
  tl.call(() => { el.innerHTML = original }, undefined, chars.length * charMs + 60)
  return tl
}
```

（注意：上方 `tl.call` 内的三元是历史噪音——实现者请写成单一表达式 `el.textContent = chars.slice(0, i).join('')`；import 行只有 `import gsap from 'gsap'`，不要 typeings 那行。）

- [ ] **Step 8: 跑测试确认通过**

Run: `pnpm test src/components/explore/useTypewriter.test.ts`
Expected: PASS

- [ ] **Step 9: 全量闸门**

Run: `pnpm test && pnpm typecheck`
Expected: 全绿

- [ ] **Step 10: Commit**

```bash
git add src/lib/explore.ts src/lib/explore.test.ts src/components/explore/useTypewriter.ts src/components/explore/useTypewriter.test.ts
git commit -m "feat(explore): v3 幕序号中文数字 + GSAP 打字机 timeline 构建器"
```

---

### Task 2: Answer 分区渲染（theater 结构）

**Files:**
- Modify: `src/components/explore/Answer.tsx`（重构渲染结构）
- Test: `src/components/explore/Answer.test.tsx`（追加分区断言）

**Interfaces:**
- Consumes:
  - `ExploreConfig`（types.ts，v2 已有）
  - `toChineseOrdinal(n)`（Task 1）
  - `SceneClip` 组件（v2 已有）
- Produces:
  - DOM 结构契约（Task 3 CSS 与 Task 4 Post 依赖）：
    - `.theater`（原 `.answer-block` 改名沿用 id 锚点）
    - `.act-head > .act-no + h2/h3(提取的 heading)`
    - `.stage > .stage-tag + .stage-ch + .stage-inner(> SceneClip)`（仅有 SceneClip 的场景）
    - `.dialogue > .dlg-name + (children 非 SceneClip 非 heading 部分)`
    - `.choices`（v2 `.answer-exits` 改名，ExitChips 原样挂载）
  - 提取规则：children 数组中 `type === SceneClip` 的进 stage；**位于最前的 heading**（h2/h3）进 act-head；其余进 dialogue

- [ ] **Step 1: 写失败测试**

在 `src/components/explore/Answer.test.tsx` 追加（保留原 chips 测试）：

```tsx
describe('Answer v3 分区渲染', () => {
  const yaml = [
    'title: t',
    'entry: q-a',
    'scenes:',
    '  - id: q-a',
    '    label: 场景A',
    '    demo: demo-a',
    '    questions:',
    '      - { text: 去B, to: q-b }',
    '  - id: q-b',
    '    label: 场景B',
    '    demo: demo-b',
  ].join('\n')

  function makeConfig(raw: string) {
    // 与既有测试同款：parseExploreYaml(raw)；断言 ok
  }

  it('有 SceneClip 的场景：渲染 stage/act-no/dialogue/choices 四区', () => {
    // render <ExploreConfigContext.Provider value={cfg}><Answer id="q-a">
    //   <h2>标题</h2><SceneClip demo="demo-a" /><p>解说</p>
    // </Answer></...>
    // 断言：
    // container.querySelector('.theater#q-a') 存在
    // .act-head .act-no 文本 === '第一幕'
    // .act-head 内 h2 文本 === '标题'
    // .stage .stage-inner 内渲染了 [data-scene-clip-demo="demo-a"]
    // .stage .stage-ch 文本 === 'CH-01'
    // .dialogue 内含 '解说' 文本（p 进 dialogue）
    // .dialogue .dlg-name 文本含 '解 说'
    // .choices 存在且含 1 个 .choice（to q-b）
  })

  it('无 SceneClip 的场景：不渲染 .stage，其余三区照常', () => {
    // <Answer id="q-b"><p>纯文字</p></Answer>
    // 断言：无 .stage；.act-no === '第二幕'；.choices 不存在（yaml q-b 无 exits）
  })

  it('heading 不在最前：不提取到 act-head，留在 dialogue', () => {
    // <Answer id="q-a"><p>先一段</p><h3>小标题</h3></Answer>
    // 断言：.act-head 内无 h3；.dialogue 内含 h3 与 '先一段'
  })
})
```

（实现者按现有 Answer.test.tsx 的 mock 手法补齐 render/provider 样板；SceneClip 在测试里会 warn 无 demo，属预期。）

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/components/explore/Answer.test.tsx`
Expected: FAIL（.theater/.act-head 不存在——现渲染 .answer-block）

- [ ] **Step 3: 重构 Answer.tsx**

```tsx
import { createContext, useContext, type ReactNode, type createElement } from 'react'
import SceneClip from './SceneClip'
import ExitChips from './ExitChips'
import { toChineseOrdinal } from '../../lib/explore'
import type { ExploreConfig } from '../../lib/types'

export const ExploreConfigContext = createContext<ExploreConfig | null>(null)

/** v3 分区（spec §2.2）：children → heading(最前) / SceneClip / 其余 */
function partition(children: ReactNode) {
  const arr = Array.isArray(children) ? children : [children]
  const clips: ReactNode[] = []
  const rest: ReactNode[] = []
  let heading: ReactNode | null = null
  let headingTaken = false
  for (const child of arr) {
    if (child == null || child === false) continue
    const t = (child as { type?: unknown }).type
    if (t === SceneClip) { clips.push(child); continue }
    if (!headingTaken && typeof t === 'string' && (t === 'h2' || t === 'h3')) {
      heading = child; headingTaken = true; continue
    }
    rest.push(child)
  }
  return { heading, clips, rest }
}

export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  const config = useContext(ExploreConfigContext)
  const scene = config?.scenes.find((s) => s.id === id)
  const idx = config?.scenes.findIndex((s) => s.id === id) ?? -1
  const { heading, clips, rest } = partition(children)
  const hasExits = !!scene && (!!scene.features?.length || !!scene.questions?.length)

  return (
    <section className="theater answer-block" id={id}>
      {(heading || idx >= 0) && (
        <div className="act-head">
          {idx >= 0 && <span className="act-no">第{toChineseOrdinal(idx + 1)}幕</span>}
          {heading}
          <div className="act-rule" />
        </div>
        )}
      {clips.length > 0 && (
        <div className="stage">
          <span className="stage-tag">DEMO · {scene?.demo ?? '—'}</span>
          <span className="stage-ch">CH-{String(idx + 1).padStart(2, '0')}</span>
          <div className="stage-spot" />
          <div className="stage-inner">{clips}</div>
        </div>
      )}
      <div className="dialogue">
        <span className="dlg-name">解 说</span>
        {rest}
      </div>
      {hasExits && scene && config && (
        <div className="choices">
          <span className="choices-label">─ 選択肢 ─</span>
          <ExitChips group="features" exits={scene.features ?? []} config={config} />
          <ExitChips group="questions" exits={scene.questions ?? []} config={config} />
        </div>
      )}
    </section>
  )
}
```

（注意：`createElement` import 若未用到则删除；heading 提取只认 MDX 渲染出的标准元素。partition 不处理嵌套——MDX 里 heading/SceneClip 均为顶层。）

- [ ] **Step 4: 跑全量测试**

Run: `pnpm test`
Expected: 新用例 PASS；**v2 遗留的 `.answer-block` 断言若有失败**——同步把旧测试里的 `.answer-block` 查询改为 `.theater`（类名保留 `answer-block` 作过渡别名，双类名 `class="theater answer-block"`，测试查询用 `.theater`）。

- [ ] **Step 5: typecheck + validator**

Run: `pnpm typecheck && pnpm validate:explore`
Expected: 绿（validator 不受 DOM 结构影响）

- [ ] **Step 6: Commit**

```bash
git add src/components/explore/Answer.tsx src/components/explore/Answer.test.tsx
git commit -m "feat(explore): Answer v3 分区渲染——theater/act-head/stage/dialogue/choices"
```

---

### Task 3: CRT 剧场 CSS（.post-wrap--stage 作用域）

**Files:**
- Modify: `src/styles/global.css`（文件末尾追加整段；改 `.scene-toc` 断点）

**Interfaces:**
- Consumes: Task 2 的 DOM 契约（.theater/.act-head/.stage/.dialogue/.choices）
- Produces: 全部 v3 视觉（spec §3 token/CRT/文本窗/選択肢/扉页）

- [ ] **Step 1: 追加 v3 样式段**

在 `global.css` 末尾追加（从样张 `dist/mockup-v3-d.html` 移植，**作用域前缀 `.post-wrap--stage`**）：

```css
/* ===== v3 CRT 剧场（.post-wrap--stage 作用域；无 explore 文章零影响）===== */
.post-wrap--stage {
  --bg: #0B100E; --panel: #0F1512;
  --stext: #DCE5E1; --sdim: #8CA098; --sfaint: #56665F;
  --sline: rgba(220, 229, 225, 0.12);
  --sacc: #4CC2A3; --sacc-soft: rgba(76, 194, 163, 0.12);
  --smark: #E06A5A;
  max-width: 1120px;
  background: var(--bg);
  color: var(--stext);
}
.post-wrap--stage .post-meta, .post-wrap--stage > h1, .post-wrap--stage .post-excerpt,
.post-wrap--stage .post-nav { max-width: 860px; margin-left: auto; margin-right: auto; }
/* 扉页标题卡 */
.post-wrap--stage .post-meta { text-align: center; font: 12px var(--mono); letter-spacing: 0.42em; color: var(--sfaint); display: block; }
.post-wrap--stage .post-meta .tag, .post-wrap--stage .post-meta .anim-badge { display: none; }
.post-wrap--stage > h1 { text-align: center; font: 600 clamp(22px, 2.5vw, 30px)/1.9 var(--fang); letter-spacing: 0.1em; }
.post-wrap--stage .post-excerpt { border: 0; padding: 0; text-align: center; font: 12px var(--mono); color: var(--sfaint); letter-spacing: 0.14em; }
/* theater 面板 */
.post-wrap--stage .theater { background: var(--panel); border: 1px solid var(--sline); border-radius: 10px; padding: 32px 38px 28px; box-shadow: 0 24px 70px rgba(0,0,0,0.45); margin: 54px 0; }
.post-wrap--stage .act-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 26px; }
.post-wrap--stage .act-no { font: 700 14px var(--fang); letter-spacing: 0.48em; color: var(--sacc); white-space: nowrap; }
.post-wrap--stage .act-head h2, .post-wrap--stage .act-head h3 { font: 600 20px var(--fang); letter-spacing: 0.12em; margin: 0; color: var(--stext); border: 0; padding: 0; }
.post-wrap--stage .act-rule { flex: 1; height: 1px; background: var(--sline); }
/* CRT 舞台 */
.post-wrap--stage .stage { position: relative; border-radius: 14px; background: #060907; border: 1px solid rgba(220,229,225,0.08); box-shadow: 0 30px 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.75), inset 0 0 4px rgba(76,194,163,0.15); overflow: hidden; min-height: 420px; }
.post-wrap--stage .stage::before { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 3; background: radial-gradient(ellipse 130% 110% at 50% 45%, transparent 62%, rgba(0,0,0,0.55) 88%, rgba(0,0,0,0.9) 100%); }
.post-wrap--stage .stage::after { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 3; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px); mix-blend-mode: overlay; }
.post-wrap--stage .stage-spot { position: absolute; inset: 0; z-index: 1; background: radial-gradient(ellipse 60% 75% at 50% 32%, rgba(76,194,163,0.09), transparent 62%); }
.post-wrap--stage .stage-inner { position: relative; z-index: 2; width: 100%; display: flex; flex-direction: column; align-items: center; padding: 52px 40px 40px; }
.post-wrap--stage .stage-tag { position: absolute; top: 14px; left: 18px; font: 11px var(--mono); letter-spacing: 0.26em; color: var(--sfaint); z-index: 4; }
.post-wrap--stage .stage-ch { position: absolute; top: 14px; right: 18px; font: 11px var(--mono); letter-spacing: 0.2em; color: var(--sfaint); z-index: 4; }
.post-wrap--stage .stage .scene-clip { border: 0; min-height: 0; margin: 0; width: 100%; display: flex; flex-direction: column; align-items: center; }
.post-wrap--stage .stage .scene-replay { right: 14px; bottom: 14px; background: rgba(6,9,7,0.7); border-color: var(--sline); color: var(--sdim); z-index: 4; }
/* 文本窗 */
.post-wrap--stage .dialogue { position: relative; margin-top: 24px; border: 1px solid var(--sline); background: rgba(255,255,255,0.025); border-radius: 8px; padding: 27px 28px 20px; font-size: 15px; line-height: 2.05; }
.post-wrap--stage .dlg-name { position: absolute; top: 0; left: 22px; transform: translateY(-50%); background: var(--sacc); color: #0A100E; font: 700 12px var(--fang); letter-spacing: 0.42em; padding: 4px 13px 4px 17px; border-radius: 2px; }
.post-wrap--stage .dialogue p { color: var(--stext); }
.post-wrap--stage .dialogue strong { color: var(--sacc); font-weight: 600; }
.post-wrap--stage .dialogue blockquote { border-left: 2px solid var(--sacc); background: var(--sacc-soft); font-family: var(--fang); border-radius: 0 4px 4px 0; color: var(--stext); }
.post-wrap--stage .dialogue img { border-radius: 6px; }
.post-wrap--stage .dialogue code { background: rgba(76,194,163,0.12); color: var(--stext); }
.post-wrap--stage .dialogue table th { background: var(--panel); color: var(--stext); }
.post-wrap--stage .dialogue table td, .post-wrap--stage .dialogue table th { border-color: var(--sline); color: var(--stext); }
/* 選択肢 */
.post-wrap--stage .choices { margin-top: 28px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.post-wrap--stage .choices-label { font: 11px var(--mono); letter-spacing: 0.55em; color: var(--sfaint); margin-bottom: 4px; }
.post-wrap--stage .choices .exit-chips { flex-direction: column; align-items: center; margin: 0; }
.post-wrap--stage .choices .exit-chip { min-width: min(500px, 100%); text-align: left; padding: 11px 22px; border-width: 1px; border-radius: 4px; font: 14px var(--sans); letter-spacing: 0.03em; color: var(--stext); border-color: rgba(76,194,163,0.42); background: rgba(255,255,255,0.02); }
.post-wrap--stage .choices .exit-chip:hover { background: var(--sacc-soft); border-color: var(--sacc); }
.post-wrap--stage .choices .exit-chips-questions .exit-chip { border-style: dashed; border-color: rgba(140,160,152,0.38); color: var(--sdim); }
.post-wrap--stage .choices .exit-chips-questions .exit-chip:hover { color: var(--stext); border-color: var(--smark); }
/* 暗底下的 post-body 映射 */
.post-wrap--stage .post-body { color: var(--stext); }
/* 移动端（<920px）：theater padding 收紧 */
@media (max-width: 920px) {
  .post-wrap--stage { padding: 40px 20px 48px; }
  .post-wrap--stage .theater { padding: 24px 20px 22px; }
  .post-wrap--stage .stage-inner { padding: 40px 16px 32px; }
}
```

- [ ] **Step 2: 改 .scene-toc 断点 920→1400**

把现有：

```css
.scene-toc { position:fixed; right:20px; top:120px; width:200px; ... }
...
@media (max-width:920px) { .scene-toc { display:none; } ... }
```

改为：

```css
.scene-toc { position:fixed; right:20px; top:120px; width:176px; ... }  /* width 200→176 */
@media (max-width:1400px) { .scene-toc { display:none; } }
.scene-toc-mobile { ... }  /* 原 920px 媒体查询里的 mobile 显示规则移到 1400px 查询内 */
```

（移动端 details 折叠的显示逻辑跟着断点走：`@media (max-width:1400px)` 时隐藏桌面 toc、显示 mobile details。）

- [ ] **Step 3: 手测无回归**

Run: `pnpm build && npx vite preview --port 4188 &`
Playwright 检查：
1. `http://localhost:4188/blog/kill-password/`（无 explore 文章）视觉与改造前一致（浅色 720px）
2. `http://localhost:4188/blog/ai-digital-employee/` 探索页变暗色 theater 版式

- [ ] **Step 4: 全量闸门**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(explore): v3 CRT 剧场样式段（.post-wrap--stage 作用域）+ 目录断点 1400px"
```

---

### Task 4: Post.tsx 接线（stage 类 + 扉页标题卡）

**Files:**
- Modify: `src/pages/Post.tsx:62-91`
- Test: `src/pages/Post.test.tsx`

**Interfaces:**
- Consumes: Task 3 的 `.post-wrap--stage` CSS；`ExploreConfig | null`（已有）
- Produces: 探索文章 `<main class="post-wrap post-wrap--stage">`；无 explore 文章保持 `<main class="post-wrap">`

- [ ] **Step 1: 写失败测试**

在 `Post.test.tsx` 追加：

```tsx
it('有 explore.yaml 的文章：main 有 post-wrap--stage 类', () => {
  // render /blog/ai-digital-employee/（沿用现有 mock 手法）
  // 断言 container.querySelector('main.post-wrap--stage') 存在
})
it('无 explore.yaml 的文章：main 无 post-wrap--stage 类', () => {
  // render /blog/kill-password/
  // 断言 container.querySelector('main.post-wrap--stage') 为 null
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/pages/Post.test.tsx`
Expected: FAIL（类不存在）

- [ ] **Step 3: 改 Post.tsx**

`<main>` 行改为条件类：

```tsx
<main className={exploreConfig ? 'post-wrap post-wrap--stage' : 'post-wrap'} data-article-slug={post.slug}>
```

扉页标题卡（meta/h1/excerpt 区）在 exploreConfig 存在时加 `title-card` 包裹类（CSS 已按 .post-wrap--stage 作用域处理，无需条件结构——**仅当 CSS 需要不同 DOM 时才加**；Task 3 的 CSS 已用现有 DOM 可实现，故 DOM 不变，本步只改 className 一行）。

- [ ] **Step 4: 跑测试确认通过 + 全量闸门**

Run: `pnpm test && pnpm typecheck`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add src/pages/Post.tsx src/pages/Post.test.tsx
git commit -m "feat(explore): Post 页接线 post-wrap--stage 类"
```

---

### Task 5: 演出接线（IO 错峰 + 打字机 + 選択肢浮现）

**Files:**
- Modify: `src/components/explore/Answer.tsx`（加 IO 演出）
- Modify: `src/components/explore/ExitChips.tsx`（前缀字符 ▸/？）
- Test: `src/components/explore/Answer.test.tsx`（追加演出断言）

**Interfaces:**
- Consumes: `buildTypewriterTimeline`（Task 1）
- Produces: spec §4 全部演出行为

- [ ] **Step 1: 写失败测试**

在 Answer.test.tsx 追加：

```tsx
describe('Answer v3 演出', () => {
  it('打字机/reduced-motion：reduce 下不建 timeline、段落直接显示', () => {
    // mock matchMedia reduce=true
    // render Answer（含 <p>文本</p>）
    // 断言 p 的 textContent 保持 '文本'（未被清空）
  })
  it('ExitChips 前缀：features 渲染 ▸、questions 渲染 ？', () => {
    // 断言 .exit-chip 内含 '▸' 与 '？' 前缀 span
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/components/explore/Answer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Answer 接 IO 演出**

Answer.tsx 的 dialogue 容器挂 ref，useEffect（浏览器 only）：

```tsx
useEffect(() => {
  const dlg = dialogueRef.current
  if (!dlg || typeof IntersectionObserver === 'undefined') return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return  // reduced-motion：不演出，内容原样可见

  const paras = Array.from(dlg.querySelectorAll(':scope > p, :scope > blockquote'))
  if (paras.length === 0) return

  let tlChain: gsap.core.Timeline | null = null
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      io.disconnect()
      // 逐段链式打字：前一段 onComplete 触发下一段
      let prev: gsap.core.Timeline | null = null
      for (const p of paras) {
        const tl = buildTypewriterTimeline(p as HTMLElement)
        if (!tl) continue
        if (prev) prev.eventCallback('onComplete', () => tl.play())
        else tlChain = tl
        prev = tl
      }
      tlChain?.play()
    }
  }, { threshold: 0.4 })
  io.observe(dlg)
  return () => { io.disconnect(); tlChain?.kill() }
}, [])
```

**SSG 安全（关键）**：打字机启动的瞬间才清空段落（`buildTypewriterTimeline` 内 `el.innerHTML = ''`）——**不在渲染期隐藏段落**。滚动极快时用户可能看到原文闪现后重打，可接受（样张 D 同款行为）。

choices 浮现：容器 ref + IO（threshold 0.5），进入后 GSAP：

```tsx
const tl = gsap.timeline()
tl.fromTo(choicesEl.querySelectorAll('.exit-chip'),
  { opacity: 0, y: 8 },
  { opacity: 1, y: 0, duration: 0.4, stagger: 0.18, ease: 'power2.out' })
```

（`fromTo` 保证 SSG 直出可见 → hydration 后演出时才隐藏→浮现；无 JS 时 choices 完整可见。）

act-head 同理 IO + fade（`fromTo` 模式，threshold 0.5, duration 0.4）。

- [ ] **Step 4: ExitChips 前缀字符**

ExitChips.tsx 的 chip 渲染处加前缀：

```tsx
<span className="chip-prefix" aria-hidden="true">{group === 'features' ? '▸' : '？'}</span>
```

（group prop 已存在；CSS `.chip-prefix` 右距 12px、mono 字体——Task 3 CSS 段落补两行 `.post-wrap--stage .chip-prefix { ... }`。）

- [ ] **Step 5: 全量闸门 + 构建手测**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore && pnpm build`
Playwright 验证（vite preview 4188）：
1. 滚动到场景 2：解说打字机逐字播放、前段完成后下段开始
2. 滚回顶部再下来：已打过的段落不重播（IO unobserve）
3. 選択肢依次浮现
4. `#entry` 直达（首页悬念按钮）：落地场景正常触发演出
5. reduced-motion（Playwright emulateMedia）：全部内容直出无动画

- [ ] **Step 6: Commit**

```bash
git add src/components/explore/Answer.tsx src/components/explore/Answer.test.tsx src/components/explore/ExitChips.tsx src/styles/global.css
git commit -m "feat(explore): v3 演出接线——IO 错峰打字机 + 選択肢浮现 + 前缀字符"
```

---

### Task 6: 回归 + 文档收尾

**Files:**
- Verify: 全部
- Modify: `docs/superpowers/specs/2026-08-29-explore-view-design-v3.md`（状态行）

- [ ] **Step 1: 全量闸门**

Run: `pnpm test && pnpm typecheck && pnpm validate:explore && pnpm build`
Expected: 全绿；build 9 页无 explore 子路由

- [ ] **Step 2: Playwright 全页面手测清单**

1. 无 explore 文章（kill-password）：浅色 720px 版式零变化
2. ai-digital-employee：CRT 舞台 + 打字机 + 選択肢 + 幕序号 + CH 角标
3. ai-it-system：单场景同样式正常
4. 目录断点：1440px 显示 fixed 目录 / 1280px 隐藏 / 移动 390px details 折叠
5. 锚点直达 + 前进后退 + 跨文章 chips
6. reduced-motion 直出

- [ ] **Step 3: spec 状态行更新 + Commit**

```bash
git add docs/superpowers/specs/2026-08-29-explore-view-design-v3.md
git commit -m "docs(explore): v3 spec 状态更新（已实施）"
```
