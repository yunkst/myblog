// PostList.test.tsx — v5 Task 9：explore 卡片入口文案「▶ 进入舞台 · <label>」
// 走真实内容数据（getAllPosts 经 import.meta.glob 读 content/posts/*/meta.yaml + explore.yaml）。
// 多文章适配（novel-builder 加入后）：断言每篇含 explore 的文章都有入口按钮，
// 且链接指向对应文章的入口场景。
// 2026-09-01 追加：领域筛选 chips + pinned 置顶（数据层 content.ts 排序，UI 徽章）。
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PostList from './PostList'
import { getAllPosts } from '../lib/content'

describe('PostList explore 入口', () => {
  it('explore 卡片显示「▶ 进入舞台 · <label>」', () => {
    const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
    const btns = Array.from(container.querySelectorAll('.explore-entry-btn'))
    expect(btns.length).toBeGreaterThanOrEqual(2)
    for (const btn of btns) {
      expect(btn.textContent).toContain('进入舞台')
      expect(btn.textContent).toContain('·')
    }
    const hrefs = btns.map((b) => b.closest('a')!.getAttribute('href')!)
    expect(hrefs.some((h) => /ai-digital-employee/.test(h))).toBe(true)
    expect(hrefs.some((h) => /novel-builder/.test(h))).toBe(true)
  })
})

describe('PostList 领域筛选 + 置顶', () => {
  it('筛选按钮：默认「全部」激活，含全部有文章的领域及计数', () => {
    const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
    const btns = Array.from(container.querySelectorAll('.post-filter-btn'))
    expect(btns[0].textContent).toContain('全部')
    expect(btns[0].className).toContain('is-active')
    const texts = btns.map((b) => b.textContent ?? '')
    expect(texts.some((t) => t.includes('开源作品'))).toBe(true)
    expect(texts.some((t) => t.includes('AI 与工程'))).toBe(true)
    // 无文章的领域（如 site.yaml 里的「项目经历」）不渲染筛选项
    expect(texts.some((t) => t.includes('项目经历'))).toBe(false)
  })

  it('点击领域 chip 后只显示该领域卡片', () => {
    const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
    const chip = Array.from(container.querySelectorAll('.post-filter-btn'))
      .find((b) => b.textContent?.includes('开源作品'))!
    fireEvent.click(chip)
    const cards = Array.from(container.querySelectorAll('.post-card'))
    // 期望数量从真实数据派生，新增文章不需要改测试
    const expected = getAllPosts().filter((p) => p.domain === '开源作品').length
    expect(cards.length).toBe(expected)
    for (const c of cards) {
      expect(c.querySelector('.tag')!.textContent).toBe('开源作品')
    }
  })

  it('置顶：pinned 文章排在最前并带「置顶」徽章', () => {
    const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
    const first = container.querySelector('.post-card')!
    expect(first.textContent).toContain('一个人撑起全公司技术')
    expect(first.querySelector('.post-pin')?.textContent).toBe('置顶')
    // 未置顶文章不带徽章
    const last = Array.from(container.querySelectorAll('.post-card')).pop()!
    expect(last.querySelector('.post-pin')).toBeNull()
  })
})
