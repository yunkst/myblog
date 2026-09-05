import { render, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExitChips from './ExitChips'
import { ExploreRuntimeContext, type ExploreRuntime } from './AnswerContext'
import type { ExploreConfig } from '../../lib/types'

/* v14：goExternal（整页跳转）经 vi.mock 替换——jsdom 的 location.assign 不可 redefine。
 * vi.hoisted 让 mock fn 在被提升的 vi.mock 工厂之前就绪。 */
const goExternal = vi.hoisted(() => vi.fn())
vi.mock('../../lib/explore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/explore')>()
  return { ...actual, goExternal }
})

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [{ id: 'q-a', label: 'A', demo: 'd' }, { id: 'q-b', label: 'B', demo: 'd' }],
}

const runtime: ExploreRuntime = {
  activeId: 'q-a',
  goTo: vi.fn(),
  onActivate: vi.fn(),
  firstActivation: true,
  /* v5 runtime 新增字段（ExitChips 不消费，补 no-op 满足接口） */
  back: vi.fn(),
  canBack: false,
  panelOpen: false,
  setPanelOpen: vi.fn(),
  onExit: vi.fn(),
  focusedExitIdx: null,
}

describe('ExitChips', () => {
  it('本地目标渲染 #id 链接，点击走 ExploreRouter.goTo（不再 scrollIntoView）', () => {
    render(
      <ExploreRuntimeContext.Provider value={runtime}>
        <ExitChips group="features" baseIdx={0} config={config}
          exits={[{ text: '看B', to: 'q-b' }]} />
      </ExploreRuntimeContext.Provider>,
    )
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.getAttribute('href')).toBe('#q-b')
    const scroll = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scroll
    fireEvent.click(a!)
    expect(runtime.goTo).toHaveBeenCalledWith('q-b')
    expect(scroll).not.toHaveBeenCalled()
  })
  it('路由未挂时（runtime=null）退回 v3 行为：pushState + smooth 滚动', () => {
    render(<ExitChips group="features" baseIdx={0} config={config}
      exits={[{ text: '看B', to: 'q-b' }]} />)
    const target = document.createElement('div')
    target.id = 'q-b'
    document.body.appendChild(target)
    const scroll = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scroll
    fireEvent.click(document.querySelector('.exit-chip')!)
    expect(scroll).toHaveBeenCalled()
    expect(window.location.hash).toBe('#q-b')
  })
  it('跨文章目标渲染原生 <a>（整页跳转，浏览器原生处理锚点滚动）', () => {
    render(<ExitChips group="questions" baseIdx={0} config={config}
      exits={[{ text: '去那篇', to: { post: 'other', scene: 'entry' } }]} />)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.tagName).toBe('A')
    expect(a?.getAttribute('href')).toBe('/blog/other/#entry')
  })

  /* v14（用户裁定）：跨文章出口与本地区分——↗ 另一篇 角标 + 两段式确认 */
  it('跨文章 chip 挂 exit-chip--cross 且带 ↗ 另一篇 标记；本地 chip 没有', () => {
    render(<ExitChips group="features" baseIdx={0} config={config}
      exits={[{ text: '看B', to: 'q-b' }, { text: '去那篇', to: { post: 'other', scene: 'entry' } }]} />)
    const chips = document.querySelectorAll('.exit-chip')
    expect(chips[0].className).not.toContain('exit-chip--cross')
    expect(chips[0].querySelector('.exit-chip-cross')).toBeNull()
    expect(chips[1].className).toContain('exit-chip--cross')
    expect(chips[1].querySelector('.exit-chip-cross')?.textContent).toContain('另一篇')
  })
  it('跨文章 chip 第一次点击不跳转，转确认态；再点才 assign 跳转', () => {
    render(<ExitChips group="questions" baseIdx={0} config={config}
      exits={[{ text: '去那篇', to: { post: 'other', scene: 'entry' } }]} />)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')!

    // 第一次点击：preventDefault + 确认态（文案提示目标文章，不再带原文案）
    fireEvent.click(a)
    expect(goExternal).not.toHaveBeenCalled()
    expect(a.className).toContain('exit-chip--confirm')
    expect(a.textContent).toContain('即将跳转到另一篇')
    expect(a.textContent).toContain('再点一次确认')
    // 目录里查不到 other 这篇 → 回退显示 slug
    expect(a.textContent).toContain('other')

    // 第二次点击：确认跳转
    fireEvent.click(a)
    expect(goExternal).toHaveBeenCalledWith('/blog/other/#entry')
  })
  it('确认态超时未再点 → 自动复原为普通态（文案与样式还原）', async () => {
    vi.useFakeTimers()
    try {
      goExternal.mockClear()
      render(<ExitChips group="questions" baseIdx={0} config={config}
        exits={[{ text: '去那篇', to: { post: 'other', scene: 'entry' } }]} />)
      const a = document.querySelector<HTMLAnchorElement>('.exit-chip')!
      fireEvent.click(a)
      expect(a.className).toContain('exit-chip--confirm')
      /* 超时回调里的 setState 不在事件里，包 act 让 React flush 到 DOM */
      await act(async () => { vi.advanceTimersByTime(4000) })
      expect(a.className).not.toContain('exit-chip--confirm')
      expect(a.textContent).not.toContain('再点一次确认')
      // 复原后再点 = 重新进入确认态，不跳转
      fireEvent.click(a)
      expect(goExternal).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  /* v5 Task 3：focusedExitIdx 命中 → 对应 chip 挂 exit-chip--focused（平铺序 = features→questions） */
  it('focusedExitIdx 命中时对应 chip 有 exit-chip--focused 类', () => {
    const exits = [{ text: '看B', to: 'q-b' }, { text: '看C', to: 'q-c' }]
    const withFocus: ExploreRuntime = { ...runtime, focusedExitIdx: 0 }
    const { rerender } = render(
      <ExploreRuntimeContext.Provider value={withFocus}>
        <ExitChips group="features" baseIdx={0} config={config} exits={exits} />
      </ExploreRuntimeContext.Provider>,
    )
    const chips = () => document.querySelectorAll<HTMLAnchorElement>('.exit-chip')
    // focusedExitIdx=0 → 第 1 个 feature chip（baseIdx 0 + i 0）命中
    expect(chips()[0].className).toContain('exit-chip--focused')
    expect(chips()[1].className).not.toContain('exit-chip--focused')

    // questions 组 baseIdx = len(features) = 2，focusedExitIdx=1 不落在组内 → 无焦点
    rerender(
      <ExploreRuntimeContext.Provider value={withFocus}>
        <ExitChips group="questions" baseIdx={2} config={config} exits={exits} />
      </ExploreRuntimeContext.Provider>,
    )
    expect(chips()[0].className).not.toContain('exit-chip--focused')
    expect(chips()[1].className).not.toContain('exit-chip--focused')

    // questions 组 focusedExitIdx=3（baseIdx 2 + i 1）→ 第 2 个 chip 命中
    rerender(
      <ExploreRuntimeContext.Provider value={{ ...runtime, focusedExitIdx: 3 }}>
        <ExitChips group="questions" baseIdx={2} config={config} exits={exits} />
      </ExploreRuntimeContext.Provider>,
    )
    expect(chips()[0].className).not.toContain('exit-chip--focused')
    expect(chips()[1].className).toContain('exit-chip--focused')
  })
})