import { render, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import StageNav from './StageNav'
import { ExploreRuntimeContext, type ExploreRuntime } from './AnswerContext'

/* v5 review fix:StageNav 改消费 runtime（不再自行 findIndex 查表,
 * 也不再需要 ExploreConfigContext）。
 * v8：新增「☰ 平铺」Link（useParams 取 slug）——需 Router + 带 :slug 的 Route 上下文。
 * v11：「下一幕」按钮移除（前进导航由幕内出口与场景地图覆盖），runtime 不再有 nextScene。 */

function mkRt(over: Partial<ExploreRuntime>): ExploreRuntime {
  return {
    activeId: 'q-a', goTo: vi.fn(), onActivate: vi.fn(), firstActivation: true,
    back: vi.fn(), canBack: false, panelOpen: false, setPanelOpen: vi.fn(),
    onExit: vi.fn(), focusedExitIdx: null, ...over,
  } as ExploreRuntime
}

function navTree(rt: ExploreRuntime) {
  return (
    <MemoryRouter initialEntries={['/blog/test-post/']}>
      <Routes>
        <Route
          path="blog/:slug"
          element={
            <ExploreRuntimeContext.Provider value={rt}>
              <StageNav />
            </ExploreRuntimeContext.Provider>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

function renderNav(rt: ExploreRuntime) {
  return render(navTree(rt))
}

describe('StageNav', () => {
  it('渲染 3 个按钮 + 平铺全文链接', () => {
    renderNav(mkRt({}))
    expect(screen.getByText('◀ 上一幕')).toBeInTheDocument()
    expect(screen.queryByText(/下一幕/)).toBeNull()
    expect(screen.getByText('场景地图')).toBeInTheDocument()
    expect(screen.getByText('✕ 退出舞台')).toBeInTheDocument()
    /* v8：平铺阅读入口（Link → /blog/<slug>/flat/） */
    const flat = screen.getByRole('link', { name: '平铺阅读全文' })
    expect(flat).toHaveAttribute('href', '/blog/test-post/flat/')
  })

  it('canBack=false 时返回 disabled；启用时点击调 back', () => {
    const back = vi.fn()
    const { rerender } = renderNav(mkRt({ back }))
    expect(screen.getByText('◀ 上一幕').closest('button')).toBeDisabled()
    rerender(navTree(mkRt({ back, canBack: true })))
    fireEvent.click(screen.getByText('◀ 上一幕'))
    expect(back).toHaveBeenCalledOnce()
  })

  it('场景地图/退出动作分发', () => {
    const rt = mkRt({ canBack: true })
    renderNav(rt)
    fireEvent.click(screen.getByText('场景地图'))
    expect(rt.setPanelOpen).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByText('✕ 退出舞台'))
    expect(rt.onExit).toHaveBeenCalledOnce()
  })
})
