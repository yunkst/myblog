// PostList.test.tsx — v5 Task 9：explore 卡片入口文案「▶ 进入舞台 · <label>」
// 走真实内容数据（getAllPosts 经 import.meta.glob 读 content/posts/*/meta.yaml + explore.yaml），
// 断言当前唯一文章 ai-digital-employee 的卡片文案与链接 href。
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PostList from './PostList'

describe('PostList explore 入口', () => {
  it('explore 卡片显示「▶ 进入舞台 · <label>」', () => {
    const { container } = render(<MemoryRouter><PostList /></MemoryRouter>)
    const btn = container.querySelector('.explore-entry-btn')!
    expect(btn).not.toBeNull()
    expect(btn.textContent).toContain('进入舞台')
    expect(btn.textContent).toContain('·')
    expect(btn.closest('a')!.getAttribute('href')).toMatch(/ai-digital-employee/)
  })
})
