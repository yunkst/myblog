import { describe, it, expect, vi, afterEach } from 'vitest'
import gsap from 'gsap'
import {
  playClipFullscreen,
  openClipLightbox,
  cancelClipFullscreen,
} from './clipFullscreen'

/* jsdom 视口 1024×768。clip mock 成 400×300：
 * 初始 fit scale = min(1024/400, 768/300) × 0.95 = 2.432；
 * 内容长高到 900（超过视口高）后应重夹到 min(2.56, 768/900) × 0.95 ≈ 0.811。 */
const INITIAL_SCALE = Math.min(1024 / 400, 768 / 300) * 0.95
const REFIT_SCALE = Math.min(1024 / 400, 768 / 900) * 0.95

/** ResizeObserver stub：jsdom 未实现；捕获回调供测试手动触发内容变化 */
const roStub = vi.hoisted(() => {
  class ROStub {
    static instances: ROStub[] = []
    cb: ResizeObserverCallback
    observed = false
    disconnected = false
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb
      ROStub.instances.push(this)
    }
    observe() { this.observed = true }
    unobserve() { /* 未用到 */ }
    disconnect() { this.disconnected = true }
  }
  return ROStub
})

/** top-layer 契约夹具：clip（<dialog>）留在原容器；尺寸可变（模拟图片迟到加载）。
 * showModal/close 由 vitest.setup.ts polyfill 提供。 */
function makeDialogClip() {
  const wrap = document.createElement('div')
  const clip = document.createElement('dialog')
  clip.className = 'scene-clip'
  let w = 400
  let h = 300
  clip.getBoundingClientRect = () => ({
    width: w, height: h, left: 100, top: 100,
    right: 100 + w, bottom: 100 + h, x: 100, y: 100,
    toJSON: () => ({}),
  }) as DOMRect
  // fit() 读 offsetWidth/Height（布局盒）；jsdom 恒 0——mock 成可变尺寸
  Object.defineProperty(clip, 'offsetWidth', { configurable: true, get: () => w })
  Object.defineProperty(clip, 'offsetHeight', { configurable: true, get: () => h })
  wrap.appendChild(clip)
  document.body.appendChild(wrap)
  return { wrap, clip, setSize: (nw: number, nh: number) => { w = nw; h = nh } }
}

afterEach(() => {
  gsap.globalTimeline.clear()
  vi.unstubAllGlobals()
  document.querySelectorAll('.scene-clip, .mode1-placeholder, .test-clip-wrap, .clip-lb-ui').forEach((el) => el.remove())
  document.body.classList.remove('clip-lb-live', 'clip-lb-grabbing')
})

describe('clipFullscreen（v12 top-layer 版）', () => {
  /* 本轮 bug 的核心回归：mode 1 在挂载瞬间展开，漫画图未加载时量到的高度≈0
   * （此处以「初始量测后内容长高」模拟图片加载完成）——fit 必须是会话不变量：
   * ResizeObserver 触发重夹，scale 收回视口内，而不是沿用展开瞬间的一次性测量。 */
  it('演出型：内容迟到长高时 ResizeObserver 重夹 scale（fit 是会话不变量）', async () => {
    vi.stubGlobal('ResizeObserver', roStub)
    const { wrap, clip, setSize } = makeDialogClip()
    let resolvePlay!: () => void
    const play = () => new Promise<void>((r) => { resolvePlay = r })

    void playClipFullscreen({ clip, play })
    // 展开即全屏（同步），初始 scale 按展开瞬间的量测
    expect(clip.open).toBe(true)
    expect(clip.parentElement).toBe(wrap)
    expect(wrap.querySelector('.mode1-placeholder')).not.toBeNull()
    expect(gsap.getProperty(clip, 'scale')).toBeCloseTo(INITIAL_SCALE, 3)

    // 图片加载完成 → 内容长高超视口 → RO 回调 → 重夹
    const ro = roStub.instances.at(-1)!
    expect(ro.observed).toBe(true)
    setSize(400, 900)
    ro.cb([], ro as unknown as ResizeObserver)
    expect(gsap.getProperty(clip, 'scale')).toBeCloseTo(REFIT_SCALE, 3)

    // 播完 → 缩窗还原：close + 占位移除 + 停止观察
    resolvePlay()
    await vi.waitFor(() => {
      expect(clip.open).toBe(false)
      expect(clip.style.position).toBe('')
      expect(wrap.querySelector('.mode1-placeholder')).toBeNull()
    }, { timeout: 3000 })
    expect(ro.disconnected).toBe(true)
    expect(gsap.getProperty(clip, 'scale')).toBe(1)
  })

  it('演出型：cancel 中途取消立即还原（幂等），晚 resolve 的 play 不再触发缩窗', async () => {
    vi.stubGlobal('ResizeObserver', roStub)
    const { wrap, clip } = makeDialogClip()
    let resolvePlay!: () => void
    void playClipFullscreen({ clip, play: () => new Promise<void>((r) => { resolvePlay = r }) })
    expect(clip.open).toBe(true)

    cancelClipFullscreen(clip)
    expect(clip.open).toBe(false)
    expect(wrap.querySelector('.mode1-placeholder')).toBeNull()
    expect(clip.style.position).toBe('')
    // 幂等：重复取消不抛错不变化
    expect(() => cancelClipFullscreen(clip)).not.toThrow()
    expect(clip.open).toBe(false)

    // 挂起的 play promise 事后 resolve：shrinkToHome 因会话已还原而短路，
    // 不得对已还原的 clip 重新挂 transform（等够缩窗时长验证）
    resolvePlay()
    await new Promise((r) => setTimeout(r, 750))
    expect(clip.open).toBe(false)
    expect(clip.style.transform).toBe('')
  })

  it('灯箱型：控制条进 body、光标类挂 body；ESC 触发缩回并全部还原', async () => {
    const { clip, wrap } = makeDialogClip()
    let resolvePlay!: () => void
    const done = openClipLightbox({ clip, play: () => new Promise<void>((r) => { resolvePlay = r }) })

    expect(clip.open).toBe(true)
    expect(clip.parentElement).toBe(wrap)
    // 控制条：↻ 重播 + ✕ 关闭 + 提示，挂在 body 的 popover 容器里
    expect(document.querySelectorAll('.clip-lb-close').length).toBe(2)
    expect(document.querySelector('.clip-lb-hint')).not.toBeNull()
    expect(document.body.classList.contains('clip-lb-live')).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await vi.waitFor(() => {
      expect(clip.open).toBe(false)
      expect(clip.style.position).toBe('')
      expect(wrap.querySelector('.mode1-placeholder')).toBeNull()
    }, { timeout: 3000 })
    // 控制条撤下、光标类清掉、done promise 收口
    expect(document.querySelector('.clip-lb-ui')).toBeNull()
    expect(document.body.classList.contains('clip-lb-live')).toBe(false)
    resolvePlay()
    await done
  })
})
