import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExitChips from './ExitChips'
import { ExploreRuntimeContext, type ExploreRuntime } from './AnswerContext'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [{ id: 'q-a', label: 'A', demo: 'd' }, { id: 'q-b', label: 'B', demo: 'd' }],
}

const runtime: ExploreRuntime = {
  activeId: 'q-a',
  goTo: vi.fn(),
  onActivate: vi.fn(),
  firstActivation: true,
}

describe('ExitChips', () => {
  it('本地目标渲染 #id 链接，点击走 ExploreRouter.goTo（不再 scrollIntoView）', () => {
    render(
      <ExploreRuntimeContext.Provider value={runtime}>
        <ExitChips group="features" config={config}
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
    render(<ExitChips group="features" config={config}
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
    render(<ExitChips group="questions" config={config}
      exits={[{ text: '去那篇', to: { post: 'other', scene: 'entry' } }]} />)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.tagName).toBe('A')
    expect(a?.getAttribute('href')).toBe('/blog/other/#entry')
  })
})