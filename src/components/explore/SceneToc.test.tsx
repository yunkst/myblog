import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SceneToc from './SceneToc'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: '场景A', demo: 'd-a' },
    { id: 'q-b', label: '场景B', demo: 'd-b' },
  ],
}

describe('SceneToc', () => {
  it('config 为 null 渲染 null', () => {
    const { container } = render(<SceneToc config={null} />)
    expect(container.innerHTML).toBe('')
  })
  it('目录顺序 = yaml 顺序，点击滚动到目标', () => {
    render(<SceneToc config={config} />)
    const items = document.querySelectorAll('.scene-toc a')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('场景A')
    const target = document.createElement('div')
    target.id = 'q-b'
    document.body.appendChild(target)
    const scroll = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scroll
    fireEvent.click(items[1])
    expect(scroll).toHaveBeenCalled()
  })
})