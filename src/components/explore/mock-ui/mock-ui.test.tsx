import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChatPane, Bubble, Typewriter, MockCursor } from './index'

describe('mock-ui 原子', () => {
  it('ChatPane 渲染标题与 body', () => {
    render(<ChatPane title="公司群"><Bubble side="left">消息</Bubble></ChatPane>)
    expect(document.querySelector('.mock-chat-head')?.textContent).toContain('公司群')
    expect(document.querySelector('.mock-bubble-left')).not.toBeNull()
  })
  it('Bubble right / data-mock-bubble', () => {
    render(<Bubble side="right" id="b1">hi</Bubble>)
    expect(document.getElementById('b1')?.getAttribute('data-mock-bubble')).toBe('')
  })
  it('Typewriter 渲染初始文本', () => {
    render(<Typewriter text="加载中" />)
    expect(document.querySelector('.mock-typing')?.textContent).toBe('加载中')
  })
  it('MockCursor 可定位', () => {
    render(<MockCursor id="cur" />)
    expect(document.getElementById('cur')?.className).toBe('mock-cursor')
  })
})
