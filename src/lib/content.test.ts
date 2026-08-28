import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost, getPostsByDomain, getAllDomains, getFAQs, getSite, getWips } from './content'

describe('content layer', () => {
  it('解析占位文章并只返回 published', () => {
    const posts = getAllPosts()
    expect(posts.length).toBeGreaterThanOrEqual(1)
    expect(posts.every((p) => p.status === 'published')).toBe(true)
    expect(posts[0]).toHaveProperty('slug', 'demo-animations')
    expect(posts[0]).toHaveProperty('anim_profile', 'architecture')
  })

  it('getPost 按 slug 命中', () => {
    expect(getPost('demo-animations')?.title).toContain('三种动画')
  })

  it('领域聚合：demo 文章归到 示例领域', () => {
    const domains = getAllDomains()
    expect(domains.some((d) => d.slug === '示例领域')).toBe(true)
    expect(getPostsByDomain('示例领域').length).toBeGreaterThanOrEqual(1)
  })

  it('缺 domain 的文章回退 general（当前无此文章，仅验证函数不抛错）', () => {
    expect(() => getPostsByDomain('general')).not.toThrow()
  })

  it('读 site.yaml', () => {
    const site = getSite()
    expect(site.site.name).toBeTruthy()
    expect(site.site.domains).toContain('示例领域')
  })

  it('wip 与 faq 目录为空时不抛错', () => {
    expect(Array.isArray(getWips())).toBe(true)
    expect(Array.isArray(getFAQs())).toBe(true)
  })
})
