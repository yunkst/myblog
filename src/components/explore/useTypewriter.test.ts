import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import gsap from 'gsap'

/** jsdom 无真实 layout；matchMedia mock 成 reduce（验证直出分支）与非 reduce 两态 */
const mockedReduce = vi.hoisted(() => ({ value: false }))
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
  matches: mockedReduce.value && q.includes('prefers-reduced-motion'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})))

import { buildTypewriterTimeline } from './useTypewriter'

describe('buildTypewriterTimeline', () => {
  beforeEach(() => { mockedReduce.value = false })
  afterEach(() => { gsap.globalTimeline.clear() })

  it('reduced-motion 时返回 null（调用方直达终态）', () => {
    mockedReduce.value = true
    const el = document.createElement('p')
    el.textContent = '你好世界'
    expect(buildTypewriterTimeline(el)).toBeNull()
  })

  it('timeline 推进后字符逐个揭示、onComplete 恢复 innerHTML', () => {
    const el = document.createElement('p')
    el.innerHTML = '普通的<em>强调</em>文本'
    const original = el.innerHTML
    const tl = buildTypewriterTimeline(el)!
    expect(tl).not.toBeNull()
    // 打字开始：内容清空
    expect(el.textContent).toBe('')
    // 推进到中段：字符数 > 0 且 < 全部
    tl.progress(0.5)
    const mid = el.textContent!.length
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan('普通的强调文本'.length)
    // 推进到终点：innerHTML 恢复（强调标记视觉回归）
    tl.progress(1)
    expect(el.innerHTML).toBe(original)
  })
})