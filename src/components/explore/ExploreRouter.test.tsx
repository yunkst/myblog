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

function renderRouter() {
  return render(
    <ExploreConfigContext.Provider value={config}>
      <ExploreRouter config={config}>
        <AnswerProbe id="q-a" />
        <AnswerProbe id="q-b" />
        <GoProbe target="q-b" />
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

  it('Esc 关闭履历面板；FAB 打开面板', () => {
    renderRouter()
    expect(document.querySelector('.history-panel')).toBeNull()
    fireEvent.click(screen.getByLabelText(/打开履历面板/))
    expect(document.querySelector('.history-panel')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('.history-panel')).toBeNull()
  })

  it('hydration 后 main.post-wrap--stage 挂 data-has-router', () => {
    const main = document.createElement('main')
    main.className = 'post-wrap post-wrap--stage'
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
    fireEvent.click(screen.getByLabelText(/打开履历面板/))
    // 点击第 01 项（q-a）→ 截断栈到 [q-a] + 激活 q-a + 关面板
    fireEvent.click(screen.getByText('q-a'))
    expect(document.querySelector('.history-panel')).toBeNull()
    expect(screen.getByTestId('scene-q-a')).toHaveAttribute('data-active')
    const stack = JSON.parse(sessionStorage.getItem('explore.history.t')!) as { sceneId: string }[]
    expect(stack.map((s) => s.sceneId)).toEqual(['q-a'])
  })
})
