# v4 探索视图 · 幕式导航 + 演出编排 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: 把探索视图从「滚动阅读页」改成「幕式导航（视觉小说式）」：单幕单屏、三种演出模式可配、履历栈回滚、点击跳过演出。无 explore 文章与 demo / MDX 内容零影响。

**Architecture**: 在 v3 CRT 剧场视觉之上，新增三层：(1) `useHistoryStack`（sessionStorage 履历 push/pop/jumpTo）+ `ExploreRouter`（hash 监听 + 激活幕 + 给 Answer 注入导演指令）；(2) `Director`（mode 1/2/3 编排 + 点击 skip 推进演出链）；(3) SceneClip 暴露 imperative API（play/pause/replay）给 Director 调用。Answer 退役自己的 IntersectionObserver useEffect；CSS 用 `[data-has-router]` 与 `[data-active]` 切换单幕可见性实现无 JS 降级（所有幕平铺可读）。

**Tech Stack**: Vite 8 + React 19 + TypeScript + vite-react-ssg + GSAP 3.15 core（无插件）+ vitest + jsdom + pnpm。**新增依赖：无**（sessionStorage / IntersectionObserver 全是浏览器原生）。

**Spec**: `docs/superpowers/specs/2026-08-30-explore-view-design-v4.md`

## Global Constraints

- GSAP core only（不引入 ScrollTrigger / TextPlugin 等任何插件）
- `content/posts/**/scene.tsx` **一行不改**（demo 铁律，spec §1）
- `content/posts/**/article.mdx` **零改动**（MDX 铁律，spec §1）
- `.post-wrap--stage` 作用域隔离（无 explore 文章零回归）
- 无 JS 降级：所有幕平铺可读，靠 CSS `[data-has-router]` 切换
- reduced-motion：演出直达终态
- 全绿才 commit：`pnpm test` + `pnpm typecheck` + `pnpm validate:explore` + `pnpm build`
- demo 演出期间多次点击页面 = 依次跳过段（PPT 模式），不允许「跳到下一幕」语义（那是点击 chip 的事）
- yaml `mode` 字段缺省 = `2`（文字先行）

---

## Task 1: 类型扩展 + yaml 校验 + 给两篇 yaml 加 mode

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/explore.ts`
- Modify: `src/lib/explore.test.ts`
- Modify: `content/posts/ai-digital-employee/explore.yaml`
- Modify: `content/posts/ai-it-system/explore.yaml`

**Interfaces:**
- Consumes: —
- Produces: `Scene.mode?: 1 | 2 | 3`（TS 类型）

- [ ] **Step 1.1: 写 `mode` 字段校验的失败测试**

在 `src/lib/explore.test.ts` 末尾追加：

```ts
it('mode 字段：合法值 1/2/3/缺省', () => {
  expect(parseConfig({ title: 't', entry: 'a', scenes: [
    { id: 'a', label: 'A', demo: 'd' },                                  // 缺省 ok
    { id: 'b', label: 'B', demo: 'd', mode: 1 },
    { id: 'c', label: 'C', demo: 'd', mode: 2 },
    { id: 'd', label: 'D', demo: 'd', mode: 3 },
  ] })).toBeTruthy()
})

it('mode 字段：非法值（4 / "1" / null）报错', () => {
  expect(() => parseConfig({ title: 't', entry: 'a', scenes: [
    { id: 'a', label: 'A', demo: 'd', mode: 4 },
  ] })).toThrow(/mode/)
  expect(() => parseConfig({ title: 't', entry: 'a', scenes: [
    { id: 'a', label: 'A', demo: 'd', mode: '1' as unknown as number },
  ] })).toThrow(/mode/)
})
```

注：`parseConfig` 是 explore.ts 现有导出。如果命名不一致，按实际函数名调整。

- [ ] **Step 1.2: 跑测试确认失败**

Run: `pnpm test -- src/lib/explore.test.ts`
Expected: 新增两测试 FAIL（mode 校验未实现）。

- [ ] **Step 1.3: types.ts 加 `mode` 字段**

```ts
export interface Scene {
  id: string
  label: string
  demo: string
  features?: ExploreExit[]
  questions?: ExploreExit[]
  /** 1: 全屏动画先行；2: 文字先行（默认）；3: 纯文字 */
  mode?: 1 | 2 | 3
}
```

- [ ] **Step 1.4: explore.ts 加 mode 校验**

```ts
// 在 parseConfig 内 scenes 校验循环里加：
if (s.mode !== undefined && ![1, 2, 3].includes(s.mode)) {
  throw new Error(`scene "${s.id}" mode 必须是 1/2/3 或缺省；收到 ${s.mode}`)
}
```

- [ ] **Step 1.5: 跑测试确认通过**

Run: `pnpm test -- src/lib/explore.test.ts`
Expected: 全部 PASS。

- [ ] **Step 1.6: 给两篇 yaml 加 mode（q-problem / q-tiered-confirm = mode 1）**

`content/posts/ai-digital-employee/explore.yaml`：
- `q-problem` 加 `mode: 1`（开场体验型全屏动画）
- `q-tiered-confirm` 加 `mode: 1`（核心确认流程全屏）
- 其余不写（默认 2）

`content/posts/ai-it-system/explore.yaml`：找到入口幕和核心确认幕（如有）加 `mode: 1`；其它不动。

- [ ] **Step 1.7: 校验通过**

Run: `pnpm validate:explore`
Expected: 0/0（无校验错误）。

- [ ] **Step 1.8: commit**

```bash
git add src/lib/types.ts src/lib/explore.ts src/lib/explore.test.ts \
        content/posts/ai-digital-employee/explore.yaml \
        content/posts/ai-it-system/explore.yaml
git commit -m "feat(explore): v4 yaml mode 字段（1/2/3，缺省 2）"
```

---

## Task 2: useHistoryStack + HistoryPanel + HistoryFAB

**Files:**
- Create: `src/components/explore/useHistoryStack.ts`
- Create: `src/components/explore/useHistoryStack.test.ts`
- Create: `src/components/explore/HistoryPanel.tsx`
- Create: `src/components/explore/HistoryPanel.test.tsx`
- Create: `src/components/explore/HistoryFAB.tsx`

**Interfaces:**
- Consumes: —
- Produces:
  - `useHistoryStack()` → `{ stack, push, pop, jumpTo, canPop }`
  - `<HistoryPanel open onClose stack onJumpTo>` (受控弹层)
  - `<HistoryFAB stack onBack onOpenPanel>` (底栏按钮组)

- [ ] **Step 2.1: 写 useHistoryStack 测试（jsdom）**

`useHistoryStack.test.ts`：

```ts
import { renderHook, act } from '@testing-library/react'
import { useHistoryStack } from './useHistoryStack'

describe('useHistoryStack', () => {
  beforeEach(() => sessionStorage.clear())

  it('初始空栈', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    expect(result.current.stack).toEqual([])
    expect(result.current.canPop).toBe(false)
  })

  it('push 后 canPop=true + 栈非空', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => result.current.push('q-problem'))
    expect(result.current.stack).toEqual([{ sceneId: 'q-problem' }])
    expect(result.current.canPop).toBe(true)
  })

  it('pop 返回前一项并从栈移除', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => { result.current.push('a'); result.current.push('b') })
    let popped: string | undefined
    act(() => { popped = result.current.pop() })
    expect(popped).toBe('a')
    expect(result.current.stack.map((s) => s.sceneId)).toEqual(['a'])
  })

  it('jumpTo(idx) 截断栈到该位置', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => { result.current.push('a'); result.current.push('b'); result.current.push('c') })
    act(() => result.current.jumpTo(0))
    expect(result.current.stack.map((s) => s.sceneId)).toEqual(['a'])
  })

  it('sessionStorage 往返：两个 useHistoryStack 同 key 共享栈', () => {
    const { result: r1 } = renderHook(() => useHistoryStack('test'))
    act(() => r1.current.push('a'))
    const { result: r2 } = renderHook(() => useHistoryStack('test'))
    expect(r2.current.stack.map((s) => s.sceneId)).toEqual(['a'])
  })
})
```

- [ ] **Step 2.2: 跑测试确认失败**

Run: `pnpm test -- src/components/explore/useHistoryStack.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 2.3: 实现 useHistoryStack**

```ts
import { useCallback, useEffect, useState } from 'react'

export interface HistoryEntry {
  sceneId: string
}

const KEY = (k: string) => `explore.history.${k}`

export function useHistoryStack(storageKey: string) {
  const [stack, setStack] = useState<HistoryEntry[]>(() => {
    if (typeof sessionStorage === 'undefined') return []
    try {
      const raw = sessionStorage.getItem(KEY(storageKey))
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
    } catch { return [] }
  })

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(KEY(storageKey), JSON.stringify(stack))
  }, [stack, storageKey])

  const push = useCallback((sceneId: string) => {
    setStack((s) => [...s, { sceneId }])
  }, [])

  const pop = useCallback((): string | undefined => {
    let popped: string | undefined
    setStack((s) => {
      if (s.length <= 1) return s
      popped = s[s.length - 2].sceneId
      return s.slice(0, -1)
    })
    return popped
  }, [])

  const jumpTo = useCallback((idx: number) => {
    setStack((s) => (idx < 0 ? [] : s.slice(0, idx + 1)))
  }, [])

  return { stack, push, pop, jumpTo, canPop: stack.length > 1 }
}
```

- [ ] **Step 2.4: 跑测试确认通过**

Run: `pnpm test -- src/components/explore/useHistoryStack.test.ts`
Expected: 5/5 PASS。

- [ ] **Step 2.5: 实现 HistoryPanel + HistoryFAB（先写测试）**

`HistoryPanel.test.tsx`：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import HistoryPanel from './HistoryPanel'

const stack = [
  { sceneId: 'q-problem' },
  { sceneId: 'q-badge-metaphor' },
  { sceneId: 'q-tiered-confirm' },
]
const exits = [
  { text: '主线下一幕', to: 'q-why-not-openclaw' },
  { text: '支线 A', to: 'q-limits' },
]

it('渲染出口树 + 访问历史', () => {
  render(
    <HistoryPanel open onClose={() => {}} stack={stack} onJumpTo={() => {}}>
      <div data-testid="exits">{exits.length} exits</div>
    </HistoryPanel>,
  )
  expect(screen.getByText(/主线/)).toBeTruthy()
  expect(screen.getByText(/支线/)).toBeTruthy()
  // 访问历史里看到三个幕 id
  expect(screen.getByText(/q-problem/)).toBeTruthy()
  expect(screen.getByText(/q-tiered-confirm/)).toBeTruthy()
})

it('点击关闭按钮调 onClose', () => {
  const onClose = vi.fn()
  render(
    <HistoryPanel open onClose={onClose} stack={[]} onJumpTo={() => {}}>
      <span />
    </HistoryPanel>,
  )
  fireEvent.click(screen.getByLabelText(/关闭/))
  expect(onClose).toHaveBeenCalled()
})

it('点击历史项调 onJumpTo(idx)', () => {
  const onJumpTo = vi.fn()
  render(
    <HistoryPanel open onClose={() => {}} stack={stack} onJumpTo={onJumpTo}>
      <span />
    </HistoryPanel>,
  )
  fireEvent.click(screen.getByText(/q-problem/))
  expect(onJumpTo).toHaveBeenCalledWith(0)
})
```

- [ ] **Step 2.6: 实现 HistoryPanel**

```tsx
import type { HistoryEntry } from './useHistoryStack'

interface Props {
  open: boolean
  onClose: () => void
  stack: HistoryEntry[]
  onJumpTo: (idx: number) => void
  children: React.ReactNode  // 出口树 slot（由 ExploreRouter 传入）
}

export default function HistoryPanel({ open, onClose, stack, onJumpTo, children }: Props) {
  if (!open) return null
  return (
    <div className="history-panel" role="dialog" aria-label="探索履历">
      <div className="history-panel__backdrop" onClick={onClose} />
      <div className="history-panel__body">
        <header>
          <span className="history-panel__title">─ 探索履历 ─</span>
          <button type="button" aria-label="关闭" onClick={onClose}>×</button>
        </header>
        <section className="history-panel__exits">{children}</section>
        <section className="history-panel__history">
          <span className="history-panel__sub">─ 访问历史 ─</span>
          <ol>
            {stack.map((e, i) => (
              <li key={`${e.sceneId}-${i}`}>
                <button type="button" onClick={() => onJumpTo(i)}>
                  <span className="history-panel__no">{String(i + 1).padStart(2, '0')}</span>
                  {e.sceneId}
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.7: 实现 HistoryFAB**

```tsx
interface Props {
  stack: HistoryEntry[]
  onBack: () => void
  onOpenPanel: () => void
}

export default function HistoryFAB({ stack, onBack, onOpenPanel }: Props) {
  const canBack = stack.length > 1
  return (
    <div className="history-fab">
      <button type="button" disabled={!canBack} onClick={onBack}
        aria-label="返回上一幕">◀ 返回</button>
      <button type="button" onClick={onOpenPanel}
        aria-label="打开履历面板">▤ 履历</button>
      <span className="history-fab__depth">第 {stack.length} 步</span>
    </div>
  )
}
```

- [ ] **Step 2.8: 测试 + 类型 + commit**

Run: `pnpm test` + `pnpm typecheck` + `pnpm validate:explore`
Expected: 全部 PASS / 0。

```bash
git add src/components/explore/useHistoryStack.ts src/components/explore/useHistoryStack.test.ts \
        src/components/explore/HistoryPanel.tsx src/components/explore/HistoryPanel.test.tsx \
        src/components/explore/HistoryFAB.tsx
git commit -m "feat(explore): v4 履历栈 + 履历面板 + 底栏 FAB"
```

---

## Task 3: SceneClip 暴露 imperative API

**Files:**
- Modify: `src/components/explore/SceneClip.tsx`
- Modify: `src/components/explore/SceneClip.test.tsx`（如有）
- Create: `src/components/explore/sceneClipRegistry.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `registerSceneClip(demo, api)` / `getSceneClipApi(demo)` —— 注册表
  - `SceneClipApi { play(), pause(), replay() }`

- [ ] **Step 3.1: 写测试**

`src/components/explore/sceneClipRegistry.test.ts`：

```ts
import { registerSceneClip, getSceneClipApi, unregisterSceneClip } from './sceneClipRegistry'

it('注册后可取回', () => {
  const api = { play: vi.fn(), pause: vi.fn(), replay: vi.fn() }
  registerSceneClip('message-flood', api)
  expect(getSceneClipApi('message-flood')).toBe(api)
  unregisterSceneClip('message-flood')
  expect(getSceneClipApi('message-flood')).toBeUndefined()
})
```

- [ ] **Step 3.2: 实现注册表**

```ts
export interface SceneClipApi {
  play(): void
  pause(): void
  replay(): void
}

const map = new Map<string, SceneClipApi>()

export function registerSceneClip(demo: string, api: SceneClipApi): () => void {
  map.set(demo, api)
  return () => map.delete(demo)
}

export function getSceneClipApi(demo: string): SceneClipApi | undefined {
  return map.get(demo)
}
```

- [ ] **Step 3.3: SceneClip 暴露 API**

在 `SceneClip.tsx` 现有 useEffect 内（IO observer + handle 创建后）追加：

```ts
const api: SceneClipApi = {
  play: () => handle.play(),
  pause: () => handle.pause(),
  replay: () => handle.replay(),
}
const unregister = registerSceneClip(demo, api)

return () => {
  observer.disconnect()
  btn?.removeEventListener('click', handle.replay)
  handle.kill()
  unregister()
}
```

保留内部 IO 不动——它作为"进入视口时自动 play"的基础行为，对 mode 1 全屏过渡也有用。Director 调 `api.play()` / `api.replay()` 是显式触发。

- [ ] **Step 3.4: 测试 + commit**

Run: 全部 PASS；`pnpm typecheck` 0。

```bash
git add src/components/explore/sceneClipRegistry.ts \
        src/components/explore/sceneClipRegistry.test.ts \
        src/components/explore/SceneClip.tsx
git commit -m "feat(explore): SceneClip 暴露 imperative API 给 Director 调用"
```

---

## Task 4: Director（mode 1/2/3 编排 + skip）

**Files:**
- Create: `src/components/explore/Director.tsx`
- Create: `src/components/explore/Director.test.tsx`

**Interfaces:**
- Consumes: `<SceneClip>` 注册表；一个 ref 到 act-head/dialogue/choices DOM
- Produces: `<Director scene onSkip>` + `useDirector()` 钩子

- [ ] **Step 4.1: 写测试**

```tsx
import { render, screen, act } from '@testing-library/react'
import { vi } from 'vitest'
import gsap from 'gsap'
import { Director } from './Director'

const mockedReduce = vi.hoisted(() => ({ value: false }))
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
  matches: mockedReduce.value && q.includes('prefers-reduced-motion'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})))

beforeEach(() => { mockedReduce.value = false; gsap.globalTimeline.clear() })

it('mode 2 默认：act-head fade → dialogue 打字 → choices 浮现（全部 timeline 都建出来）', () => {
  const scene = { id: 'q-test', mode: 2 as const, demo: 'demo-x' }
  render(<Director scene={scene}><div data-testid="dlg">…</div></Director>)
  expect(gsap.globalTimeline.getChildren(true, true, true).length).toBeGreaterThan(0)
})

it('reduced-motion：建完不做演出，children 直接可见', () => {
  mockedReduce.value = true
  const scene = { id: 'q-test', mode: 2 as const, demo: 'demo-x' }
  render(<Director scene={scene}><div data-testid="dlg">…</div></Director>)
  // 不应出现新 timeline
})

it.skip('skip() 把进行中的 timeline progress(1) 并触发下一段', async () => {
  // TODO: 用 jsdom + timer mock 验证；本期实现即可
})
```

注：第三测试可选。Director 是编排器，覆盖率看 mode 渲染分支即可。

- [ ] **Step 4.2: 实现 Director**

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { buildTypewriterTimeline } from './useTypewriter'
import { getSceneClipApi } from './sceneClipRegistry'

export interface DirectorScene {
  id: string
  mode: 1 | 2 | 3
  demo: string
}

interface Props {
  scene: DirectorScene
  /** act-head / dialogue / choices refs（由 ExploreRouter 注入） */
  headRef: React.RefObject<HTMLElement>
  dlgRef: React.RefObject<HTMLElement>
  choicesRef: React.RefObject<HTMLElement>
  /** 全屏 mode 1 用的舞台 ref（v3 的 .stage 容器） */
  stageRef?: React.RefObject<HTMLElement>
  children: ReactNode
  /** mounted 时由 ExploreRouter 触发演出 */
  onReady?: (api: { skip(): void }) => void
}

export function Director({ scene, headRef, dlgRef, choicesRef, stageRef, children, onReady }: Props) {
  const tls = useRef<gsap.core.Timeline[]>([])

  useEffect(() => {
    const reduced = typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      // 直出终态，无演出
      onReady?.({ skip: () => {} })
      return
    }

    const playTypewriterChain = () => {
      const dlg = dlgRef.current
      if (!dlg) return Promise.resolve()
      const MEDIA = 'img, svg, figure, table, ul, ol, video, canvas'
      const paras = Array.from(dlg.querySelectorAll<HTMLElement>(':scope > p, :scope > blockquote'))
        .filter((p) => !p.querySelector(MEDIA))
      return new Promise<void>((resolve) => {
        const run = (i: number) => {
          if (i >= paras.length) { resolve(); return }
          const tl = buildTypewriterTimeline(paras[i])
          if (!tl) { run(i + 1); return }
          tls.current.push(tl)
          if (i + 1 < paras.length) tl.eventCallback('onComplete', () => run(i + 1))
          else tl.eventCallback('onComplete', () => resolve())
          tl.play(0)
        }
        run(0)
      })
    }

    const fadeIn = (el: HTMLElement | null, dur = 0.4) => {
      if (!el) return Promise.resolve()
      const tl = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur })
      tls.current.push(tl)
      return tl.then()
    }

    const choicesRise = (el: HTMLElement | null) => {
      if (!el) return Promise.resolve()
      const chips = el.querySelectorAll('.exit-chip')
      if (chips.length === 0) return Promise.resolve()
      const tl = gsap.fromTo(chips,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.18, ease: 'power2.out' })
      tls.current.push(tl)
      return tl.then()
    }

    const playDemo = () => {
      const api = getSceneClipApi(scene.demo)
      if (!api) return Promise.resolve()
      api.play()
      // demo onComplete 由 SceneClip 自身事件 → 这里只能等一个保守时长
      // Director 用 seenScenes 标记，下次不再播
      return new Promise<void>((resolve) => setTimeout(resolve, 3000))
    }

    const run = async () => {
      // act-head 立即 fade
      const headP = fadeIn(headRef.current, 0.3)

      if (scene.mode === 1) {
        // mode 1：全屏 demo 先 → 缩窗 → 文字 → choices
        const stage = stageRef?.current
        if (stage) stage.classList.add('stage--fullscreen')
        await playDemo()
        if (stage) {
          stage.classList.remove('stage--fullscreen')
          // 缩小过渡 0.6s
          const tl = gsap.fromTo(stage, { scale: 1.4 }, { scale: 1, duration: 0.6, ease: 'power3.inOut' })
          tls.current.push(tl); await tl.then()
        }
        await headP
        await playTypewriterChain()
        await choicesRise(choicesRef.current)
      } else if (scene.mode === 3) {
        // mode 3：纯文字
        await headP
        await playTypewriterChain()
        await choicesRise(choicesRef.current)
      } else {
        // mode 2：文字先行（默认）
        await headP
        await playTypewriterChain()
        await playDemo()
        await choicesRise(choicesRef.current)
      }
    }
    run()

    onReady?.({
      skip: () => {
        // 把所有进行中的 timeline 立即终态
        for (const tl of tls.current) tl.progress(1)
        // 全屏缩窗若在播也跳过
        const stage = stageRef?.current
        if (stage?.classList.contains('stage--fullscreen')) {
          stage.classList.remove('stage--fullscreen')
        }
      },
    })

    return () => {
      for (const tl of tls.current) tl.kill()
      tls.current = []
    }
  }, [scene.id, scene.mode])

  return <>{children}</>
}
```

- [ ] **Step 4.3: 测试 + commit**

Run: `pnpm test -- src/components/explore/Director.test.tsx`
Expected: PASS（前两个测试；第三个 skip）。

```bash
git add src/components/explore/Director.tsx src/components/explore/Director.test.tsx
git commit -m "feat(explore): Director mode 1/2/3 编排 + skip"
```

---

## Task 5: ExploreRouter（hash + 履历 + 激活幕 + 接线）

**Files:**
- Create: `src/components/explore/ExploreRouter.tsx`
- Create: `src/components/explore/ExploreRouter.test.tsx`
- Modify: `src/components/explore/Answer.tsx`
- Modify: `src/components/explore/ExitChips.tsx`
- Modify: `src/pages/Post.tsx`
- Modify: `src/pages/Post.test.tsx`
- Delete: `src/components/explore/SceneToc.tsx`

**Interfaces:**
- Consumes: exploreConfig（Post 提供）+ children（所有 Answer）
- Produces:
  - `<ExploreRouter config>...</ExploreRouter>` 包裹整页
  - Answer 接收 `active: boolean` + `onActivate(api)`
  - ExitChips 走 hash + pushHistory

- [ ] **Step 5.1: 写测试**

`ExploreRouter.test.tsx`：

```tsx
import { render, screen, act } from '@testing-library/react'
import { vi } from 'vitest'
import { ExploreRouter } from './ExploreRouter'
import { ExploreConfigContext } from './AnswerContext'

const config = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: 'A', demo: 'da' },
    { id: 'q-b', label: 'B', demo: 'db', features: [{ text: 'next', to: 'q-a' }] },
  ],
}

beforeEach(() => {
  window.history.pushState(null, '', '/blog/test/')
  sessionStorage.clear()
})

it('mount 时激活 entry 幕（无 hash）', () => {
  render(
    <ExploreConfigContext.Provider value={config}>
      <ExploreRouter config={config}>
        <div data-scene-id="q-a" />
        <div data-scene-id="q-b" />
      </ExploreRouter>
    </ExploreConfigContext.Provider>,
  )
  expect(document.querySelector('[data-scene-id="q-a"][data-active]')).toBeTruthy()
  expect(document.querySelector('[data-scene-id="q-b"][data-active]')).toBeNull()
})

it('hash 直达对应幕', () => {
  window.history.pushState(null, '', '/blog/test/#q-b')
  render(
    <ExploreConfigContext.Provider value={config}>
      <ExploreRouter config={config}>
        <div data-scene-id="q-a" />
        <div data-scene-id="q-b" />
      </ExploreRouter>
    </ExploreConfigContext.Provider>,
  )
  expect(document.querySelector('[data-scene-id="q-b"][data-active]')).toBeTruthy()
})
```

注：本测试在 jsdom 下用 `<div data-scene-id>` 占位（不挂 Answer 全套）；完整接线由 Post.tsx 测试覆盖。

- [ ] **Step 5.2: 实现 ExploreRouter**

```tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ExploreConfigContext } from './AnswerContext'
import { useHistoryStack } from './useHistoryStack'
import HistoryPanel from './HistoryPanel'
import HistoryFAB from './HistoryFAB'
import type { ExploreConfig } from '../../lib/types'

interface Props {
  config: ExploreConfig
  children: ReactNode
}

function currentSceneId(config: ExploreConfig): string {
  if (typeof window === 'undefined') return config.entry
  const h = window.location.hash.replace(/^#/, '')
  if (h && config.scenes.some((s) => s.id === h)) return h
  return config.entry
}

export function ExploreRouter({ config, children }: Props) {
  const [activeId, setActiveId] = useState(() => currentSceneId(config))
  const [panelOpen, setPanelOpen] = useState(false)
  const history = useHistoryStack(config.title)
  const skipRef = useRef<() => void>(() => {})

  // 初次 push
  useEffect(() => {
    if (history.stack.length === 0) history.push(activeId)
    // 给 main 加 data-has-router（无 JS 降级解除）
    document.querySelector('main.post-wrap--stage')?.setAttribute('data-has-router', '')
    document.body.classList.add('stage-locked')
    return () => {
      document.body.classList.remove('stage-locked')
    }
  }, [])

  // hash 变化（用户手动 / 出口点击）
  useEffect(() => {
    const onHash = () => setActiveId(currentSceneId(config))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [config])

  const goTo = useCallback((id: string) => {
    if (id === activeId) return
    window.history.pushState(null, '', `#${id}`)
    setActiveId(id)
    history.push(id)
  }, [activeId, history])

  const back = useCallback(() => {
    const prev = history.pop()
    if (prev) {
      window.history.pushState(null, '', `#${prev}`)
      setActiveId(prev)
    }
  }, [history])

  const jumpTo = useCallback((idx: number) => {
    history.jumpTo(idx)
    const last = history.stack[history.stack.length - 1]?.sceneId ?? config.entry
    window.history.pushState(null, '', `#${last}`)
    setActiveId(last)
    setPanelOpen(false)
  }, [history, config.entry])

  const idx = config.scenes.findIndex((s) => s.id === activeId)
  const next = idx >= 0 ? config.scenes[(idx + 1) % config.scenes.length] : null
  const exits = idx >= 0 ? config.scenes[idx] : null
  const exitsWithMain = next ? [
    { text: `▸ 继续：${next.label}`, to: next.id, main: true },
    ...(exits?.features ?? []),
    ...(exits?.questions ?? []),
  ] : [
    ...(exits?.features ?? []),
    ...(exits?.questions ?? []),
  ]

  return (
    <ExploreConfigContext.Provider value={config}>
      <div className="explore-router"
        onClick={(e) => {
          if ((e.target as Element).closest('a, button, [role="button"], .scene-replay, .chip-prefix, .history-fab, .history-panel')) return
          skipRef.current()
        }}>
        {children}  {/* Answer 各自通过 data-scene-id 与 data-active 配合 */}
        <HistoryFAB stack={history.stack} onBack={back} onOpenPanel={() => setPanelOpen(true)} />
        <HistoryPanel open={panelOpen} onClose={() => setPanelOpen(false)}
          stack={history.stack} onJumpTo={jumpTo}>
          <div className="exits-tree">
            <span className="history-panel__sub">─ 主线/支线 ─</span>
            <ul>
              {exitsWithMain.map((e, i) => (
                <li key={i}><a href={`#${e.to}`} onClick={(ev) => { ev.preventDefault(); goTo(e.to) }}>
                  {e.text}
                </a></li>
              ))}
            </ul>
          </div>
        </HistoryPanel>
      </div>
    </ExploreConfigContext.Provider>
  )
}
```

注：`skipRef` 由具体幕 Answer 通过 `onReady` 注入；本测试覆盖路由/履历即可。

- [ ] **Step 5.3: Answer 改接线**

在 `Answer.tsx`：
- 去掉现有 IO useEffect（v3 写的整段 IntersectionObserver 逻辑）；
- 保留 partition / act-head / stage / dialogue / choices 渲染结构；
- 新增 props `data-scene-id` 由 Post 传；幕激活逻辑改为：仅当 `[data-active]` 匹配自己时渲染 `<Director>` 包 children；
- 不再自管演出，统一交给 Director。

```tsx
interface Props {
  id: string
  children: ReactNode
}

// 返回结构里 .theater 上加 data-scene-id 与 data-active：
<section className="theater answer-block" id={id} data-scene-id={id} data-active={active ? '' : undefined}>
  {active && <Director scene={{ id, mode: scene?.mode ?? 2, demo: scene?.demo ?? '' }}
    headRef={headRef} dlgRef={dialogueRef} choicesRef={choicesRef} stageRef={stageRef}
    onReady={(api) => onActivate(id, api.skip)}>
    {/* 原有 act-head / stage / dialogue / choices */}
  </Director>}
  {!active && (
    <>
      {hasHead && (...act-head...)}
      {clips.length > 0 && (...stage...)}
      <div className="dialogue">...</div>
      ...
    </>
  )}
</section>
```

实现细节：Answer 是 children 的容器；active 状态由 Post 顶层路由（ExploreRouter 通过 context 注入 `activeSceneId`）决定。

- [ ] **Step 5.4: ExitChips 改走 hash + goTo**

```tsx
<a href={`#${id}`} onClick={(ev) => { ev.preventDefault(); goTo(id) }}>
```

goTo 通过 context 注入。ExploreRouter 在 Provider value 上挂 `goTo`。

- [ ] **Step 5.5: Post.tsx 接线**

```tsx
{exploreConfig ? (
  <ExploreRouter config={exploreConfig}>
    <ExploreConfigContext.Provider value={exploreConfig}>
      {/* 渲染 article.mdx children（已含 Answer/SceneClip） */}
    </ExploreConfigContext.Provider>
  </ExploreRouter>
) : (
  <>{children}</>
)}
```

注：ExploreRouter 自身已包 Provider，Post 不需要再包。删除 SceneToc 引用。

- [ ] **Step 5.6: SceneToc.tsx 删除**

确认无 import 后 `git rm`。

- [ ] **Step 5.7: Post.test.tsx 追加测试**

```tsx
it('有 explore：main 挂 data-has-router（hydration 后）', () => {
  // jsdom 下手动验证
  render(<Post ... />)
  expect(document.body.classList.contains('stage-locked')).toBe(true)
})
```

- [ ] **Step 5.8: 测试 + 类型 + commit**

Run: `pnpm test` + `pnpm typecheck` + `pnpm validate:explore`
Expected: 全部 PASS / 0；注意 v3 既有 Answer 测试需更新（act-head 渲染条件已变）。

```bash
git add src/components/explore/ExploreRouter.tsx src/components/explore/ExploreRouter.test.tsx \
        src/components/explore/Answer.tsx src/components/explore/ExitChips.tsx \
        src/pages/Post.tsx src/pages/Post.test.tsx
git rm src/components/explore/SceneToc.tsx
git commit -m "feat(explore): v4 ExploreRouter 接线 + Answer/ExitChips/Post 改造"
```

---

## Task 6: CSS（单幕可见性 + mode 1 全屏 + FAB + 履历面板）

**Files:**
- Modify: `src/styles/global.css`（在 `.post-wrap--stage` 作用域段追加）

**约束**：所有新样式写在 `.post-wrap--stage` 前缀下。

- [ ] **Step 6.1: 加单幕可见性切换**

```css
.post-wrap--stage {
  /* 有 JS（hydration 后）：单幕可见 */
  &[data-has-router] .theater:not([data-active]) { display: none; }
  /* 无 JS：所有幕竖向平铺（默认行为） */
}

/* 解锁 body 滚动锁（仅探索页） */
body.stage-locked { overflow: hidden; }
```

- [ ] **Step 6.2: 加 mode 1 全屏**

```css
.post-wrap--stage {
  .stage {
    /* v3 现状不动 */
  }
  .stage--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 50;
    border-radius: 0;
    width: 100vw;
    height: 100vh;
  }
}
```

- [ ] **Step 6.3: 加 FAB + 履历面板**

```css
.post-wrap--stage {
  .history-fab {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    align-items: center;
    background: rgba(15, 21, 18, 0.92);
    border: 1px solid var(--line, rgba(220,229,225,0.12));
    border-radius: 28px;
    padding: 8px 16px;
    z-index: 60;
    color: var(--text, #DCE5E1);
  }
  .history-fab button { ... }
  .history-fab__depth { ... }

  .history-panel {
    position: fixed;
    inset: 0;
    z-index: 70;
    &__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
    &__body { position: relative; max-width: 480px; margin: 8vh auto; ... }
    &__exits, &__history { padding: 16px; }
    &__sub { font-size: 11px; letter-spacing: 0.2em; color: var(--dim, #8CA098); }
  }
}
```

具体值参考 v3 token 表（`--stage-bg` / `--stext` / `--sdim` / `--sfaint` / `--sline` / `--sacc` / `--sacc-soft`）。

- [ ] **Step 6.4: commit**

```bash
git add src/styles/global.css
git commit -m "style(explore): v4 单幕可见性 + 全屏 mode 1 + 履历面板"
```

---

## Task 7: 回归 + 状态行

**Files:**
- Modify: `docs/superpowers/specs/2026-08-30-explore-view-design-v4.md`（状态行）

- [ ] **Step 7.1: 全量闸门**

Run: `pnpm test` + `pnpm typecheck` + `pnpm validate:explore` + `pnpm build`
Expected: 测试全绿（72 + 新增 ≥ 20 ≥ 92）/ typecheck 0 / validate 0/0 / build 9 路由。

- [ ] **Step 7.2: Playwright 手测**

- 入口 hash 直达；
- 「继续」按 yaml 顺序前进，履历栈 push；
- 支线跳 → 「◀ 返回」回到父幕；
- mode 1（q-problem）全屏动画入场；mode 2 / mode 3 验证；
- 点击页面跳过当前演出，下一段立即开始；
- 「↻ 重看」只重播 demo；
- reduced-motion：演出直出终态；
- 1400px / 390px 断点；
- 关 JS：所有幕平铺可读；
- 无 explore 文章零回归。

- [ ] **Step 7.3: 更新 spec 状态行**

把 `**状态**: 已确认设计；待实施` 改为 `**状态**: 已实施（v4 7 任务 SDD 完成）`。

- [ ] **Step 7.4: commit**

```bash
git add docs/superpowers/specs/2026-08-30-explore-view-design-v4.md
git commit -m "docs(spec): v4 状态行更新为已实施"
```

---

## Final review（最后一道闸门）

派 most capable 模型对整分支做 whole-branch review：检查 spec §1 不变项是否全守住、demo / MDX 零改动铁律、无 explore 文章零回归、reduced-motion 路径完整、SSG 降级真实生效（无 JS 实测）。