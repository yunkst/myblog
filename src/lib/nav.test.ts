import { describe, it, expect } from 'vitest'
import { resolveTarget, isSamePage, blogPostPath } from './nav'

describe('nav', () => {
  it('同页锚点规范化为当前路径', () => {
    expect(resolveTarget('#contact', '/')).toBe('/#contact')
    expect(resolveTarget('#blog', '/blog')).toBe('/blog#blog')
  })
  it('跨页锚点保持不变', () => {
    expect(resolveTarget('/blog/demo-animations#animations', '/')).toBe('/blog/demo-animations#animations')
  })
  it('isSamePage 判定', () => {
    expect(isSamePage('#contact', '/')).toBe(true)
    expect(isSamePage('/blog/demo-animations#animations', '/')).toBe(false)
  })
})

describe('blogPostPath', () => {
  it('产出统一尾斜杠路径', () => {
    expect(blogPostPath('ai-digital-employee')).toBe('/blog/ai-digital-employee/')
  })
})
