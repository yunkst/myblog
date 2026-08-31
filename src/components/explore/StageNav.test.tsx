import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import StageNav from './StageNav'
import { ExploreRuntimeContext, type ExploreRuntime } from './AnswerContext'
import type { ExploreScene } from '../../lib/types'

/* v5 review fix:StageNav 改消费 runtime.nextScene(不再自行 findIndex 查表,
 * 也不再需要 ExploreConfigContext)。 */
const nextScene: ExploreScene = { id: 'q-b', label: 'B', demo: 'db' }

function mkRt(over: Partial<ExploreRuntime>): ExploreRuntime {
  return {
    activeId: 'q-a', goTo: vi.fn(), onActivate: vi.fn(), firstActivation: true,
    back: vi.fn(), canBack: false, panelOpen: false, setPanelOpen: vi.fn(),
    onExit: vi.fn(), focusedExitIdx: null, nextScene, ...over,
  } as ExploreRuntime
}

function renderNav(rt: ExploreRuntime) {
  return render(
    <ExploreRuntimeContext.Provider value={rt}>
      <StageNav />
    </ExploreRuntimeContext.Provider>,
  )
}

describe('StageNav', () => {
  it('渲染 4 个按钮', () => {
    renderNav(mkRt({}))
    expect(screen.getByText('◀ 返回')).toBeInTheDocument()
    expect(screen.getByText('⏵ 继续：B')).toBeInTheDocument()
    expect(screen.getByText('路线图 ▾')).toBeInTheDocument()
    expect(screen.getByText('✕ 退出')).toBeInTheDocument()
  })

  it('canBack=false 时返回 disabled；启用时点击调 back', () => {
    const back = vi.fn()
    const { rerender } = renderNav(mkRt({ back }))
    expect(screen.getByText('◀ 返回').closest('button')).toBeDisabled()
    rerender(
      <ExploreRuntimeContext.Provider value={mkRt({ back, canBack: true })}>
        <StageNav />
      </ExploreRuntimeContext.Provider>,
    )
    fireEvent.click(screen.getByText('◀ 返回'))
    expect(back).toHaveBeenCalledOnce()
  })

  it('继续/履历/退出动作分发', () => {
    const rt = mkRt({ canBack: true })
    renderNav(rt)
    fireEvent.click(screen.getByText('⏵ 继续：B'))
    expect(rt.goTo).toHaveBeenCalledWith('q-b')
    fireEvent.click(screen.getByText('路线图 ▾'))
    expect(rt.setPanelOpen).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByText('✕ 退出'))
    expect(rt.onExit).toHaveBeenCalledOnce()
  })

  it('nextScene 缺失时隐藏「⏵ 继续」按钮(其余 3 个保留)', () => {
    renderNav(mkRt({ nextScene: undefined }))
    expect(screen.getByText('◀ 返回')).toBeInTheDocument()
    expect(screen.queryByText(/⏵ 继续/)).toBeNull()
    expect(screen.getByText('路线图 ▾')).toBeInTheDocument()
    expect(screen.getByText('✕ 退出')).toBeInTheDocument()
  })
})
