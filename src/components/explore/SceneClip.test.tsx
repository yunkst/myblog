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
})
