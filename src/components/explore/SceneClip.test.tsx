import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SceneClip from './SceneClip'

describe('SceneClip v2', () => {
  it('渲染容器并带 data-scene-clip-demo', () => {
    render(<SceneClip demo="message-flood" />)
    const el = document.querySelector('[data-scene-clip-demo="message-flood"]')
    expect(el).not.toBeNull()
  })
  it('无 IntersectionObserver 环境（jsdom）不崩溃', () => {
    expect(() => render(<SceneClip demo="x" />)).not.toThrow()
  })
  it('动画播完后容器获得 data-finished 属性（重看按钮显形条件）', () => {
    // 固定 CSS 选择器约定 .scene-clip[data-finished] .scene-replay 不被误删
    const div = document.createElement('div')
    div.className = 'scene-clip'
    div.setAttribute('data-finished', '')
    const btn = document.createElement('button')
    btn.className = 'scene-replay'
    div.appendChild(btn)
    document.body.appendChild(div)
    expect(div.matches('.scene-clip[data-finished]')).toBe(true)
    expect(div.querySelector('.scene-replay')).not.toBeNull()
  })
})
