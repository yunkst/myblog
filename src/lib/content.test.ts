import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost, getPostsByDomain, getAllDomains, getFAQs, getSite, getWips } from './content'

describe('content layer', () => {
  const posts = getAllPosts()
  const firstSlug = posts[0]?.slug

  it('解析占位文章并只返回 published', () => {
    expect(posts.length).toBeGreaterThanOrEqual(1)
    expect(posts.every((p) => p.status === 'published')).toBe(true)
    expect(typeof firstSlug).toBe('string')
  })

  it('getPost 按 slug 命中', () => {
    expect(getPost(firstSlug!)?.title).toBeTruthy()
  })

  it('领域聚合', () => {
    const domains = getAllDomains()
    expect(domains.length).toBeGreaterThan(0)
    if (firstSlug) {
      const d = domains.find((x) => x.slug === posts[0]!.domain)
      expect(d).toBeTruthy()
    }
  })

  it('缺 domain 的文章回退 general（仅验证不抛错）', () => {
    expect(() => getPostsByDomain('general')).not.toThrow()
  })

  it('读 site.yaml', () => {
    const site = getSite()
    expect(site.site.name).toBeTruthy()
  })

  it('wip 与 faq 目录为空时不抛错', () => {
    expect(Array.isArray(getWips())).toBe(true)
    expect(Array.isArray(getFAQs())).toBe(true)
  })
})
