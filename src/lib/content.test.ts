import { describe, it, expect } from 'vitest'
import { getAllPosts, getPost, getAllDomains } from './content'

describe('content：meta.yaml 数据层（v5）', () => {
  it('读出 ai-digital-employee 的元数据', () => {
    const posts = getAllPosts()
    expect(posts).toHaveLength(1)
    const p = posts[0]
    expect(p.slug).toBe('ai-digital-employee')
    expect(p.title).toContain('AI 接进生产系统')
    expect(p.domain).toBe('AI 与工程')
    expect(p.date).toBe('2026-08-29')
    expect(p.status).toBe('published')
    expect(p.hasExplore).toBe(true)
    expect(p.exploreEntry?.id).toBe('q-problem')
  })

  it('getPost / getAllDomains 工作', () => {
    expect(getPost('ai-digital-employee')?.slug).toBe('ai-digital-employee')
    expect(getPost('nope')).toBeUndefined()
    expect(getAllDomains()[0].slug).toBe('AI 与工程')
  })

  it('Post 无 body 字段（MDX 退出）', () => {
    const p = getPost('ai-digital-employee')!
    expect('body' in p).toBe(false)
  })
})
