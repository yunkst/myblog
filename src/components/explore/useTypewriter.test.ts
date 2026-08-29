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

  it('时间单位是秒语义：默认 28ms/字，整段 duration 约 chars*0.028+0.06 秒（T5 评审单位错位回归）', () => {
    const el = document.createElement('p')
    el.textContent = '七个字呢'
    const tl = buildTypewriterTimeline(el)!
    // 4 字 * 0.028s + 0.06s restore 尾巴 ≈ 0.172s（不是 4*28+60 秒）
    expect(tl.duration()).toBeGreaterThan(0.1)
    expect(tl.duration()).toBeLessThan(0.3)
  })

  it('真实时间流速下打字与 restore 都会发生（不依赖 progress 跳进）', async () => {
    const el = document.createElement('p')
    el.innerHTML = 'ab<em>c</em>'
    const original = el.innerHTML
    const tl = buildTypewriterTimeline(el, { charMs: 16 })!
    tl.play(0)
    // 30ms 时处于打字中段（3 字 × 16ms = 48ms 才打完）：纯文本部分揭示、innerHTML 未恢复
    await new Promise((r) => setTimeout(r, 30))
    const midText = el.textContent!
    expect(midText.length).toBeGreaterThanOrEqual(1)
    expect(midText.length).toBeLessThanOrEqual(3)
    expect(el.innerHTML).not.toBe(original)   // 打字中：标记尚未回归
    // restore 触发后（duration ≈ 108ms 已过）：标记回归
    await new Promise((r) => setTimeout(r, 120))
    expect(el.innerHTML).toBe(original)
  })
})
