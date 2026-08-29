import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExitChips from './ExitChips'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [{ id: 'q-a', label: 'A', demo: 'd' }, { id: 'q-b', label: 'B', demo: 'd' }],
}

describe('ExitChips', () => {
  it('本地目标渲染 #id 链接，点击 smooth 滚动', () => {
    render(<ExitChips group="features" config={config}
      exits={[{ text: '看B', to: 'q-b' }]} />)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.getAttribute('href')).toBe('#q-b')
    // 目标锚点必须真实存在，否则可选链不会触发 scrollIntoView（与 SceneToc 测试同款手法）
    const target = document.createElement('div')
    target.id = 'q-b'
    document.body.appendChild(target)
    const scroll = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scroll
    fireEvent.click(a!)
    expect(scroll).toHaveBeenCalled()
  })
  it('跨文章目标渲染原生 <a>（整页跳转，浏览器原生处理锚点滚动）', () => {
    render(<ExitChips group="questions" config={config}
      exits={[{ text: '去那篇', to: { post: 'other', scene: 'entry' } }]} />)
    const a = document.querySelector<HTMLAnchorElement>('.exit-chip')
    expect(a?.tagName).toBe('A')
    expect(a?.getAttribute('href')).toBe('/blog/other/#entry')
  })
})