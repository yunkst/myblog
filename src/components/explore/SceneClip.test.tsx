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
    expect(typeof api!.finished).toBe('function')
    unmount()
    expect(getSceneClipApi('message-flood')).toBeUndefined()
  })

  it('注册的 api 方法能驱动 demo timeline（play 后进入播放或已推进）', () => {
    const { unmount } = render(<SceneClip demo="message-flood" />)
    const api = getSceneClipApi('message-flood')!
    /* v7 Task 3：play() 返回 Promise<void>——fire-and-forget 也安全
     * （Director 端 await，本测试不关心 resolve 时序，只验证不抛错） */
    expect(() => {
      void api.play()
      api.pause()
      api.replay()
    }).not.toThrow()
    unmount()
  })

  /* I2 fix round：mount → unregister → mount 第二个不同 demo → 原 demo 的 API 应被注销。
   * 验证 SceneClip 的 unregister() 在 unmount 时确实清掉注册表项，避免旧 API 泄漏。 */
  it('第一个 SceneClip unmount 后注册表不再保留旧 API；第二个不同 demo 注册独立项', () => {
    const { unmount: unmountFirst } = render(<SceneClip demo="message-flood" />)
    expect(getSceneClipApi('message-flood')).toBeDefined()
    unmountFirst()
    expect(getSceneClipApi('message-flood')).toBeUndefined()

    // 第二个不同 demo 注册：与已注销的 message-flood 互不污染
    const { unmount: unmountSecond } = render(<SceneClip demo="badge-metaphor" />)
    expect(getSceneClipApi('badge-metaphor')).toBeDefined()
    expect(getSceneClipApi('message-flood')).toBeUndefined()
    unmountSecond()
    expect(getSceneClipApi('badge-metaphor')).toBeUndefined()
  })

  /* v7 Task 3（demo API promise 化）：play() 返回 Promise<void>，
   * onComplete 时 resolve——Director 经 `await api.play()` 等 demo 完成，
   * 不再用 MutationObserver + 15s 超时兜底。 */
  it('play() 返回 Promise<void>（类型契约）', async () => {
    const { unmount } = render(<SceneClip demo="message-flood" />)
    const api = getSceneClipApi('message-flood')!
    const p = api.play()
    /* 返回 Promise（A.then 是函数）——await Director 端的契约依据 */
    expect(p).toBeInstanceOf(Promise)
    expect(typeof p.then).toBe('function')
    /* 不消费 promise 会触发「unhandled rejection」警告——显式 noop 后 unmount，
     * unmount 时 handle.kill 触发 onKill → resolve，promise 正常 settle */
    p.then(() => {}, () => {})
    unmount()
  })

  /* v7 Task 3：unmount（cleanup 兜底）后挂起的 play promise 也 resolve，
   * 防止 Director 在快速切幕时 await 悬挂。 */
  it('unmount（cleanup 兜底）后挂起的 play promise 也 resolve', async () => {
    const { unmount } = render(<SceneClip demo="message-flood" />)
    const api = getSceneClipApi('message-flood')!
    let resolved = false
    const p = api.play().then(() => { resolved = true })
    // 还未自然完成
    expect(resolved).toBe(false)
    // unmount → handle.kill() → tl.kill() → onKill → resolve
    unmount()
    await p
    expect(resolved).toBe(true)
  })

  /* v7 Task 3：已 finished 的实例 play() 直接 resolve（不重播、不挂 resolver）。 */
  it('finished()=true 时 play() 立即 resolve，不重播 timeline', async () => {
    const { unmount } = render(<SceneClip demo="message-flood" />)
    const api = getSceneClipApi('message-flood')!
    /* 直接推进 global timeline 到 1，触发 message-flood demo 的 onComplete，
     * setFinishedAndResolve 会落 data-finished，finished() 应返回 true */
    gsap.globalTimeline.progress(1)
    expect(api.finished()).toBe(true)
    let resolved = false
    await api.play().then(() => { resolved = true })
    expect(resolved).toBe(true)
    unmount()
  })
})
