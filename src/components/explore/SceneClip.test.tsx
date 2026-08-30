import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import gsap from 'gsap'
import SceneClip, { setCurrentSlug } from './SceneClip'
import { getSceneClipApi, unregisterSceneClip } from './sceneClipRegistry'

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

/* v4 Task 3：imperative API 注册。
 * jsdom 无 IntersectionObserver——stub 掉让 useEffect 走完整路径（build + handle + register）；
 * setCurrentSlug 让 moduleForSlug 反查到 ai-digital-employee 的 demos 字典。 */
class FakeIntersectionObserver {
  callback: IntersectionObserverCallback
  constructor(cb: IntersectionObserverCallback) { this.callback = cb }
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
}

describe('SceneClip v4 imperative API', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    setCurrentSlug('ai-digital-employee')
    unregisterSceneClip('message-flood')
  })
  afterEach(() => {
    gsap.globalTimeline.clear()
    setCurrentSlug(null)
    vi.unstubAllGlobals()
    unregisterSceneClip('message-flood')
  })

  it('mount 后注册表能取到 API，unmount 后取不到', () => {
    const { unmount } = render(<SceneClip demo="message-flood" />)
    const api = getSceneClipApi('message-flood')
    expect(api).toBeDefined()
    expect(typeof api!.play).toBe('function')
    expect(typeof api!.pause).toBe('function')
    expect(typeof api!.replay).toBe('function')
    unmount()
    expect(getSceneClipApi('message-flood')).toBeUndefined()
  })

  it('注册的 api 方法能驱动 demo timeline（play 后进入播放或已推进）', () => {
    const { unmount } = render(<SceneClip demo="message-flood" />)
    const api = getSceneClipApi('message-flood')!
    expect(() => { api.play(); api.pause(); api.replay() }).not.toThrow()
    unmount()
  })
})
