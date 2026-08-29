import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Post from './Post'

/**
 * Post 页「走进探索视图 →」入口链接的条件渲染 smoke：
 * - hasExplore=true（有 explore.yaml，如 ai-digital-employee）→ 渲染入口链接
 * - hasExplore=false（无 explore.yaml，如 shixi-open-source-study-app）→ 不渲染，
 *   否则会点进探索视图回退页（UX 死链，review Important-1）。
 * - 用真实的 content.ts（SSG 侧数据层），与 Explore.test.tsx 同一套做法。
 * - <Head> 内部走 react-helmet-async（需要 HelmetProvider），直接 mock 掉。
 */
vi.mock('vite-react-ssg', () => ({ Head: () => null }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog/:slug" element={<Post />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<Post> explore entry link', () => {
  it('有 explore.yaml 的文章：渲染「走进探索视图 →」入口链接', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    const link = container.querySelector('a.explore-entry-link')
    expect(link).toBeTruthy()
    expect(link!.getAttribute('href')).toBe('/blog/ai-digital-employee/explore/')
    expect(link!.textContent).toContain('走进探索视图')
  })

  it('无 explore.yaml 的文章：不渲染入口链接（避免落到探索回退页）', () => {
    const { container } = renderAt('/blog/shixi-open-source-study-app')
    expect(container.querySelector('a.explore-entry-link')).toBeNull()
    expect(container.textContent).not.toContain('走进探索视图')
  })
})
