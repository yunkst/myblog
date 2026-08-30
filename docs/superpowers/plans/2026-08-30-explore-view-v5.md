# 探索视图 v5（全屏单幕 + 显式导航）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 探索文章进入即全屏舞台——零滚动、DOM 唯一幕、底部导航条 + 键盘快捷键 + 退出路径；非幕内容从 MDX 删除。

**Architecture:** Post.tsx 按 `hasExplore` 分流 Stage（新）/ ArticlePage（原版式）。舞台里 ExploreRouter 仍管 hash/履历/skip，但通过扩展的 runtime 暴露 back/canBack/panelOpen/焦点出口；单幕渲染用 AnswerGate（MDXProvider 注入过滤版 Answer，非激活幕 return null）实现。CSS 作用域从 `.post-wrap--stage` 迁移到 `.stage-frame`。

**Tech Stack:** React 19 + react-router-dom 6 + GSAP（既有 demo 不动）+ vitest/@testing-library + vite-react-ssg。

**Spec:** `docs/superpowers/specs/2026-08-30-explore-view-design-v5.md`

## Global Constraints

- demo 动画（`content/posts/*/scene*.tsx`）一行不改；`<Answer id>` MDX 用法不变
- 无 explore 的 4 篇文章（shixi-open-source-study-app 等）零回归
- URL 结构不变：`/blog/<slug>/#<scene-id>`
- yaml schema 不加字段（mode 沿用）
- CSS：`body.stage-locked { overflow: hidden }` 保留；CRT 剧院视觉（暗底/发丝线/直角/翠绿 sacc）保留
- 无 JS 降级：SSG 直出完整 HTML（AnswerGate 在 SSR 无 runtime 时**不过滤**，全部幕直出）
- 每个任务收尾必须 `pnpm test` 绿 + `pnpm typecheck` 0 错
- 提交信息用 conventional commits（feat/fix/refactor/test/style/docs + scope）

---

### Task 1: useKeyboardShortcuts hook

**Files:**
- Create: `src/components/explore/useKeyboardShortcuts.ts`
- Test: `src/components/explore/useKeyboardShortcuts.test.ts`

**Interfaces:**
- Consumes: 无（纯 hook）
- Produces: `useKeyboardShortcuts(handlers: KeyboardHandlers, enabled?: boolean): void`，其中 `KeyboardHandlers = { onBack; onNext; onArrowUp; onArrowDown; onEnter; onEsc: () => void }`。Task 3 在 ExploreRouter 中以 `useKeyboardShortcuts({...}, !panelOpen 除 Esc 外全禁)` 的形态消费——实现上 enabled 只挡非 Esc 键。

- [ ] **Step 1: Write the failing test**

```ts
// src/components/explore/useKeyboardShortcuts.test.ts
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

function Harness({ handlers, enabled }: { handlers: any; enabled?: boolean }) {
  useKeyboardShortcuts(handlers, enabled)
  return <div />
}

const noop = () => {}
function mkHandlers() {
  return {
    onBack: vi.fn(), onNext: vi.fn(), onArrowUp: vi.fn(),
    onArrowDown: vi.fn(), onEnter: vi.fn(), onEsc: vi.fn(),
  }
}

describe('useKeyboardShortcuts', () => {
  it('← 触发 onBack', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(h.onBack).toHaveBeenCalledOnce()
  })

  it('→ 触发 onNext；↑↓ 触发 onArrowUp/onArrowDown；Enter 触发 onEnter；Esc 触发 onEsc', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(h.onNext).toHaveBeenCalledOnce()
    expect(h.onArrowUp).toHaveBeenCalledOnce()
    expect(h.onArrowDown).toHaveBeenCalledOnce()
    expect(h.onEnter).toHaveBeenCalledOnce()
    expect(h.onEsc).toHaveBeenCalledOnce()
  })

  it('editable target（input/contenteditable）时全部失效', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(h.onBack).not.toHaveBeenCalled()
    expect(h.onEsc).not.toHaveBeenCalled()
  })

  it('enabled=false 时非 Esc 键失效，Esc 仍触发', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} enabled={false} />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(h.onBack).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(h.onEsc).toHaveBeenCalledOnce()
  })

  it('卸载后注销监听', () => {
    const h = mkHandlers()
    const { unmount } = render(<Harness handlers={h} />)
    unmount()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(h.onBack).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/useKeyboardShortcuts.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/explore/useKeyboardShortcuts.ts
import { useEffect, useRef } from 'react'

export interface KeyboardHandlers {
  onBack: () => void
  onNext: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onEnter: () => void
  onEsc: () => void
}

/** editable 元素（输入框等）聚焦时快捷键全部失效 */
function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true
  return t.isContentEditable
}

/**
 * v5 舞台键盘快捷键（spec §3.2）：← 返回 / → 下一幕 / ↑↓ 焦点出口 / Enter 跳转 / Esc 关面板或退出。
 * - enabled=false：履历面板打开态——非 Esc 键全部失效（Esc 始终活着，用于关面板）；
 * - handlers 走 ref，引用变化不重挂监听。
 */
export function useKeyboardShortcuts(handlers: KeyboardHandlers, enabled = true) {
  const ref = useRef(handlers)
  useEffect(() => { ref.current = handlers })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.key === 'Escape') { ref.current.onEsc(); return }
      if (!enabled) return
      switch (e.key) {
        case 'ArrowLeft': ref.current.onBack(); break
        case 'ArrowRight': ref.current.onNext(); break
        case 'ArrowUp': e.preventDefault(); ref.current.onArrowUp(); break
        case 'ArrowDown': e.preventDefault(); ref.current.onArrowDown(); break
        case 'Enter': ref.current.onEnter(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore/useKeyboardShortcuts.test.ts`
Expected: PASS 5 项

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/useKeyboardShortcuts.ts src/components/explore/useKeyboardShortcuts.test.ts
git commit -m "feat(explore): v5 useKeyboardShortcuts hook（←→↑↓Enter/Esc + editable 守卫 + panel 态只留 Esc）"
```

---

### Task 2: runtime 扩展——back/canBack/panelOpen/onExit/主线下一幕

**Files:**
- Modify: `src/components/explore/AnswerContext.ts`
- Modify: `src/components/explore/ExploreRouter.tsx`
- Test: `src/components/explore/ExploreRouter.test.tsx`（追加用例）

**Interfaces:**
- Consumes: 既有 `useHistoryStack`（`stack/pop/canPop`）
- Produces: `ExploreRuntime` v5 完整接口（后续 Task 3/5/6 全依赖）：

```ts
export interface ExploreRuntime {
  activeId: string
  goTo: (id: string) => void
  onActivate: (id: string, skip: () => void) => void
  firstActivation: boolean
  /* v5 新增 */
  back: () => void                 // 履历栈 pop + hash + 激活切换；栈≤1 时 no-op
  canBack: boolean                 // stack.length > 1
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  onExit: () => void               // Stage 传入的退出回调（透传）
}
```

ExploreRouter Props 增加 `onExit?: () => void`（缺省 no-op）。

- [ ] **Step 1: Write the failing test**（追加到 ExploreRouter.test.tsx 末尾）

```tsx
describe('ExploreRouter v5 runtime 扩展', () => {
  it('canBack=false 时 back() no-op；goTo 两次后 canBack=true，back() 回到前一幕', () => {
    const { container } = renderRouter()
    const rt = () => {
      // runtime 经 Probe 暴露：复用 AnswerProbe 不够，直接挂一个 RtProbe
      return (window as any).__rt as any
    }
    // RtProbe 在 renderRouter 里尚未挂——本用例单独渲染
    container.remove()
    const { getByTestId } = render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config}>
          <RtProbe />
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
    expect(getByTestId('rt').dataset.canBack).toBe('false')
    fireEvent.click(getByTestId('rt-back'))
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active') // 仍在 entry

    fireEvent.click(getByTestId('rt-go'))
    expect(getByTestId('rt').dataset.canBack).toBe('true')
    fireEvent.click(getByTestId('rt-back'))
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
  })

  it('onExit prop：Esc 之外的退出路径——setPanelOpen 透传 + onExit 可调用', () => {
    const onExit = vi.fn()
    render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config} onExit={onExit}>
          <RtProbe />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
    fireEvent.click(screen.getByTestId('rt-exit'))
    expect(onExit).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByTestId('rt-open-panel'))
    expect(screen.getByTestId('rt').dataset.panelOpen).toBe('true')
  })
})
```

同时在文件顶部既有 probe 区追加 RtProbe：

```tsx
/** v5：runtime 全字段暴露，供断言与触发。 */
function RtProbe() {
  const rt = useContext(ExploreRuntimeContext)!
  return (
    <div
      data-testid="rt"
      data-can-back={String(rt.canBack)}
      data-panel-open={String(rt.panelOpen)}
    >
      <button data-testid="rt-back" onClick={rt.back} />
      <button data-testid="rt-go" onClick={() => rt.goTo('q-b')} />
      <button data-testid="rt-open-panel" onClick={() => rt.setPanelOpen(true)} />
      <button data-testid="rt-exit" onClick={rt.onExit} />
    </div>
  )
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/ExploreRouter.test.tsx`
Expected: FAIL（`rt.back` 不存在 / 类型错误）

- [ ] **Step 3: Implement**

`AnswerContext.ts`：`ExploreRuntime` 接口按上文 Produces 扩展（保留原注释，追加 v5 注释块）。

`ExploreRouter.tsx`：
1. Props 增加 `onExit?: () => void`；
2. 组件内：

```tsx
const back = useCallback(() => {
  const prev = history.pop()
  if (prev) {
    window.history.pushState(null, '', `#${prev}`)
    setActiveId(prev)
    setPanelOpen(false)
  }
}, [history])
```

（back 已存在——不动；新增暴露即可）

3. mount effect 里 `document.querySelector('main.post-wrap--stage')` 改为 `document.querySelector('main.stage-frame, main.post-wrap--stage')`（Stage 页类名 Task 7 落地，双 selector 平滑过渡）；
4. runtime useMemo 替换为：

```tsx
const runtime = useMemo<ExploreRuntime>(() => ({
  activeId,
  goTo,
  onActivate,
  firstActivation: !!firstActivation[activeId],
  back,
  canBack: history.stack.length > 1,
  panelOpen,
  setPanelOpen: setPanelOpen,
  onExit: onExitRef.current,
}), [activeId, goTo, onActivate, firstActivation, back, history.stack.length, panelOpen])
```

`onExitRef` 模式同 `onReadyRef`：

```tsx
const onExitRef = useRef<(() => void) | undefined>(onExit)
useEffect(() => { onExitRef.current = onExit })
```

5. 面板 Esc effect 保留不动（Task 3 的键盘 hook 不重复管 Esc 的面板分支——hook 的 onEsc 回调里做 `panelOpen ? 关面板 : onExit()`，既有 window keydown Esc 监听删除，避免双触发：把既有「Esc 关闭面板」effect 整段移除，逻辑并入 Task 3 的 onEsc）。

注意：Task 3 之前 panelOpen 时的 Esc 只走 hook 的 onEsc——本任务先临时把 onEsc 接 `() => (panelOpen ? setPanelOpen(false) : onExitRef.current?.())`，Task 3 落 hook 后此内联逻辑挪进 hook handlers。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore/ExploreRouter.test.tsx`
Expected: PASS（既有用例 + 新增 2 个）

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/AnswerContext.ts src/components/explore/ExploreRouter.tsx src/components/explore/ExploreRouter.test.tsx
git commit -m "feat(explore): v5 runtime 扩展——back/canBack/panelOpen/onExit 进 ExploreRuntime"
```

---

### Task 3: 键盘接线 + 焦点出口

**Files:**
- Modify: `src/components/explore/ExploreRouter.tsx`
- Modify: `src/components/explore/ExitChips.tsx`
- Modify: `src/components/explore/AnswerContext.ts`（runtime 再加 2 字段）
- Test: `src/components/explore/ExploreRouter.test.tsx`、`src/components/explore/ExitChips.test.tsx`

**Interfaces:**
- Consumes: Task 1 `useKeyboardShortcuts(handlers, enabled)`；Task 2 runtime
- Produces: runtime 再扩展：

```ts
  focusedExitIdx: number | null   // 当前幕出口平铺序（features→questions）；null=无焦点
```

（↑↓/Enter 行为完全内聚在 ExploreRouter，不进 runtime。）

- [ ] **Step 1: Write the failing test**（ExploreRouter.test.tsx 追加）

```tsx
describe('ExploreRouter v5 键盘', () => {
  function renderWithKeys() {
    return render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config}>
          <RtProbe />
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
          <GoProbe target="q-b" />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
  }

  it('→ 跳主线下一幕；← 回退', () => {
    renderWithKeys()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('scene-q-b')).toHaveAttribute('data-active')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
  })

  it('q-b 上 ↑↓ 循环焦点出口，Enter 跳到焦点出口', () => {
    window.history.replaceState(null, '', '/blog/test/#q-b')
    renderWithKeys()
    expect(screen.getByTestId('rt').dataset.focus).toBe('null')
    fireEvent.keyDown(window, { key: 'ArrowDown' })   // idx 0
    expect(screen.getByTestId('rt').dataset.focus).toBe('0')
    fireEvent.keyDown(window, { key: 'ArrowDown' })   // wrap → 0（只有 1 个出口）
    expect(screen.getByTestId('rt').dataset.focus).toBe('0')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active') // q-b 唯一出口 to: q-a
  })

  it('panelOpen 时非 Esc 键失效，Esc 关面板', () => {
    renderWithKeys()
    fireEvent.click(screen.getByTestId('rt-open-panel'))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active') // 没跳
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('rt').dataset.panelOpen).toBe('false')
  })
})
```

ExitChips.test.tsx 追加焦点 class 用例：

```tsx
it('focusedExitIdx 命中时对应 chip 有 exit-chip--focused 类', () => {
  // 复用本文件既有 Provider 渲染助手；把 runtime 换成带 focusedExitIdx 的值
  // 既有测试文件若直接构造 runtime 对象，扩展字段加默认值即可
})
```

（实现时按 ExitChips.test.tsx 既有构造方式补全，断言 `chip.classList.contains('exit-chip--focused')`。）

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/ExploreRouter.test.tsx src/components/explore/ExitChips.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

ExploreRouter.tsx：

```tsx
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

/* 组件内 */
const [focusedExitIdx, setFocusedExitIdx] = useState<number | null>(null)

/* activeId 变化时重置焦点 */
useEffect(() => { setFocusedExitIdx(null) }, [activeId])

/* 当前幕出口平铺（features→questions，与 ExitChips 渲染顺序一致） */
const flatExits = useMemo(() => {
  const idx = config.scenes.findIndex((s) => s.id === activeId)
  const scene = idx >= 0 ? config.scenes[idx] : null
  return [...(scene?.features ?? []), ...(scene?.questions ?? [])]
}, [activeId, config])

useKeyboardShortcuts({
  onBack: () => back(),
  onNext: () => {
    const idx = config.scenes.findIndex((s) => s.id === activeIdRef.current)
    if (idx >= 0) goTo(config.scenes[(idx + 1) % config.scenes.length].id)
  },
  onArrowUp: () => setFocusedExitIdx((i) =>
    flatExits.length === 0 ? null : ((i ?? 0) - 1 + flatExits.length) % flatExits.length),
  onArrowDown: () => setFocusedExitIdx((i) =>
    flatExits.length === 0 ? null : ((i ?? -1) + 1) % flatExits.length),
  onEnter: () => {
    if (focusedExitIdx == null || !flatExits[focusedExitIdx]) return
    const to = flatExits[focusedExitIdx].to
    if (typeof to === 'string') goTo(to)
    else window.location.assign(resolveExploreHref(to, config))
  },
  onEsc: () => (panelOpenRef.current ? setPanelOpen(false) : onExitRef.current?.()),
}, !panelOpen)
```

`panelOpenRef` 同 ref 模式；runtime 增加 `focusedExitIdx` 字段。删掉 Task 2 留下的临时 onEsc 内联与既有「Esc 关闭面板」独立 effect。

`ExitChips.tsx`：本地出口 `<a>` 上加：

```tsx
className={`exit-chip${runtime?.focusedExitIdx === flatIdx ? ' exit-chip--focused' : ''}`}
```

`flatIdx` 由组件内按 group 偏移计算（features 组从 0 起，questions 组从 `exits 前一组长度` 起）——把 Props 增加必需的 `baseIdx: number`，Answer.tsx 渲染处传 `<ExitChips group="features" baseIdx={0} .../>`、`<ExitChips group="questions" baseIdx={(scene?.features ?? []).length} .../>`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore`
Expected: PASS 全部

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/ExploreRouter.tsx src/components/explore/ExitChips.tsx src/components/explore/AnswerContext.ts src/components/explore/Answer.tsx src/components/explore/ExploreRouter.test.tsx src/components/explore/ExitChips.test.tsx
git commit -m "feat(explore): v5 键盘接线 + 焦点出口（↑↓ 循环 / Enter 跳转 / chip 焦点态）"
```

---

### Task 4: SceneRoute——AnswerGate 单幕挂载

**Files:**
- Create: `src/components/explore/SceneRoute.tsx`
- Test: `src/components/explore/SceneRoute.test.tsx`

**Interfaces:**
- Consumes: `Answer`（default export）、`ExploreRuntimeContext`、`mdxModules` 形态（`import.meta.glob('/content/posts/*/article.mdx', { eager: true })`）
- Produces:
  - `AnswerGate({ id, children })`——非激活幕 return null（SSR 无 runtime 时不过滤）
  - `default StageBody({ slug })`——MDXProvider(components={...registry, Answer: AnswerGate, SceneClip}) 包整篇 Body；外层 `<div className="stage-stage" key={activeId}>`

> **spec §7.3 偏差说明**：`pickActiveScene` 需要在不挂载的前提下拿到 MDX 组件的元素树——React 语义下做不到（组件不渲染就没有 children，渲染就等于全挂载）。改用 AnswerGate 过滤：Body 整篇渲染，但非激活 Answer 返回 null 不进 DOM，语义等价（`.theater` DOM 唯一）。

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/explore/SceneRoute.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AnswerGate from './SceneRoute'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: 'A', demo: 'da' },
    { id: 'q-b', label: 'B', demo: 'db' },
  ],
}

vi.mock('../blog-anim/registry', () => ({ registry: {} }))

function Rt({ activeId }: { activeId: string }) {
  // 最小 runtime；goTo 等字段 SceneRoute/AnswerGate 不消费
  const value = {
    activeId, goTo: () => {}, onActivate: () => {}, firstActivation: false,
    back: () => {}, canBack: false, panelOpen: false, setPanelOpen: () => {},
    onExit: () => {}, focusedExitIdx: null,
  } as any
  return (
    <ExploreRuntimeContext.Provider value={value}>
      <AnswerGate id="q-a">A 内容</AnswerGate>
      <AnswerGate id="q-b">B 内容</AnswerGate>
    </ExploreRuntimeContext.Provider>
  )
}

describe('AnswerGate', () => {
  it('激活幕渲染，非激活幕不进 DOM', () => {
    render(<ExploreConfigContext.Provider value={config}><Rt activeId="q-b" /></ExploreConfigContext.Provider>)
    expect(screen.queryByText('A 内容')).toBeNull()
    expect(screen.getByText('B 内容')).toBeInTheDocument()
  })

  it('无 runtime（SSG/无 JS）：全部幕直出', () => {
    render(<AnswerGate id="q-a">A 内容</AnswerGate>)
    expect(screen.getByText('A 内容')).toBeInTheDocument()
  })
})
```

（StageBody 的集成行为由 Task 7 的 Post.test 覆盖，这里不重复。）

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/SceneRoute.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Implement**

```tsx
// src/components/explore/SceneRoute.tsx
import { useContext, useMemo, type ReactNode } from 'react'
import { MDXProvider } from '@mdx-js/react'
import { registry } from '../blog-anim/registry'
import Answer from './Answer'
import SceneClip from './SceneClip'
import { ExploreRuntimeContext } from './AnswerContext'

/**
 * v5 单幕挂载（spec §7.3）：MDXProvider 注入过滤版 Answer——非激活幕 return null。
 * SSR/hydration 首帧无 hash → activeId=entry，与 SSG 输出对齐，无 mismatch。
 */
export default function AnswerGate({ id, children }: { id: string; children: ReactNode }) {
  const runtime = useContext(ExploreRuntimeContext)
  if (runtime && runtime.activeId !== id) return null
  return <Answer id={id}>{children}</Answer>
}

const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

/** 舞台正文：整篇 MDX（非激活幕被 AnswerGate 过滤）+ key=activeId 强制切幕重挂。 */
export function StageBody({ slug, activeId }: { slug: string; activeId: string }) {
  const Body = useMemo(() => {
    const key = Object.keys(mdxModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
    return key ? mdxModules[key].default : null
  }, [slug])

  return (
    <div className="stage-stage" key={activeId}>
      <MDXProvider components={{ ...registry, Answer: AnswerGate, SceneClip }}>
        {Body ? <Body /> : <p>正文缺失。</p>}
      </MDXProvider>
    </div>
  )
}
```

注意：`Answer.tsx` 内部 `partition` 用 `child.type === SceneClip` 判定——经 MDXProvider 注入的组件映射不影响直接 import 的元素类型，无需改动。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore/SceneRoute.test.tsx`
Expected: PASS 2 项

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/SceneRoute.tsx src/components/explore/SceneRoute.test.tsx
git commit -m "feat(explore): v5 SceneRoute——AnswerGate 单幕挂载（非激活幕不进 DOM）"
```

---

### Task 5: StageNav 底部导航条

**Files:**
- Create: `src/components/explore/StageNav.tsx`
- Test: `src/components/explore/StageNav.test.tsx`

**Interfaces:**
- Consumes: Task 2 runtime（`back/canBack/goTo/onExit/panelOpen/setPanelOpen`）、`ExploreConfigContext`
- Produces: `default StageNav()`（无 props——全部从 context 取）

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/explore/StageNav.test.tsx
import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StageNav from './StageNav'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'
import type { ExploreConfig, ExploreRuntime } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: 'A', demo: 'da' },
    { id: 'q-b', label: 'B', demo: 'db' },
  ],
}

function mkRt(over: Partial<ExploreRuntime>): ExploreRuntime {
  return {
    activeId: 'q-a', goTo: vi.fn(), onActivate: vi.fn(), firstActivation: true,
    back: vi.fn(), canBack: false, panelOpen: false, setPanelOpen: vi.fn(),
    onExit: vi.fn(), focusedExitIdx: null,
    ...over,
  } as ExploreRuntime
}

function renderNav(rt: ExploreRuntime) {
  return render(
    <ExploreConfigContext.Provider value={config}>
      <ExploreRuntimeContext.Provider value={rt}>
        <StageNav />
      </ExploreRuntimeContext.Provider>
    </ExploreConfigContext.Provider>,
  )
}

describe('StageNav', () => {
  it('渲染 4 个按钮：◀ 返回 / ⏵ 继续：<下一幕 label> / 履历 / ✕ 退出', () => {
    const rt = mkRt({})
    renderNav(rt)
    expect(screen.getByText('◀ 返回')).toBeInTheDocument()
    expect(screen.getByText('⏵ 继续：B')).toBeInTheDocument()
    expect(screen.getByText('履历 ▾')).toBeInTheDocument()
    expect(screen.getByText('✕ 退出')).toBeInTheDocument()
  })

  it('栈底（canBack=false）◀ 返回 disabled；点击启用时调 back', () => {
    const back = vi.fn()
    const { rerender } = renderNav(mkRt({ back }))
    expect(screen.getByText('◀ 返回').closest('button')).toBeDisabled()
    rerender(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRuntimeContext.Provider value={mkRt({ back, canBack: true })}>
          <StageNav />
        </ExploreRuntimeContext.Provider>
      </ExploreConfigContext.Provider>,
    )
    fireEvent.click(screen.getByText('◀ 返回'))
    expect(back).toHaveBeenCalledOnce()
  })

  it('⏵ 继续调 goTo(主线下一幕)；履历调 setPanelOpen(true)；退出调 onExit', () => {
    const rt = mkRt({ canBack: true })
    renderNav(rt)
    fireEvent.click(screen.getByText('⏵ 继续：B'))
    expect(rt.goTo).toHaveBeenCalledWith('q-b')
    fireEvent.click(screen.getByText('履历 ▾'))
    expect(rt.setPanelOpen).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByText('✕ 退出'))
    expect(rt.onExit).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/StageNav.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Implement**

```tsx
// src/components/explore/StageNav.tsx
import { useContext } from 'react'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'

/**
 * v5 底部导航条（spec §2.2）：◀ 返回 / ⏵ 继续（主线下一幕）/ 履历 ▾ / ✕ 退出。
 * 全部行为来自 ExploreRuntime——本组件零状态。
 */
export default function StageNav() {
  const config = useContext(ExploreConfigContext)!
  const rt = useContext(ExploreRuntimeContext)!

  const idx = config.scenes.findIndex((s) => s.id === rt.activeId)
  const next = config.scenes[(idx + 1) % config.scenes.length]

  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <button type="button" disabled={!rt.canBack} aria-label="返回上一幕" onClick={rt.back}>
        ◀ 返回
      </button>
      <button type="button" onClick={() => rt.goTo(next.id)}>
        ⏵ 继续：{next.label}
      </button>
      <button type="button" aria-label="打开履历面板" onClick={() => rt.setPanelOpen(true)}>
        履历 ▾
      </button>
      <button type="button" aria-label="退出探索" onClick={rt.onExit}>
        ✕ 退出
      </button>
    </nav>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore/StageNav.test.tsx`
Expected: PASS 3 项

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/StageNav.tsx src/components/explore/StageNav.test.tsx
git commit -m "feat(explore): v5 StageNav 底部导航条（返回/继续/履历/退出）"
```

---

### Task 6: HistoryPanel 动作镜像 + 删除 HistoryFAB

**Files:**
- Modify: `src/components/explore/HistoryPanel.tsx`
- Modify: `src/components/explore/ExploreRouter.tsx`（传新 props + 移除 HistoryFAB 渲染）
- Delete: `src/components/explore/HistoryFAB.tsx`
- Test: `src/components/explore/HistoryPanel.test.tsx`、`src/components/explore/ExploreRouter.test.tsx`

**Interfaces:**
- Consumes: Task 2 runtime
- Produces: HistoryPanel Props 扩展：

```ts
interface Props {
  open: boolean
  onClose: () => void
  stack: HistoryEntry[]
  onJumpTo: (idx: number) => void
  children?: ReactNode
  /* v5 动作镜像 */
  canBack: boolean
  onBack: () => void
  nextLabel: string          // ⏵ 继续：<下一幕 label>
  onNext: () => void
  onExit: () => void
}
```

- [ ] **Step 1: Write the failing test**（HistoryPanel.test.tsx 追加）

```tsx
it('v5 动作镜像：◀ 返回（canBack=false 时 disabled）/ ⏵ 继续：<label> / ✕ 退出', () => {
  const onBack = vi.fn(), onNext = vi.fn(), onExit = vi.fn()
  render(
    <HistoryPanel open onClose={noop} stack={[]} onJumpTo={noop}
      canBack={false} onBack={onBack} nextLabel="⏵ 继续：B" onNext={onExit === undefined ? noop : onNext} onExit={onExit}>
      <div />
    </HistoryPanel>,
  )
  const back = screen.getByText('◀ 返回').closest('button')!
  expect(back).toBeDisabled()
  expect(screen.getByText('⏵ 继续：B')).toBeInTheDocument()
  fireEvent.click(screen.getByText('✕ 退出'))
  expect(onExit).toHaveBeenCalledOnce()
})
```

（实现时按该文件既有的 import/noop 风格对齐；`nextLabel` 直接断言文本。）

ExploreRouter.test.tsx：既有 FAB 相关断言（若存在 `history-fab` 查询）改断言 StageNav 不在此层（FAB 移除后 ExploreRouter 不渲染导航按钮——断言 `container.querySelector('.history-fab')` 为 null）。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/HistoryPanel.test.tsx src/components/explore/ExploreRouter.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

HistoryPanel.tsx：`history-panel__header` 下方插入动作条：

```tsx
<div className="history-panel__actions">
  <button type="button" disabled={!canBack} onClick={onBack}>◀ 返回</button>
  <button type="button" onClick={onNext}>{nextLabel}</button>
  <button type="button" onClick={onExit}>✕ 退出</button>
</div>
```

ExploreRouter.tsx：
1. 移除 `import HistoryFAB` 与 `<HistoryFAB .../>` 渲染行；
2. `<HistoryPanel>` 追加 props：

```tsx
canBack={history.stack.length > 1}
onBack={back}
nextLabel={`⏵ 继续：${nextSceneLabel}`}
onNext={() => { if (nextSceneId) goTo(nextSceneId) }}
onExit={() => { setPanelOpen(false); onExitRef.current?.() }}
```

`nextSceneId/nextSceneLabel` 由既有 `exitsWithMain` useMemo 旁新增：

```tsx
const idx = config.scenes.findIndex((s) => s.id === activeId)
const nextSceneId = config.scenes[(idx + 1) % config.scenes.length]?.id
const nextSceneLabel = config.scenes[(idx + 1) % config.scenes.length]?.label ?? ''
```

3. 全仓 grep `HistoryFAB` 确认无残留引用。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore && pnpm typecheck`
Expected: PASS 全部 + typecheck 0 错

- [ ] **Step 5: Commit**

```bash
git add -A src/components/explore
git commit -m "feat(explore): v5 履历面板动作镜像；删除 HistoryFAB（被 StageNav 替代）"
```

---

### Task 7: Stage 页 + Post 分流 + ArticlePage 抽取

**Files:**
- Create: `src/pages/Stage.tsx`
- Create: `src/pages/ArticlePage.tsx`
- Modify: `src/pages/Post.tsx`（薄壳分流）
- Test: `src/pages/Post.test.tsx`（改写）

**Interfaces:**
- Consumes: Task 4 `StageBody`、Task 5 `StageNav`、Task 2 `ExploreRouter onExit`；`setCurrentSlug`（SceneClip 既有导出）；`exploreConfigFor`（从 Post.tsx 迁移）
- Produces: `Stage({ post }: { post: Post })`、`ArticlePage({ post }: { post: Post })`（均 default export）

- [ ] **Step 1: 改写测试（先红）**

Post.test.tsx 全文替换：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Post from './Post'

vi.mock('vite-react-ssg', () => ({ Head: () => null }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog/:slug" element={<Post />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<Post> v5 分流', () => {
  beforeEach(() => { document.body.className = '' })
  afterEach(() => { document.body.className = '' })

  it('有 explore：渲染 stage-frame 舞台；无 post-meta/h1/post-nav/post-body', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    const main = container.querySelector('main')!
    expect(main.className).toContain('stage-frame')
    expect(main.querySelector('.post-meta')).toBeNull()
    expect(main.querySelector('h1')).toBeNull()
    expect(main.querySelector('.post-nav')).toBeNull()
    expect(main.querySelector('.post-body')).toBeNull()
    expect(main.querySelector('.stage-nav')).not.toBeNull()
    expect(document.body.classList.contains('stage-locked')).toBe(true)
  })

  it('有 explore：SSG 首帧（无 hash）只挂 entry 幕一个 theater', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    expect(container.querySelectorAll('.theater')).toHaveLength(1)
    expect(container.querySelector('.theater')!.id).toBe('q-problem')
  })

  it('无 explore：720px 文档版式不变（post-wrap、h1、post-body、post-nav）', () => {
    const { container } = renderAt('/blog/shixi-open-source-study-app')
    const main = container.querySelector('main')!
    expect(main.className).toContain('post-wrap')
    expect(main.className).not.toContain('stage-frame')
    expect(main.querySelector('h1')).not.toBeNull()
    expect(main.querySelector('.post-body')).not.toBeNull()
    expect(main.querySelector('.post-nav')).not.toBeNull()
    expect(document.body.classList.contains('stage-locked')).toBe(false)
  })
})
```

> 注意：jsdom 下 `import.meta.glob` 由 vite 处理，真实 mdx 会加载——`ai-digital-employee` 的 scene.tsx 依赖 GSAP，但 Director 在 jsdom（matchMedia stub → reduced）走直出分支，与 v4 Post.test 同理安全。若 entry 幕断言失败因 yaml 解析差异，允许放宽为 `toHaveLength(1)` + `id` 断言二选一。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/Post.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

`src/pages/Stage.tsx`：

```tsx
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import type { Post } from '../lib/types'
import { parseExploreYaml } from '../lib/explore'
import { setCurrentSlug } from '../components/explore/SceneClip'
import { ExploreRouter } from '../components/explore/ExploreRouter'
import StageBody from '../components/explore/SceneRoute'
import StageNav from '../components/explore/StageNav'

/* 与旧 Post.tsx 同款 ?raw glob */
const exploreYamls = import.meta.glob<string>('/content/posts/*/explore.yaml', {
  query: '?raw', import: 'default', eager: true,
})
export function exploreConfigFor(slug: string) {
  const key = Object.keys(exploreYamls).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  const r = parseExploreYaml(exploreYamls[key])
  return r.ok ? r.value : null
}

/** v5 舞台页（spec §2.2）：整页 = 舞台；零滚动；唯一幕 + 底栏导航。 */
export default function Stage({ post }: { post: Post }) {
  const navigate = useNavigate()
  const config = useMemo(() => exploreConfigFor(post.slug), [post.slug])
  setCurrentSlug(post.slug)

  const handleExit = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }, [navigate])

  if (!config) {
    return <main className="post-wrap"><p>探索配置缺失。</p></main>
  }

  return (
    <>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className="stage-frame" data-article-slug={post.slug}>
        <ExploreRouter config={config} onExit={handleExit}>
          <StageBody slug={post.slug} activeId={config.entry} />
          <StageNav />
        </ExploreRouter>
      </main>
    </>
  )
}

export const entry = 'src/pages/Stage.tsx'
```

> `StageBody activeId={config.entry}` 只作 SSG 首帧 fallback key——StageBody 内部读 runtime.activeId 过滤，props.activeId 仅用于外层 key（见 Task 4 实现里 `key={activeId}`）。StageBody 实现相应调整为 `key` 由 props 提供、过滤仍走 runtime；若 Task 4 实现已用 runtime 值做 key，此处改为不传 props、StageBody 自取 runtime（执行者按 Task 4 产物为准，保持一致即可）。

`src/pages/ArticlePage.tsx`：旧 Post.tsx 的非 explore 分支原样搬入（mdxModules glob、meta/h1/excerpt/article/post-nav、`setCurrentSlug`、prev/next）。

`src/pages/Post.tsx` 薄壳：

```tsx
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getPost } from '../lib/content'
import Stage from './Stage'
import ArticlePage from './ArticlePage'

export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  if (!post) {
    return <main className="post-wrap"><p>文章不存在。</p></main>
  }
  return post.hasExplore ? <Stage post={post} /> : <ArticlePage post={post} />
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}
```

（`getAllPosts` 记得 import；routes.tsx 的 getStaticPaths 也可直接用 Post 的——保持 routes.tsx 现状不动。）

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/pages && pnpm typecheck`
Expected: PASS + 0 错

- [ ] **Step 5: Commit**

```bash
git add src/pages/Post.tsx src/pages/Stage.tsx src/pages/ArticlePage.tsx src/pages/Post.test.tsx
git commit -m "feat(explore): v5 Stage 舞台页 + Post 按 hasExplore 分流；ArticlePage 抽取"
```

---

### Task 8: Answer yaml-label 兜底标题 + MDX 非幕内容清理 + validate 规则

**Files:**
- Modify: `src/components/explore/Answer.tsx`（heading 兜底）
- Modify: `content/posts/ai-digital-employee/article.mdx`
- Modify: `src/lib/explore.ts`（新增校验函数）
- Modify: `scripts/validate-explore.ts`（接线）
- Test: `src/components/explore/Answer.test.tsx`、`src/lib/explore.test.ts`

**Interfaces:**
- Consumes: 无新依赖
- Produces: `validateAnswerOnlyMdx(mdxRaw: string): string[]`（错误列表；空数组=合规）

- [ ] **Step 1: Write the failing tests**

Answer.test.tsx 追加：

```tsx
it('children 无 heading 时 act-head 兜底渲染 yaml label', () => {
  // 复用本文件既有 config/render 助手；选一个 children 只有段落与 SceneClip 的场景
  // 断言 screen.getByText(scene.label) 存在且位于 .act-head 内
})
```

explore.test.ts 追加：

```ts
describe('validateAnswerOnlyMdx', () => {
  it('Answer 之外有非空内容 → 报错', () => {
    const raw = `---\ntitle: t\n---\nimport X from 'x'\n\n游离段落\n\n<Answer id="a">\n内部\n</Answer>\n`
    expect(validateAnswerOnlyMdx(raw)).toEqual([expect.stringContaining('游离段落')])
  })

  it('纯 Answer + import + frontmatter → 合规（空数组）', () => {
    const raw = `---\ntitle: t\n---\nimport A from '../../../src/components/explore/Answer'\n\n<Answer id="a">\n\n内部段落\n\n</Answer>\n`
    expect(validateAnswerOnlyMdx(raw)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/explore/Answer.test.tsx src/lib/explore.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Answer.tsx：`partition` 后、act-head 渲染处：

```tsx
const headTitle = heading ?? (scene ? <h2>{scene.label}</h2> : null)
```

`{heading}` 替换为 `{headTitle}`（hasHead 判定同步改为 `!!(headTitle || idx >= 0)`）。

explore.ts 追加：

```ts
/** v5（spec §2.3）：探索文章 mdx 必须只含 <Answer> 块（import/frontmatter/空白除外）。
 * 返回错误列表（含游离内容摘要），空数组 = 合规。 */
export function validateAnswerOnlyMdx(mdxRaw: string): string[] {
  const noFront = mdxRaw.replace(/^---\n[\s\S]*?\n---\n/, '')
  const noImports = noFront.split('\n').filter((l) => !/^import\s/.test(l)).join('\n')
  const stripped = noImports.replace(/<\/?Answer[^>]*>/g, '')
  const stray = stripped.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 0)
  return stray.map((s) => `Answer 之外存在游离内容：${s.slice(0, 40)}${s.length > 40 ? '…' : ''}`)
}
```

scripts/validate-explore.ts：`loadConfig(slug)` 非 null 分支里追加：

```ts
const strayErrors = validateAnswerOnlyMdx(article)
strayErrors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m [${slug}] ${e}`))
failures += strayErrors.length
```

article.mdx 清理规则（执行者逐块操作）：
1. **删除**文首两个 blockquote（`> 原文标题…`、`> 下面的内容有两种读法…`）；
2. **删除**所有 `<Answer>` 外的 h2/h3（如 `## 第一次尝试…`、`### 第一层…` 等——幕标题由 yaml label 兜底渲染）；
3. **删除** `<Answer>` 外的章节：`## 顺手的事：知识库问答不用污染核心逻辑`、`## AI 侧审计：补上传统审计缺的那一环`、`## 最后` 及其正文；
4. **保留**：frontmatter、import 块、全部 11 个 `<Answer>` 块及其内部所有内容（含 ArchDiagram、webp 图）；
5. 未被任何 Answer 包裹但用户仍想要的段落一律不保留（用户已确认「全部删除」）。

- [ ] **Step 4: Run tests + validate to verify they pass**

Run: `pnpm vitest run src/components/explore/Answer.test.tsx src/lib/explore.test.ts && pnpm validate:explore`
Expected: PASS + `失败 0`

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/Answer.tsx src/components/explore/Answer.test.tsx src/lib/explore.ts src/lib/explore.test.ts scripts/validate-explore.ts content/posts/ai-digital-employee/article.mdx
git commit -m "feat(explore): v5 非幕内容清除——MDX 只留 Answer 块 + validate 规则 + yaml label 兜底标题"
```

---

### Task 9: PostList 探索卡片文案

**Files:**
- Modify: `src/components/PostList.tsx`
- Test: `src/components/PostList.test.tsx`（新建）

**Interfaces:**
- Consumes: `getAllPosts()`（不变）
- Produces: 无（纯文案）——explore 卡片的 `explore-entry-btn` 文本改为 `▶ 进入舞台 · {label}`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/PostList.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PostList from './PostList'

describe('PostList v5', () => {
  it('explore 卡片显示「▶ 进入舞台 · <label>」，链接带 entry hash', () => {
    const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
    const btn = container.querySelector('.explore-entry-btn')!
    expect(btn.textContent).toContain('进入舞台')
    const card = btn.closest('a')!
    expect(card.getAttribute('href')).toMatch(/\/blog\/ai-digital-employee\/#q-problem/)
  })
})
```

（react-router v6 的 `<Link to={{pathname, hash}}>` 渲染 href 形态以实际为准——断言含 `#q-problem` 与 `/blog/ai-digital-employee` 即可。）

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/PostList.test.tsx`
Expected: FAIL（当前文案是 `▶ {label}`）

- [ ] **Step 3: Implement**

PostList.tsx 一行改动：

```tsx
<span className="explore-entry-btn" aria-hidden="false">▶ 进入舞台 · {p.exploreEntry.label}</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/PostList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PostList.tsx src/components/PostList.test.tsx
git commit -m "feat(explore): v5 列表卡片入口文案——▶ 进入舞台"
```

---

### Task 10: CSS 舞台化迁移 + 全局验收

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `.stage-frame` / `.stage-stage` / `.stage-nav` / `.exit-chip--focused` / `.history-panel__actions` class 名（前 9 个任务产物）
- Produces: 最终视觉

- [ ] **Step 1: 作用域迁移**

在 v3/v4 舞台段落（`/* ===== v3 CRT 剧院 … */` 起至 v4 履历面板段末）内：把所有 `.post-wrap--stage` 前缀替换为 `.stage-frame`。可用：

```bash
cd D:/myspace/myblog
sed -i 's/\.post-wrap--stage/.stage-frame/g' src/styles/global.css
```

然后**手工删除**已无宿主的规则块：`.stage-frame .post-meta, .stage-frame > h1, …`、`.stage-frame .post-meta { … }`、`.stage-frame > h1 { … }`、`.stage-frame .post-excerpt { … }`、`.stage-frame .history-fab` 整段（含 `__back/__panel/__depth` 与其 focus-visible）。

- [ ] **Step 2: 新增舞台容器/导航/焦点样式**

追加到 v4 段之后：

```css
/* ===== v5 全屏舞台 ===== */
.stage-frame {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--stage-bg, #0A0A0A);
  color: var(--stext, #E6E6E6);
  display: flex;
  flex-direction: column;
  padding: 32px clamp(16px, 4vw, 56px) 96px; /* 底部留出 stage-nav 高度 */
}

.stage-frame .stage-stage {
  flex: 1;
  min-height: 0;
  overflow-y: auto;          /* 幕内容超高时幕内滚动；body 永不滚 */
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
}

/* 单幕：theater 占满可用宽，v4 的 max-height/overflow 规则已由 .stage-stage 接管 */
.stage-frame .theater { width: 100%; margin: 0 auto; animation: v4-scene-in 0.35s ease both; }

/* 底部导航条：z-index 60（全屏 mode 1 是 50，面板 70） */
.stage-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px 16px;
  border-top: 1px solid var(--sline);
  background: rgba(10, 10, 10, 0.92);
  backdrop-filter: blur(8px);
}
.stage-nav button {
  appearance: none;
  background: transparent;
  border: 1px solid var(--sline);
  border-radius: 0;
  padding: 8px 18px;
  font: 13px var(--sans);
  letter-spacing: 0.06em;
  color: var(--stext);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.stage-nav button:hover:not(:disabled) { color: var(--sacc); border-color: var(--sacc); }
.stage-nav button:disabled { color: var(--sfaint); cursor: not-allowed; }
.stage-nav button:focus-visible { outline: 2px solid var(--sacc); outline-offset: 2px; }

/* 键盘焦点出口（↑↓ 选中） */
.stage-frame .exit-chip--focused {
  border-color: var(--sacc);
  background: var(--sacc-soft);
  outline: 2px solid var(--sacc);
  outline-offset: 2px;
}

/* 履历面板动作镜像 */
.stage-frame .history-panel__actions {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--sline);
}
.stage-frame .history-panel__actions button {
  appearance: none;
  background: transparent;
  border: 1px solid var(--sline);
  border-radius: 0;
  padding: 6px 14px;
  font: 12px var(--sans);
  letter-spacing: 0.05em;
  color: var(--stext);
  cursor: pointer;
}
.stage-frame .history-panel__actions button:hover:not(:disabled) { color: var(--sacc); border-color: var(--sacc); }
.stage-frame .history-panel__actions button:disabled { color: var(--sfaint); cursor: not-allowed; }

/* 移动端 */
@media (max-width: 920px) {
  .stage-frame { padding: 20px 12px 88px; }
  .stage-nav { gap: 8px; }
  .stage-nav button { padding: 8px 10px; font-size: 12px; }
}
```

同时把既有 `.stage-frame[data-has-router] .theater:not([data-active])`（原 `.post-wrap--stage[data-has-router]…`，sed 后）规则删除——v5 由 React 保证单幕，规则已无对象；`.stage-frame[data-has-router] .theater[data-active]` 的 `max-height/overflow-y` 一并删除（滚动归 `.stage-stage`）。

- [ ] **Step 3: 全局验收**

```bash
cd D:/myspace/myblog
pnpm typecheck
pnpm test
pnpm validate:explore
pnpm build
```

Expected: typecheck 0 错；测试全绿（v4 基线 + 新增约 15+）；validate 失败 0；build 成功产出 9 路由（`/` + 5 blog + 3 domain）。

人工抽查（`pnpm dev`）：
- `/blog/ai-digital-employee/`：全屏舞台、无滚动条、唯一 `.theater`、底栏 4 按钮；
- `←/→/↑↓/Enter/Esc` 手感；履历面板动作镜像；`✕ 退出` 回列表；
- `/blog/kill-the-legacy-password/`：旧版式无回归；
- 首页卡片「▶ 进入舞台」入口直达。

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "style(explore): v5 全屏舞台 CSS——stage-frame 作用域迁移 + 导航条 + 焦点出口"
```

---

## 完成定义（DoD）

- [ ] 全部 10 个任务提交完成
- [ ] `pnpm typecheck` 0 错；`pnpm test` 全绿；`pnpm validate:explore` 失败 0；`pnpm build` 成功
- [ ] spec §11 验收标准逐条人工核对（键盘表 §3.2、无 JS 降级、无 explore 文章零回归）
