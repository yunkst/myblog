import { describe, it, expect } from 'vitest'
import { getPost, getAllDomains } from './content'

describe('content：meta.yaml 数据层（v5）', () => {
  it('读出 ai-digital-employee 的元数据', () => {
    const p = getPost('ai-digital-employee')!
    expect(p.slug).toBe('ai-digital-employee')
    expect(p.title).toContain('AI 接进生产系统')
    expect(p.domain).toBe('AI 与工程')
    expect(p.date).toBe('2026-08-29')
    expect(p.status).toBe('published')
    expect(p.hasExplore).toBe(true)
    expect(p.exploreEntry?.id).toBe('q-problem')
  })

  it('读出 novel-builder 的元数据', () => {
    const p = getPost('novel-builder')!
    expect(p.slug).toBe('novel-builder')
    expect(p.title).toContain('AI 小说平台')
    expect(p.excerpt).toContain('novel_builder')
    expect(p.domain).toBe('开源作品')
    expect(p.date).toBe('2026-08-31')
    expect(p.status).toBe('published')
    expect(p.hasExplore).toBe(true)
    expect(p.exploreEntry?.id).toBe('q-intro')
  })

  it('getPost / getAllDomains 工作', () => {
    expect(getPost('ai-digital-employee')?.slug).toBe('ai-digital-employee')
    expect(getPost('nope')).toBeUndefined()
    const domainSlugs = getAllDomains().map((d) => d.slug)
    expect(domainSlugs).toContain('AI 与工程')
    expect(domainSlugs).toContain('开源作品')
  })

  it('Post 无 body 字段（MDX 退出）', () => {
    const p = getPost('ai-digital-employee')!
    expect('body' in p).toBe(false)
  })
})
