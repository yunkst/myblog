import { describe, it, expect, vi } from 'vitest'
import { gsap } from 'gsap'
import { createDemoHandle } from './SceneController'

describe('createDemoHandle v2', () => {
  it('play/pause/reset/replay 驱动 timeline', () => {
    const tl = gsap.timeline()
    tl.to({}, { duration: 1 })
    const h = createDemoHandle(tl)
    h.play()
    expect(tl.isActive() || tl.progress() > 0).toBe(true)
    h.pause()
    h.reset()
    expect(tl.progress()).toBe(0)
    h.replay()
    h.kill()
  })
  it('finished() 在播完后为 true', () => {
    const tl = gsap.timeline()
    tl.to({}, { duration: 0.1 })
    const h = createDemoHandle(tl)
    expect(h.finished()).toBe(false)
    tl.progress(1)
    expect(h.finished()).toBe(true)
    h.kill()
  })
  it('reduced-motion 下 play 直达终态', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    } as any)
    const tl = gsap.timeline()
    tl.to({}, { duration: 1 })
    const h = createDemoHandle(tl)
    h.play()
    expect(tl.progress()).toBe(1)
    h.kill()
    matchMedia.mockRestore()
  })
})
