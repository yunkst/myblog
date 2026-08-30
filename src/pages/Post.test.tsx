import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Post from './Post'

/**
 * <Post> v5 薄壳 smoke：
 * - post.hasExplore → <Stage post={post}/>（main.stage-frame + SceneRoute + StageNav）；
 * - 无 explore → 「敬请期待」占位（v5 无 article.mdx，正文走 Stage 化改造）；
 * - 不存在 slug → 「文章不存在」占位。
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

describe('<Post> v5', () => {
  beforeEach(() => { document.body.className = '' })
  afterEach(() => { document.body.className = '' })

  it('explore 文章：渲染 stage-frame 舞台；无 post-meta/h1/post-nav；唯一 theater；body stage-locked', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    const main = container.querySelector('main')!
    expect(main.className).toContain('stage-frame')
    expect(main.querySelector('.post-meta')).toBeNull()
    expect(main.querySelector('.post-nav')).toBeNull()
    expect(container.querySelectorAll('.theater')).toHaveLength(1)
    expect(container.querySelector('.theater')!.id).toBe('q-problem')
    expect(main.querySelector('.stage-nav')).not.toBeNull()
    expect(document.body.classList.contains('stage-locked')).toBe(true)
  })

  it('不存在的 slug：渲染文章不存在提示', () => {
    const { container } = renderAt('/blog/never-published')
    expect(container.querySelector('main.stage-frame')).toBeNull()
    expect(container.textContent).toContain('文章不存在')
  })
})
