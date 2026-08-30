# 探索视图 v5（全屏单幕 + MDX 退出）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 探索文章进入即全屏舞台（唯一幕 + 底栏导航 + 键盘 + 退出）；内容格式迁 `scenes/*.tsx`；`article.mdx` / `@mdx-js` / `remark-*` / `gray-matter` / 双文件 content 层整条 MDX 管线退役；只保留 ai-digital-employee 一篇文章。

**Architecture:** 数据层单一化——`meta.yaml`（文章元数据）+ `explore.yaml`（幕结构）+ `scenes/<id>.tsx`（幕正文），`lib/content.ts` 合并 `content.client.ts` 后以 `?raw` glob 同源读取（SSG/浏览器一致）。视图层 Stage（`main.stage-frame`）内 ExploreRouter 管 hash/履历/键盘，SceneRoute 按 activeId 从 glob 直接挂载场景组件，Answer 五段式 + Director 演出（v4 逻辑不动）。CSS 作用域 `.post-wrap--stage` → `.stage-frame`。

**Tech Stack:** React 19 + react-router-dom 6 + GSAP（demo 不动）+ js-yaml + vitest/@testing-library + vite-react-ssg。**移除**：@mdx-js/react、@mdx-js/rollup、remark-gfm、remark-frontmatter、gray-matter。

**Spec:** `docs/superpowers/specs/2026-08-30-explore-view-design-v5.md`

## Global Constraints

- demo 动画（`content/posts/ai-digital-employee/scene*.tsx`）一行不改
- explore.yaml schema 不变；`mode` 沿用
- URL 结构不变：`/blog/<slug>/#<scene-id>`
- CSS 保留：`body.stage-locked { overflow: hidden }`、CRT 视觉变量（`--stage-bg/--sacc/--sline` 等）
- 无 JS 降级：SSG 直出 entry 幕完整 HTML（React 无 runtime 时不隐藏内容）
- 每个任务收尾：`pnpm typecheck` 0 错 + `pnpm test` 全绿（T10 全局验收另跑 validate + build）
- conventional commits（feat/fix/refactor/test/style/docs/build + scope）
- 迁移翻译规则（spec §9）：markdown → JSX 按映射表执行；幕标题（h2/h3）不迁移（yaml label 兜底）；`<Answer>` 外内容一律不迁移
- import 路径：scenes/*.tsx 位于 `content/posts/<slug>/scenes/`，到 `src/components/` 是 `../../../../src/components/...`

---

### Task 1: useKeyboardShortcuts hook

**Files:**
- Create: `src/components/explore/useKeyboardShortcuts.ts`
- Test: `src/components/explore/useKeyboardShortcuts.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `useKeyboardShortcuts(handlers: KeyboardHandlers, enabled?: boolean): void`；`KeyboardHandlers = { onBack; onNext; onArrowUp; onArrowDown; onEnter; onEsc: () => void }`。Task 5 在 ExploreRouter 以 `useKeyboardShortcuts({...}, !panelOpen)` 消费（enabled=false 时仅 Esc 活着）。

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

  it('→↑↓Enter/Esc 各触发对应 handler', () => {
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
 * enabled=false：履历面板打开态——非 Esc 键全部失效（Esc 始终活着）。
 * handlers 走 ref，引用变化不重挂监听。
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
git commit -m "feat(explore): v5 useKeyboardShortcuts hook（六键 + editable 守卫 + 面板态只留 Esc）"
```

---

### Task 2: runtime 扩展——back/canBack/panelOpen/onExit

**Files:**
- Modify: `src/components/explore/AnswerContext.ts`
- Modify: `src/components/explore/ExploreRouter.tsx`
- Test: `src/components/explore/ExploreRouter.test.tsx`（追加）

**Interfaces:**
- Consumes: 既有 `useHistoryStack`（stack/pop/canPop）
- Produces: `ExploreRuntime` v5 接口（T3/T4/T5/T6 依赖）：

```ts
export interface ExploreRuntime {
  activeId: string
  goTo: (id: string) => void
  onActivate: (id: string, skip: () => void) => void
  firstActivation: boolean
  /* v5 新增 */
  back: () => void                 // 栈≤1 no-op；否则 pop + pushState + 切激活
  canBack: boolean                 // stack.length > 1
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  onExit: () => void               // Stage 传入的退出回调（ref 透传）
}
```

ExploreRouter Props 增加 `onExit?: () => void`。`focusedExitIdx` 由 Task 3 追加（本任务不做）。

- [ ] **Step 1: Write the failing test**（ExploreRouter.test.tsx 追加；RtProbe 放文件顶部 probe 区）

```tsx
/** v5：runtime 全字段暴露，供断言与触发。 */
function RtProbe() {
  const rt = useContext(ExploreRuntimeContext)!
  return (
    <div data-testid="rt" data-can-back={String(rt.canBack)} data-panel-open={String(rt.panelOpen)}>
      <button data-testid="rt-back" onClick={rt.back} />
      <button data-testid="rt-go" onClick={() => rt.goTo('q-b')} />
      <button data-testid="rt-open-panel" onClick={() => rt.setPanelOpen(true)} />
      <button data-testid="rt-exit" onClick={rt.onExit} />
    </div>
  )
}

describe('ExploreRouter v5 runtime 扩展', () => {
  function renderWithRt() {
    return render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config}>
          <RtProbe />
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
  }

  it('canBack=false 时 back() no-op；goTo 后 canBack=true，back() 回前一幕', () => {
    const { getByTestId } = renderWithRt()
    expect(getByTestId('rt').dataset.canBack).toBe('false')
    fireEvent.click(getByTestId('rt-back'))
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    fireEvent.click(getByTestId('rt-go'))
    expect(getByTestId('rt').dataset.canBack).toBe('true')
    fireEvent.click(getByTestId('rt-back'))
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
  })

  it('onExit prop 透传 + setPanelOpen 状态', () => {
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

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/ExploreRouter.test.tsx`
Expected: FAIL（rt.back 等字段不存在/类型错）

- [ ] **Step 3: Implement**

`AnswerContext.ts`：`ExploreRuntime` 按上文扩展。

`ExploreRouter.tsx`：
1. Props + `onExitRef`（模式同 `onReadyRef`：`useRef(onExit)` + `useEffect` 同步）；
2. runtime useMemo 扩展：

```tsx
const runtime = useMemo<ExploreRuntime>(() => ({
  activeId,
  goTo,
  onActivate,
  firstActivation: !!firstActivation[activeId],
  back,
  canBack: history.stack.length > 1,
  panelOpen,
  setPanelOpen,
  onExit: () => onExitRef.current?.(),
}), [activeId, goTo, onActivate, firstActivation, back, history.stack.length, panelOpen])
```

3. mount effect 里 `document.querySelector('main.post-wrap--stage')` 改为 `document.querySelector('main.stage-frame, main.post-wrap--stage')`（T8 落 stage-frame 前的过渡兼容）；
4. **既有「Esc 关闭面板」独立 effect 删除**，Esc 并入 Task 3 的 onEsc——本任务先临时接 `onExit: () => { panelOpen ? setPanelOpen(false) : onExitRef.current?.() }`（T3 落 hook 后语义不变，只是搬进 hook handlers），确保 T2→T3 之间面板 Esc 不断线。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/explore/ExploreRouter.test.tsx`
Expected: PASS（既有 + 新增 2）

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
- Modify: `src/components/explore/AnswerContext.ts`、`src/components/explore/Answer.tsx`
- Test: `src/components/explore/ExploreRouter.test.tsx`、`src/components/explore/ExitChips.test.tsx`

**Interfaces:**
- Consumes: T1 `useKeyboardShortcuts`；T2 runtime
- Produces: runtime + `focusedExitIdx: number | null`（当前幕出口平铺序，features→questions）；`ExitChips` Props + `baseIdx: number`

- [ ] **Step 1: Write the failing tests**

ExploreRouter.test.tsx 追加：

```tsx
describe('ExploreRouter v5 键盘', () => {
  function renderWithKeys() {
    return render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config}>
          <RtProbe />
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
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

  it('↑↓ 循环焦点出口，Enter 跳到焦点出口', () => {
    window.history.replaceState(null, '', '/blog/test/#q-b')
    renderWithKeys()
    expect(screen.getByTestId('rt').dataset.focus).toBe('null')
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(screen.getByTestId('rt').dataset.focus).toBe('0')
    fireEvent.keyDown(window, { key: 'ArrowDown' })  // 仅 1 个出口，wrap 回 0
    expect(screen.getByTestId('rt').dataset.focus).toBe('0')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
  })

  it('panelOpen 时非 Esc 键失效，Esc 关面板', () => {
    renderWithKeys()
    fireEvent.click(screen.getByTestId('rt-open-panel'))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('rt').dataset.panelOpen).toBe('false')
  })
})
```

RtProbe 的 div 追加 `data-focus={String(rt.focusedExitIdx ?? 'null')}`。

ExitChips.test.tsx 追加（按该文件既有 Provider/runtime 构造方式，runtime 加 `focusedExitIdx` 字段后）：

```tsx
it('focusedExitIdx 命中时对应 chip 有 exit-chip--focused 类', () => {
  // 渲染 features 组 baseIdx=0 + questions 组 baseIdx=len(features)
  // focusedExitIdx=0 → 第一个 feature chip 有 class；questions 组 focusedExitIdx=1 → 无
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/explore/ExploreRouter.test.tsx src/components/explore/ExitChips.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

ExploreRouter.tsx：

```tsx
const [focusedExitIdx, setFocusedExitIdx] = useState<number | null>(null)
useEffect(() => { setFocusedExitIdx(null) }, [activeId])

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

runtime 追加 `focusedExitIdx`；`panelOpenRef` 同 ref 模式。T2 的临时 onExit 内联删除（onEsc 接管）。

ExitChips.tsx：Props + `baseIdx: number`；本地出口 `<a>` className 追加：

```tsx
runtime?.focusedExitIdx === baseIdx + i ? ' exit-chip--focused' : ''
```

Answer.tsx：`<ExitChips group="features" baseIdx={0} .../>`、`<ExitChips group="questions" baseIdx={(scene?.features ?? []).length} .../>`。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/explore && pnpm typecheck`
Expected: PASS 全部 + 0 错

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/ExploreRouter.tsx src/components/explore/ExitChips.tsx src/components/explore/Answer.tsx src/components/explore/AnswerContext.ts src/components/explore/ExploreRouter.test.tsx src/components/explore/ExitChips.test.tsx
git commit -m "feat(explore): v5 键盘接线 + 焦点出口（↑↓ 循环 / Enter 跳转 / chip 焦点态）"
```

---

### Task 4: StageNav 底部导航条 + HistoryPanel 动作镜像 + 删 HistoryFAB

**Files:**
- Create: `src/components/explore/StageNav.tsx`
- Modify: `src/components/explore/HistoryPanel.tsx`
- Modify: `src/components/explore/ExploreRouter.tsx`（移除 HistoryFAB 渲染；传 HistoryPanel 新 props）
- Delete: `src/components/explore/HistoryFAB.tsx`
- Test: `src/components/explore/StageNav.test.tsx`（新建）、`src/components/explore/HistoryPanel.test.tsx`（追加）

**Interfaces:**
- Consumes: T2 runtime（back/canBack/goTo/onExit/panelOpen/setPanelOpen）、ExploreConfigContext
- Produces: `StageNav`（无 props，全走 context）；HistoryPanel Props 扩展 `{ canBack, onBack, nextLabel, onNext, onExit }`

- [ ] **Step 1: Write the failing tests**

StageNav.test.tsx（新建）：

```tsx
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
    onExit: vi.fn(), focusedExitIdx: null, ...over,
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
  it('渲染 4 个按钮', () => {
    renderNav(mkRt({}))
    expect(screen.getByText('◀ 返回')).toBeInTheDocument()
    expect(screen.getByText('⏵ 继续：B')).toBeInTheDocument()
    expect(screen.getByText('履历 ▾')).toBeInTheDocument()
    expect(screen.getByText('✕ 退出')).toBeInTheDocument()
  })

  it('canBack=false 时返回 disabled；启用时点击调 back', () => {
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

  it('继续/履历/退出动作分发', () => {
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

HistoryPanel.test.tsx 追加：

```tsx
it('v5 动作镜像：◀ 返回（disabled 态）/ ⏵ 继续：<label> / ✕ 退出', () => {
  const onBack = vi.fn(), onNext = vi.fn(), onExit = vi.fn()
  render(
    <HistoryPanel open onClose={noop} stack={[]} onJumpTo={noop}
      canBack={false} onBack={onBack} nextLabel="⏵ 继续：B" onNext={onNext} onExit={onExit}>
      <div />
    </HistoryPanel>,
  )
  expect(screen.getByText('◀ 返回').closest('button')).toBeDisabled()
  expect(screen.getByText('⏵ 继续：B')).toBeInTheDocument()
  fireEvent.click(screen.getByText('✕ 退出'))
  expect(onExit).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/explore/StageNav.test.tsx src/components/explore/HistoryPanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

StageNav.tsx：

```tsx
import { useContext } from 'react'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'

/** v5 底部导航条（spec §2.2）：◀ 返回 / ⏵ 继续（主线下一幕）/ 履历 ▾ / ✕ 退出。零状态。 */
export default function StageNav() {
  const config = useContext(ExploreConfigContext)!
  const rt = useContext(ExploreRuntimeContext)!
  const idx = config.scenes.findIndex((s) => s.id === rt.activeId)
  const next = config.scenes[(idx + 1) % config.scenes.length]
  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <button type="button" disabled={!rt.canBack} aria-label="返回上一幕" onClick={rt.back}>◀ 返回</button>
      <button type="button" onClick={() => rt.goTo(next.id)}>⏵ 继续：{next.label}</button>
      <button type="button" aria-label="打开履历面板" onClick={() => rt.setPanelOpen(true)}>履历 ▾</button>
      <button type="button" aria-label="退出探索" onClick={rt.onExit}>✕ 退出</button>
    </nav>
  )
}
```

HistoryPanel.tsx：Props 扩展（spec §3.3），`history-panel__header` 下方插入：

```tsx
<div className="history-panel__actions">
  <button type="button" disabled={!canBack} onClick={onBack}>◀ 返回</button>
  <button type="button" onClick={onNext}>{nextLabel}</button>
  <button type="button" onClick={onExit}>✕ 退出</button>
</div>
```

ExploreRouter.tsx：删 `import HistoryFAB` 与渲染行；HistoryPanel 追加 props（`nextSceneId/nextSceneLabel` 由 activeId 算）：

```tsx
canBack={history.stack.length > 1}
onBack={back}
nextLabel={`⏵ 继续：${nextSceneLabel}`}
onNext={() => nextSceneId && goTo(nextSceneId)}
onExit={() => { setPanelOpen(false); onExitRef.current?.() }}
```

全仓 grep `HistoryFAB` 确认无残留。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/explore && pnpm typecheck`
Expected: PASS + 0 错

- [ ] **Step 5: Commit**

```bash
git add -A src/components/explore
git commit -m "feat(explore): v5 StageNav 底栏 + 履历面板动作镜像；删除 HistoryFAB"
```

---

### Task 5: 数据层——meta.yaml + content.ts 合并（MDX 退出第一刀）

**Files:**
- Create: `content/posts/ai-digital-employee/meta.yaml`
- Modify: `src/lib/content.ts`（重写数据读取）
- Modify: `src/lib/types.ts`（Post.body 删除）
- Delete: `src/lib/content.client.ts`
- Modify: `vite.config.ts`（删客户端 alias；mdx 插件族本任务先留着——T7 删文章时一并删）
- Test: `src/lib/content.test.ts`（改写）

**Interfaces:**
- Consumes: js-yaml（既有依赖）
- Produces: `getAllPosts/getPost/getPostsByDomain/getAllDomains/getWips/getFAQs/getSite` 签名不变（消费方 Home/PostList/Domain/Topbar 零改动）；`Post` 类型无 `body` 字段

meta.yaml 内容：

```yaml
title: 一个人撑起全公司技术，我是怎么安全地把 AI 接进生产系统的
slug: ai-digital-employee
domain: AI 与工程
date: 2026-08-29
anim_profile: architecture
status: published
excerpt: 公司技术就我一个人。我做的不是"ALL IN AI"，而是搭了一个 AI 数字员工平台——让 AI 走和人一模一样的权限、审批与审计通道，用协议仓库、统一身份、分级执行三层设计安全接入生产系统。
```

- [ ] **Step 1: 改写测试（先红）**

content.test.ts 重写为 meta.yaml 语义（保留既有断言风格）：

```ts
import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost, getAllDomains } from './content'

describe('content：meta.yaml 数据层（v5）', () => {
  it('读出 ai-digital-employee 的元数据', () => {
    const posts = getAllPosts()
    expect(posts).toHaveLength(1)
    const p = posts[0]
    expect(p.slug).toBe('ai-digital-employee')
    expect(p.title).toContain('AI 接进生产系统')
    expect(p.domain).toBe('AI 与工程')
    expect(p.date).toBe('2026-08-29')
    expect(p.status).toBe('published')
    expect(p.hasExplore).toBe(true)
    expect(p.exploreEntry?.id).toBe('q-problem')
  })

  it('getPost / getAllDomains 工作', () => {
    expect(getPost('ai-digital-employee')?.slug).toBe('ai-digital-employee')
    expect(getPost('nope')).toBeUndefined()
    expect(getAllDomains()[0].slug).toBe('AI 与工程')
  })

  it('Post 无 body 字段（MDX 退出）', () => {
    const p = getPost('ai-digital-employee')!
    expect('body' in p).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/content.test.ts`
Expected: FAIL（meta.yaml 不存在）

- [ ] **Step 3: Implement**

`lib/content.ts` 重写读取层（替换 fs/gray-matter 部分，保留排序/领域聚合逻辑）：

```ts
import yaml from 'js-yaml'
import type { Post, Domain, Wip, Faq, SiteConfig, AnimProfile, PostStatus } from './types'

/* v5：数据层单一化（SSG 与浏览器同源）。meta.yaml = 文章元数据；
 * article.mdx/gray-matter 已废除（spec §5）。 */
const metaYamls = import.meta.glob<string>('/content/posts/*/meta.yaml', {
  query: '?raw', import: 'default', eager: true,
})
const exploreYamls = import.meta.glob<string>('/content/posts/*/explore.yaml', {
  query: '?raw', import: 'default', eager: true,
})

const VALID_ANIM: AnimProfile[] = ['auto', 'data-narrative', 'architecture', 'story']
const VALID_STATUS: PostStatus[] = ['draft', 'published', 'scheduled']

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

function slugOf(modulePath: string): string {
  return modulePath.split('/').slice(-2, -1)[0]
}

function exploreEntryOf(slug: string): Post['exploreEntry'] {
  const key = Object.keys(exploreYamls).find((k) => slugOf(k) === slug)
  if (!key) return undefined
  try {
    const parsed = yaml.load(exploreYamls[key]) as any
    const entry = parsed?.scenes?.find((s: any) => s.id === parsed?.entry)
    if (parsed?.entry && entry?.label) return { id: String(parsed.entry), label: String(entry.label) }
  } catch { /* yaml 坏不阻塞列表；validate:explore 报 */ }
  return undefined
}

export function getAllPosts(): Post[] {
  const posts: Post[] = []
  for (const [modulePath, raw] of Object.entries(metaYamls)) {
    let data: any
    try { data = yaml.load(raw) } catch { console.warn(`[content] ${modulePath} yaml 解析失败`); continue }
    if (!data?.title || !data?.date) { console.warn(`[content] ${modulePath} 缺 title/date`); continue }
    const slug = slugOf(modulePath)
    const anim = (data.anim_profile as AnimProfile) || 'auto'
    const status = (data.status as PostStatus) || 'published'
    const date = data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date).slice(0, 10)
    posts.push({
      slug: (data.slug as string) || slugify(String(data.title)) || slug,
      title: String(data.title),
      domain: (data.domain as string) || 'general',
      date,
      anim_profile: VALID_ANIM.includes(anim) ? anim : 'auto',
      status: VALID_STATUS.includes(status) ? status : 'published',
      excerpt: String(data.excerpt || ''),
      fileName: slug,
      hasExplore: Object.keys(exploreYamls).some((k) => slugOf(k) === slug),
      exploreEntry: exploreEntryOf(slug),
    })
  }
  return posts.filter((p) => p.status === 'published').sort((a, b) => (a.date < b.date ? 1 : -1))
}

// getPost / getPostsByDomain / getAllDomains / getWips / getFAQs / getSite 原样保留
// （getWips 保持「目录不存在返回 []」；jsdom/vitest 无 content/wip 时同行为）
```

`types.ts`：`Post` 删 `body: string` 行（`fileName` 保留——SceneClip/Stage 仍用）。

删 `lib/content.client.ts`；`vite.config.ts` 删 `resolve.alias` 里 content 客户端替换段（`environments`/`isSsrBuild` 相关 alias 逻辑整块移除；mdx 插件保留到 T7）。

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib && pnpm typecheck && pnpm dev --help 2>/dev/null; true`
Expected: content.test PASS + typecheck 0（dev 冒烟到 T8 做全量验证）

- [ ] **Step 5: Commit**

```bash
git add -A src/lib content/posts/ai-digital-employee/meta.yaml vite.config.ts
git commit -m "feat(content): v5 meta.yaml 数据层——content.ts 合并 client 层，gray-matter 退役"
```

---

### Task 6: scenes/*.tsx 内容迁移（11 个场景）

**Files:**
- Create: `content/posts/ai-digital-employee/scenes/q-problem.tsx` 等 11 个
- Test: `content/posts/ai-digital-employee/scenes/scenes.test.tsx`（渲染冒烟）

**Interfaces:**
- Consumes: `SceneClip`（`../../../../src/components/explore/SceneClip`）、`ArchDiagram` + `diagrams/ai-digital-employee` 的 figX（同前缀）、webp 静态资源路径 `/posts/ai-digital-employee/*.webp`
- Produces: 每文件 `export default function SceneX(): JSX.Element`——文件名（去掉 .tsx）= yaml scenes[].id

- [ ] **Step 1: 迁移模板（先写一个做样板）**

`scenes/q-problem.tsx`：

```tsx
import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-problem（yaml label：公司的技术问题，都是谁在解决？） */
export default function QProblem() {
  return (
    <>
      <SceneClip demo="message-flood" />
      <p>公司的技术人员只有我一个。软件出问题找我、后台不会用找我、什么东西怎么配置也找我。</p>
      <img src="/posts/ai-digital-employee/solo-tech.webp"
        alt="公司技术就我一个人的日常：软件崩了、后台不会用、配置不会改，全都来找我" />
      <p>我自然想到：能不能做一个 AI 数字分身，替我答疑、替我处理这些重复劳动？</p>
    </>
  )
}
```

其余 10 个按 spec §9 映射从 `git show 0f778c5:content/posts/ai-digital-employee/article.mdx`（或当前 HEAD 前版本）逐幕翻译：
- `<SceneClip demo="X" />` 原样保留；
- 段落/表格/列表/引用/图片按 Global Constraints 翻译规则转 JSX；
- `**bold**` → `<strong>`；行内代码 → `<code>`；
- `<ArchDiagram {...figArchitecture} caption="..." />` 保留，import 路径加一层；
- h2/h3 标题不迁移；`<Answer>` 开闭标签去掉。

- [ ] **Step 2: 写渲染冒烟测试**

`scenes/scenes.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { parseExploreYaml } from '../../../../src/lib/explore'
import { setCurrentSlug } from '../../../../src/components/explore/SceneClip'
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const DIR = join(__dirname)
const yamlRaw = readFileSync(join(DIR, '../explore.yaml'), 'utf-8')
const config = parseExploreYaml(yamlRaw)
if (!config.ok) throw new Error(config.error)

const sceneIds = config.value.scenes.map((s) => s.id)
const files = readdirSync(DIR).filter((f) => f.endsWith('.tsx') && f !== 'scenes.test.tsx')

describe('scenes/*.tsx 与 explore.yaml 对齐 + 渲染', () => {
  it('文件集合与 yaml scenes[].id 完全一致', () => {
    const fileIds = files.map((f) => basename(f, '.tsx')).sort()
    expect(fileIds).toEqual([...sceneIds].sort())
  })

  it.each(files)('%s 渲染出非空内容', (f) => {
    const id = basename(f, '.tsx')
    setCurrentSlug('ai-digital-employee')
    const Mod = require(join(DIR, f)).default as () => JSX.Element  // vitest 支持 require 动态导入；如不可用改 await import
    const { container } = render(<MemoryRouter><Mod /></MemoryRouter>)
    expect(container.innerHTML.length).toBeGreaterThan(0)
  })
})
```

（实现时若 `require` 在 ESM vitest 下不可用，改为顶部静态 import 11 个模块循环断言——文件集合一致性测试保持动态读目录。）

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm vitest run content/posts/ai-digital-employee/scenes`
Expected: PASS（对齐 1 + 渲染 11）

- [ ] **Step 4: Commit**

```bash
git add content/posts/ai-digital-employee/scenes
git commit -m "feat(content): v5 场景组件迁移——article.mdx 正文翻译为 11 个 scenes/*.tsx"
```

---

### Task 7: MDX 管线退役（删文章 + 删插件 + 卸依赖）

**Files:**
- Delete: `content/posts/ai-it-system/`、`bi-agent-7-days-saved-200k/`、`kill-the-legacy-password/`、`shixi-open-source-study-app/`（整目录）
- Delete: `content/posts/ai-digital-employee/article.mdx`
- Modify: `vite.config.ts`（删 mdx 插件族：`mdx({...})`、`remarkExportFrontmatter`、`yamlToExpression`、`rehypeHeadingIds`、`fileSeen/getSeen`；`remarkGfm`/`remarkFrontmatter` import 一并删）
- Modify: `package.json`（卸载 `@mdx-js/react` `@mdx-js/rollup` `remark-gfm` `remark-frontmatter` `gray-matter`）
- Modify: `src/pages/Post.tsx`（删 mdxModules glob；本任务先给 explore 分支渲染 `<StageBodyPlaceholder/>` 占位——T8 接 SceneRoute）
- Test: `src/lib/explore.test.ts`（getRawAnswerIds 相关用例改删）

**Interfaces:**
- Produces: 构建无 MDX 插件；`lib/explore.ts` 的 `getRawAnswerIds` 删除（T9 换 scenes 对齐校验）

- [ ] **Step 1: 删 4 个文章目录 + article.mdx**

```bash
git rm -r content/posts/ai-it-system content/posts/bi-agent-7-days-saved-200k content/posts/kill-the-legacy-password content/posts/shixi-open-source-study-app
git rm content/posts/ai-digital-employee/article.mdx
```

- [ ] **Step 2: vite.config.ts 瘦身**

删 mdx 插件与所有 remark/rehype 辅助函数，`plugins` 只剩 `react()` 与 `serve-post-assets`；删 `import { visit } from 'unist-util-visit'`、`slugifyHeading` import。

- [ ] **Step 3: 卸依赖**

```bash
pnpm remove @mdx-js/react @mdx-js/rollup remark-gfm remark-frontmatter gray-matter
```

- [ ] **Step 4: explore.ts / Post.tsx 清理**

- `lib/explore.ts`：删 `getRawAnswerIds`；`validateExploreConfig` 规则 2/3（Answer 存在性）暂改「跳过」（T9 换 scenes 对齐规则）；
- `lib/explore.test.ts`：删引用 `getRawAnswerIds` 的用例；
- `pages/Post.tsx`：删 `mdxModules`/`MDXProvider`/`Answer`/`SceneClip` import 与 explore 渲染分支——`post.hasExplore` 时返回 `<main className="stage-frame" data-article-slug={post.slug}><p style={{color:'#888'}}>舞台在 T8 接线</p></main>` 占位（T8 替换）；非 explore 分支（article.mdx 文档流）整块删除，改「敬请期待」占位页；
- `src/components/explore/Answer.test.tsx` 等测试暂仍通过（Answer 组件未删）。

- [ ] **Step 5: 全局验证**

Run: `pnpm typecheck && pnpm test`
Expected: 0 错 + 全绿（Home/PostList/Domain 正常——它们只依赖数据层接口签名）

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor!: MDX 管线退役——删 4 篇旧文章与 article.mdx、vite mdx 插件族、@mdx-js/remark/gray-matter 依赖"
```

---

### Task 8: Stage 页 + SceneRoute + Answer 改造 + Post 薄壳

**Files:**
- Create: `src/pages/Stage.tsx`、`src/components/explore/SceneRoute.tsx`
- Modify: `src/pages/Post.tsx`（薄壳）、`src/components/explore/Answer.tsx`（props 改造 + label 兜底）
- Modify: `src/components/explore/Answer.test.tsx`（props 变更适配）
- Test: `src/pages/Post.test.tsx`（改写）、`src/components/explore/SceneRoute.test.tsx`（新建）

**Interfaces:**
- Consumes: T4 StageNav、T2/T3 runtime、scenes glob（T6 产物）、`setCurrentSlug`、`exploreConfigFor`（从 Post.tsx 迁入 Stage.tsx）
- Produces: `Stage({ post })`、`SceneRoute({ slug })`（context 取 activeId）、`Answer({ scene, body })`

- [ ] **Step 1: 写 SceneRoute 失败测试**

```tsx
// src/components/explore/SceneRoute.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SceneRoute from './SceneRoute'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'
import type { ExploreConfig, ExploreRuntime } from '../../lib/types'

vi.mock('./Answer', () => ({
  default: ({ scene }: any) => <div data-testid="answer">{scene.id}</div>,
}))

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: 'A', demo: 'da' },
    { id: 'q-b', label: 'B', demo: 'db' },
  ],
}

function rt(activeId: string): ExploreRuntime {
  return {
    activeId, goTo: vi.fn(), onActivate: vi.fn(), firstActivation: true,
    back: vi.fn(), canBack: false, panelOpen: false, setPanelOpen: vi.fn(),
    onExit: vi.fn(), focusedExitIdx: null,
  }
}

/** fixture glob：__fixtures__/scene-route-fixture/<slug>/scenes/<id>.tsx */
// 实现时在 src/components/explore/__fixtures__/scene-route-fixture/t1/scenes/ 放 q-a.tsx / q-b.tsx
// （各 default export () => <div>场景X</div>），SceneRoute 的 glob 命中它们。

describe('SceneRoute', () => {
  it('activeId 决定挂载哪个场景组件', () => {
    render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRuntimeContext.Provider value={rt('q-b')}>
          <SceneRoute slug="t1" />
        </ExploreRuntimeContext.Provider>
      </ExploreConfigContext.Provider>,
    )
    expect(screen.getByTestId('answer').textContent).toBe('q-b')
  })

  it('无匹配场景渲染 null', () => {
    const { container } = render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRuntimeContext.Provider value={rt('nope')}>
          <SceneRoute slug="t1" />
        </ExploreRuntimeContext.Provider>
      </ExploreConfigContext.Provider>,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

（fixture 场景文件路径须与 SceneRoute 的 glob 前缀 `/content/posts/*/scenes/*.tsx` 匹配——若不便构造，SceneRoute 的 glob 路径以常量注入（`sceneModulesFor(prefix)` 导出），测试注入 fixture glob。执行者二选一，保持测试可跑。）

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/explore/SceneRoute.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement SceneRoute + Stage + Answer + Post**

SceneRoute.tsx（spec §7.3）：glob `/content/posts/*/scenes/*.tsx` eager；`slugOf(k) === slug && basename(k,'.tsx') === activeId` 取组件；`<div className="stage-stage"><Answer key={scene.id} scene={scene} body={<Scene/>} /></div>`。

Answer.tsx 改造：
- Props `{ id, children }` → `{ scene: ExploreScene; body: ReactNode }`；内部 `const id = scene.id`；
- `partition(body)` 不变（child.type === SceneClip 判定——同模块实例，直接 import 的 SceneClip 命中）；
- `headTitle = heading ?? <h2>{scene.label}</h2>`；`hasHead = !!(headTitle || idx >= 0)`；
- Director 演出层完全不动。

Stage.tsx（spec §7.2）：`main.stage-frame` + `ExploreRouter onExit` + `<SceneRoute slug/>` + `<StageNav/>`；`setCurrentSlug(post.slug)` 渲染期同步调用（SceneClip 反查机制不变）；`exploreConfigFor` 从旧 Post.tsx 迁入。

Post.tsx 薄壳（spec §7.1）：`post.hasExplore ? <Stage post={post}/> : <main className="post-wrap"><p>这篇文章还在写作中，敬请期待。</p></main>`；T7 占位替换掉。

Post.test.tsx 改写：

```tsx
describe('<Post> v5', () => {
  beforeEach(() => { document.body.className = '' })
  afterEach(() => { document.body.className = '' })

  it('explore 文章：渲染 stage-frame 舞台；无 post-meta/h1/post-nav；唯一 theater；body stage-locked', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    const main = container.querySelector('main')!
    expect(main.className).toContain('stage-frame')
    expect(main.querySelector('.post-meta')).toBeNull()
    expect(main.querySelector('.post-nav')).toBeNull()
    expect(container.querySelectorAll('.theater')).toHaveLength(1)
    expect(container.querySelector('.theater')!.id).toBe('q-problem')
    expect(main.querySelector('.stage-nav')).not.toBeNull()
    expect(document.body.classList.contains('stage-locked')).toBe(true)
  })
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/pages src/components/explore && pnpm typecheck`
Expected: PASS + 0 错

- [ ] **Step 5: Commit**

```bash
git add src/pages/Post.tsx src/pages/Stage.tsx src/pages/Post.test.tsx src/components/explore/SceneRoute.tsx src/components/explore/SceneRoute.test.tsx src/components/explore/Answer.tsx src/components/explore/Answer.test.tsx src/components/explore/__fixtures__
git commit -m "feat(explore): v5 Stage 页接线——SceneRoute 单幕挂载 + Answer scene/body 改造 + Post 薄壳"
```

---

### Task 9: validate 规则更新 + PostList 文案

**Files:**
- Modify: `src/lib/explore.ts`（scenes 双向对齐校验）、`scripts/validate-explore.ts`、`src/components/PostList.tsx`
- Test: `src/lib/explore.test.ts`

**Interfaces:**
- Produces: `validateScenesAlignment(slug, config, sceneDir): string[]`；PostList 入口文案 `▶ 进入舞台 · {label}`

- [ ] **Step 1: 写失败测试**（explore.test.ts 追加）

```ts
describe('validateScenesAlignment', () => {
  it('yaml 有 id 无文件 → 报错；有文件无 id → 报错；对齐 → 空', () => {
    expect(validateScenesAlignment('x', { scenes: [{ id: 'a' }, { id: 'b' }] } as any, ['a.tsx', 'c.tsx']))
      .toEqual([
        expect.stringContaining('b'),
        expect.stringContaining('c'),
      ])
  })
})
```

PostList.test.tsx（新建）：

```tsx
it('explore 卡片显示「▶ 进入舞台 · <label>」', () => {
  const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
  const btn = container.querySelector('.explore-entry-btn')!
  expect(btn.textContent).toContain('进入舞台')
  expect(btn.closest('a')!.getAttribute('href')).toMatch(/ai-digital-employee/)
})
```

- [ ] **Step 2: 实现**

explore.ts：

```ts
/** v5：scenes/<id>.tsx 与 yaml scenes[].id 双向对齐 */
export function validateScenesAlignment(
  slug: string,
  config: ExploreConfig,
  sceneFiles: string[],   // scenes/ 目录下的 .tsx 文件名（含扩展名）
): string[] {
  const errors: string[] = []
  const ids = new Set(config.scenes.map((s) => s.id))
  const files = new Set(sceneFiles.map((f) => f.replace(/\.tsx$/, '')))
  for (const s of config.scenes) if (!files.has(s.id)) errors.push(`[${slug}] 场景 ${s.id} 缺 scenes/${s.id}.tsx`)
  for (const f of files) if (!ids.has(f)) errors.push(`[${slug}] scenes/${f}.tsx 未被 yaml 引用`)
  return errors
}
```

scripts/validate-explore.ts：T7 跳过的规则 2/3 替换为 `validateScenesAlignment`（读 scenes 目录）；`getRawAnswerIds` 调用删除；meta.yaml 必填校验（title/date 缺即报错）。PostList 一行文案改动。

- [ ] **Step 3: 验证 + Commit**

```bash
pnpm vitest run src/lib src/components && pnpm validate:explore && pnpm typecheck
git add -A && git commit -m "feat(explore): v5 validate scenes 双向对齐 + meta 必填；列表入口「▶ 进入舞台」"
```

---

### Task 10: CSS 舞台化 + 全局验收

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 作用域迁移**

```bash
sed -i 's/\.post-wrap--stage/.stage-frame/g' src/styles/global.css
```

手工删除无宿主规则：`.stage-frame .post-meta,…` 组、`.stage-frame .post-meta {…}`、`.stage-frame > h1 {…}`、`.stage-frame .post-excerpt {…}`、`.stage-frame .history-fab` 全段（含 `__back/__panel/__depth`/focus-visible）、`.stage-frame[data-has-router] .theater:not([data-active])` 与 `[data-active]` 的 max-height/overflow 规则（单幕由 React 保证；滚动归 `.stage-stage`）。

- [ ] **Step 2: 新增样式**（spec §4.3）

```css
/* ===== v5 全屏舞台 ===== */
.stage-frame {
  position: fixed; inset: 0;
  width: 100vw; height: 100vh; overflow: hidden;
  background: var(--stage-bg, #0A0A0A); color: var(--stext, #E6E6E6);
  display: flex; flex-direction: column;
  padding: 32px clamp(16px, 4vw, 56px) 96px;
}
.stage-frame .stage-stage {
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center;
  max-width: 1120px; margin: 0 auto; width: 100%;
}
.stage-frame .theater { width: 100%; margin: 0 auto; animation: v4-scene-in 0.35s ease both; }
.stage-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center; gap: 20px;
  padding: 12px 16px; border-top: 1px solid var(--sline);
  background: rgba(10, 10, 10, 0.92); backdrop-filter: blur(8px);
}
.stage-nav button {
  appearance: none; background: transparent; border: 1px solid var(--sline); border-radius: 0;
  padding: 8px 18px; font: 13px var(--sans); letter-spacing: 0.06em;
  color: var(--stext); cursor: pointer; transition: color 0.15s ease, border-color 0.15s ease;
}
.stage-nav button:hover:not(:disabled) { color: var(--sacc); border-color: var(--sacc); }
.stage-nav button:disabled { color: var(--sfaint); cursor: not-allowed; }
.stage-nav button:focus-visible { outline: 2px solid var(--sacc); outline-offset: 2px; }
.stage-frame .exit-chip--focused {
  border-color: var(--sacc); background: var(--sacc-soft);
  outline: 2px solid var(--sacc); outline-offset: 2px;
}
.stage-frame .history-panel__actions {
  display: flex; gap: 10px; padding: 12px 20px; border-bottom: 1px solid var(--sline);
}
.stage-frame .history-panel__actions button {
  appearance: none; background: transparent; border: 1px solid var(--sline); border-radius: 0;
  padding: 6px 14px; font: 12px var(--sans); letter-spacing: 0.05em;
  color: var(--stext); cursor: pointer;
}
.stage-frame .history-panel__actions button:hover:not(:disabled) { color: var(--sacc); border-color: var(--sacc); }
.stage-frame .history-panel__actions button:disabled { color: var(--sfaint); cursor: not-allowed; }
@media (max-width: 920px) {
  .stage-frame { padding: 20px 12px 88px; }
  .stage-nav { gap: 8px; }
  .stage-nav button { padding: 8px 10px; font-size: 12px; }
}
```

- [ ] **Step 3: 全局验收**

```bash
pnpm typecheck && pnpm test && pnpm validate:explore && pnpm build
```

Expected: typecheck 0；测试全绿；validate 0/0；build 成功（路由 `/` + `/blog/ai-digital-employee/` + `/domain/AI 与工程/`）。

人工冒烟（`pnpm dev`）：
- `/blog/ai-digital-employee/` 全屏舞台、唯一 theater、底栏 4 按钮、键盘六键、面板镜像、✕ 退出；
- mode 1/2 演出正常、点击空白 skip、↻ 重看；
- 首页列表「▶ 进入舞台」直达；domain 页正常；
- 构建产物无 MDX chunk（`grep -r mdx dist/assets | wc -l` = 0）。

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "style(explore): v5 全屏舞台 CSS——stage-frame 作用域 + 导航条 + 焦点出口 + 面板动作"
```

---

## 完成定义（DoD）

- [ ] 全部 10 个任务提交完成
- [ ] `pnpm typecheck` 0 错；`pnpm test` 全绿；`pnpm validate:explore` 失败 0；`pnpm build` 成功
- [ ] package.json 无 @mdx-js/* / remark-* / gray-matter；vite.config.ts 无 mdx 插件
- [ ] spec §11 验收标准逐条核对（键盘表 §3.2、无 JS 降级、构建产物无 MDX chunk）
