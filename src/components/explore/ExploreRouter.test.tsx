import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContext, useEffect, useRef } from 'react'
import { ExploreRouter } from './ExploreRouter'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: 'A', demo: 'da' },
    { id: 'q-b', label: 'B', demo: 'db', features: [{ text: 'next', to: 'q-a' }] },
  ],
}

/** 模拟激活的 Answer：读 runtime、按 activeId/firstActivation 出 data-active，
 * 首次激活时经 onActivate 注入 skip。 */
function AnswerProbe({ id }: { id: string }) {
  const rt = useContext(ExploreRuntimeContext)
  const active = rt?.activeId === id
  const first = rt?.firstActivation ?? false
  const skipRef = useRef<() => void>(null)
  skipRef.current = () => {}
  useEffect(() => {
    if (active) rt?.onActivate(id, () => skipRef.current?.())
  })
  return (
    <div data-testid={`scene-${id}`}
      data-scene-id={id}
      data-active={active ? '' : undefined}
      data-first={first ? '' : undefined} />
  )
}

/** 模拟 ExitChips：点击调 goTo。 */
function GoProbe({ target }: { target: string }) {
  const rt = useContext(ExploreRuntimeContext)
  return (
    <button data-testid="go" type="button" onClick={() => rt?.goTo(target)}>
      go {target}
    </button>
  )
}

/** v5：runtime 全字段暴露，供断言与触发。 */
function RtProbe() {
  const rt = useContext(ExploreRuntimeContext)!
  return (
    <div data-testid="rt" data-can-back={String(rt.canBack)} data-panel-open={String(rt.panelOpen)}
      data-focus={String(rt.focusedExitIdx ?? 'null')}>
      <button data-testid="rt-back" onClick={rt.back} />
      <button data-testid="rt-go" onClick={() => rt.goTo('q-b')} />
      <button data-testid="rt-open-panel" onClick={() => rt.setPanelOpen(true)} />
      <button data-testid="rt-exit" onClick={rt.onExit} />
    </div>
  )
}

function renderRouter() {
  return render(
    <ExploreConfigContext.Provider value={config}>
      <ExploreRouter config={config}>
        <AnswerProbe id="q-a" />
        <AnswerProbe id="q-b" />
        <GoProbe target="q-b" />
        <RtProbe />
      </ExploreRouter>
    </ExploreConfigContext.Provider>,
  )
}

describe('ExploreRouter', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/blog/test/')
    sessionStorage.clear()
  })

  it('mount 时激活 entry 幕（无 hash）+ 首次激活 + seenScenes 标记 + stage-locked', () => {
    renderRouter()
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    expect(screen.getByTestId('scene-q-b')).not.toHaveAttribute('data-active')
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-first')
    expect(document.body.classList.contains('stage-locked')).toBe(true)
    expect(JSON.parse(sessionStorage.getItem('explore.seen.t')!)).toEqual(['q-a'])
  })

  it('hash 直达对应幕', () => {
    window.history.replaceState(null, '', '/blog/test/#q-b')
    renderRouter()
    expect(screen.getByTestId('scene-q-b')).toHaveAttribute('data-active')
    expect(screen.getByTestId('scene-q-a')).not.toHaveAttribute('data-active')
  })

  it('goTo：pushState hash + 履历入栈 + 激活幕切换', () => {
    renderRouter()
    fireEvent.click(screen.getByTestId('go'))
    expect(window.location.hash).toBe('#q-b')
    expect(screen.getByTestId('scene-q-b')).toHaveAttribute('data-active')
    expect(screen.getByTestId('scene-q-a')).not.toHaveAttribute('data-active')
    const stack = JSON.parse(sessionStorage.getItem('explore.history.t')!) as { sceneId: string }[]
    expect(stack.map((s) => s.sceneId)).toEqual(['q-a', 'q-b'])
  })

  it('回看已看过的幕：firstActivation=false（v4 不重播演出）', () => {
    sessionStorage.setItem('explore.seen.t', JSON.stringify(['q-a', 'q-b']))
    renderRouter()
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    expect(screen.getByTestId('scene-q-a')).not.toHaveAttribute('data-first')
    // seen 集合不因回看变化
    expect(JSON.parse(sessionStorage.getItem('explore.seen.t')!)).toEqual(['q-a', 'q-b'])
  })

  it('点击空白调激活幕注入的 skip；交互元素点击不触发', () => {
    const skip = vi.fn()
    function SkipProbe() {
      const rt = useContext(ExploreRuntimeContext)
      useEffect(() => {
        if (rt?.activeId === 'q-a') rt.onActivate('q-a', skip)
      })
      return null
    }
    render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config}>
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
          <SkipProbe />
          <GoProbe target="q-b" />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
    // 点击容器（非交互目标）→ skip 被调
    fireEvent.click(document.querySelector('.explore-router')!)
    expect(skip).toHaveBeenCalledTimes(1)
    // 点击交互元素 → 不触发 skip
    fireEvent.click(screen.getByTestId('go'))
    expect(skip).toHaveBeenCalledTimes(1)
  })

  it('有文本选区时点击空白不触发 skip（拖选复制误触守卫，I3 fix round）', () => {
    const skip = vi.fn()
    function SkipProbe() {
      const rt = useContext(ExploreRuntimeContext)
      useEffect(() => {
        if (rt?.activeId === 'q-a') rt.onActivate('q-a', skip)
      })
      return null
    }
    render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config}>
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
          <SkipProbe />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
    // 模拟「拖选文字」：mock getSelection 返回非空文本
    const realGetSelection = window.getSelection
    const fakeSelection = { toString: () => '被选中的文字', addRange: () => {}, removeAllRanges: () => {} }
    window.getSelection = vi.fn(() => fakeSelection as unknown as Selection)

    // 有选区时点击容器 → 不触发 skip
    fireEvent.click(document.querySelector('.explore-router')!)
    expect(skip).not.toHaveBeenCalled()

    // 清选区（mock 返回空串）→ 恢复正常 skip
    ;(fakeSelection as { toString: () => string }).toString = () => ''
    fireEvent.click(document.querySelector('.explore-router')!)
    expect(skip).toHaveBeenCalledTimes(1)

    window.getSelection = realGetSelection
  })

  it('Esc 关闭履历面板；履历按钮打开面板（底栏在 Stage 页挂 StageNav，此处走 runtime setPanelOpen 驱动）', () => {
    renderRouter()
    expect(document.querySelector('.history-panel')).toBeNull()
    fireEvent.click(screen.getByTestId('rt-open-panel'))
    expect(document.querySelector('.history-panel')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('.history-panel')).toBeNull()
  })

  it('hydration 后 main.stage-frame 挂 data-has-router', () => {
    const main = document.createElement('main')
    main.className = 'stage-frame'
    document.body.appendChild(main)
    try {
      renderRouter()
      expect(main.hasAttribute('data-has-router')).toBe(true)
    } finally {
      main.remove()
    }
  })

  it('面板点击历史项 jumpTo + 关闭面板', () => {
    renderRouter()
    fireEvent.click(screen.getByTestId('go')) // 栈 [q-a, q-b]
    fireEvent.click(screen.getByTestId('rt-open-panel'))
    // 点击第 01 项（q-a）→ 截断栈到 [q-a] + 激活 q-a + 关面板
    fireEvent.click(screen.getByText('q-a'))
    expect(document.querySelector('.history-panel')).toBeNull()
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    const stack = JSON.parse(sessionStorage.getItem('explore.history.t')!) as { sceneId: string }[]
    expect(stack.map((s) => s.sceneId)).toEqual(['q-a'])
  })

  /* I2 fix round：mount → push entry → goTo(b) → goTo(c) → back() → 回到 b（不是 a）；
   * 连续 back 三次应在 entry 停下、返回 disable（栈长 1 不可再退）。
   * v5：底栏移至 StageNav（Stage 页挂载），返回驱动走 runtime back 探针按钮（canBack 语义由 StageNav 消费）。 */
  it('集成：goTo/goTo/back → 回前一项（不是 entry）；连续 back 停在 entry 并 disable 返回', () => {
    const config3: ExploreConfig = {
      title: 't3', entry: 'q-a',
      scenes: [
        { id: 'q-a', label: 'A', demo: 'da' },
        { id: 'q-b', label: 'B', demo: 'db' },
        { id: 'q-c', label: 'C', demo: 'dc' },
      ],
    }
    function render3() {
      return render(
        <ExploreConfigContext.Provider value={config3}>
          <ExploreRouter config={config3}>
            <AnswerProbe id="q-a" />
            <AnswerProbe id="q-b" />
            <AnswerProbe id="q-c" />
            <GoProbe target="q-b" />
            <GoProbe target="q-c" />
            <RtProbe />
          </ExploreRouter>
        </ExploreConfigContext.Provider>,
      )
    }
    window.history.replaceState(null, '', '/blog/test3/')
    sessionStorage.clear()
    render3()
    // mount 后栈 [q-a]（reset），canBack=false
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    const backBtn = () => screen.getByTestId('rt-back')
    expect(screen.getByTestId('rt').dataset.canBack).toBe('false')

    // 手动 push 两次：q-b、q-c
    fireEvent.click(screen.getByText('go q-b'))
    fireEvent.click(screen.getByText('go q-c'))
    expect(window.location.hash).toBe('#q-c')
    expect(screen.getByTestId('scene-q-c')).toHaveAttribute('data-active')
    // 栈 [q-a, q-b, q-c]，canBack=true
    expect(screen.getByTestId('rt').dataset.canBack).toBe('true')

    // 一次 back → 回 q-b（不是 q-a）
    fireEvent.click(backBtn())
    expect(window.location.hash).toBe('#q-b')
    expect(screen.getByTestId('scene-q-b')).toHaveAttribute('data-active')
    expect(screen.getByTestId('scene-q-a')).not.toHaveAttribute('data-active')

    // 二次 back → 回 q-a
    fireEvent.click(backBtn())
    expect(window.location.hash).toBe('#q-a')
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')

    // 三次 back → 栈长 1，pop 返回 undefined，hash 与激活幕不变
    fireEvent.click(backBtn())
    expect(window.location.hash).toBe('#q-a')
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    // canBack=false（canPop = stack.length > 1）
    expect(screen.getByTestId('rt').dataset.canBack).toBe('false')

    // 栈确实只剩 1 项
    const stack = JSON.parse(sessionStorage.getItem('explore.history.t3')!) as { sceneId: string }[]
    expect(stack.map((s) => s.sceneId)).toEqual(['q-a'])
  })
})

describe('ExploreRouter v5 runtime 扩展', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/blog/test/')
    sessionStorage.clear()
  })

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

describe('ExploreRouter v5 键盘', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/blog/test/')
    sessionStorage.clear()
  })

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

  it('面板关闭态 Esc 调 onExit（T2→T3 hook 接管后路径）', () => {
    const onExit = vi.fn()
    render(
      <ExploreConfigContext.Provider value={config}>
        <ExploreRouter config={config} onExit={onExit}>
          <RtProbe />
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )
    expect(screen.getByTestId('rt').dataset.panelOpen).toBe('false')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledOnce()
  })
})
