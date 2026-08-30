import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import StageNav from './StageNav'
import { ExploreConfigContext, ExploreRuntimeContext, type ExploreRuntime } from './AnswerContext'
import type { ExploreConfig } from '../../lib/types'

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
