import { describe, it, expect } from 'vitest'
import { resolveTarget, isSamePage } from '../lib/nav'
import { handleFaqClick } from './scrollTo'

describe('scrollTo / handleFaqClick', () => {
  it('同页锚点走平滑滚动路径', () => {
    const navigate = () => { throw new Error('不应导航') }
    // jsdom 无滚动实现，验证不抛错即可
    expect(() => handleFaqClick('#contact', '/', navigate)).not.toThrow()
  })
  it('跨页锚点走导航路径', () => {
    let called = ''
    const navigate = (to: string) => { called = to }
    // rAF 在 jsdom 中同步执行，滚动目标不存在时安全返回
    handleFaqClick('/blog/demo-animations#animations', '/', navigate)
    expect(called).toBe('/blog/demo-animations#animations')
    expect(resolveTarget('/blog/demo-animations#animations', '/')).toContain('demo-animations')
    expect(isSamePage('/blog/demo-animations#animations', '/')).toBe(false)
  })
})
