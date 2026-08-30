import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Post from './Post'

/**
 * Post 页探索分支的 smoke：
 * - v2 已废除独立 /explore 路由与「走进探索视图 →」入口链接；
 *   原「有 yaml 渲染入口链接」的断言随之删除（Task 5 会接管入口逻辑）。
 * - v5（Task 7）：MDX 管线退役——article.mdx 已删除；Post 对有 explore.yaml 的文章
 *   渲染 <main className="stage-frame" data-article-slug=...> 占位（T8 接入 SceneRoute）。
 * - v5 后唯一保留下来的文章 ai-digital-employee 总是带 explore.yaml，所以
 *   「无 yaml」分支不再可达，相关断言删除；用「不存在的 slug」保持 404 smoke。
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

describe('<Post> v5 stage-frame（article.mdx 退出后的 Stage 占位）', () => {
  it('有 explore.yaml 的文章：渲染 <main className="stage-frame">', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    const stage = container.querySelector('main.stage-frame')
    expect(stage).not.toBeNull()
    expect(stage!.getAttribute('data-article-slug')).toBe('ai-digital-employee')
  })

  it('不存在的 slug：渲染文章不存在提示', () => {
    const { container } = renderAt('/blog/never-published')
    expect(container.querySelector('main.stage-frame')).toBeNull()
    expect(container.textContent).toContain('文章不存在')
  })
})

/* v4（Task 5）：有 explore 的文章 hydration 后 body 加 stage-locked（ExploreRouter 挂载标记）。
 * jsdom 下 IntersectionObserver/matchMedia 缺失不影响 ExploreRouter 的 mount effect
 * （它只挂 keydown/hashchange 监听 + body classList + main data-has-router）。 */
describe('<Post> v4 explore hydration', () => {
  beforeEach(() => { document.body.className = '' })
  afterEach(() => { document.body.className = '' })

  it('有 explore：hydration 后 body 挂 stage-locked class', () => {
    renderAt('/blog/ai-digital-employee')
    expect(document.body.classList.contains('stage-locked')).toBe(true)
  })

  it('有 explore：hydration 后 stage-frame main 挂 data-has-router', () => {
    renderAt('/blog/ai-digital-employee')
    const stage = document.querySelector('main.stage-frame')
    expect(stage).not.toBeNull()
    expect(stage!.hasAttribute('data-has-router')).toBe(true)
  })
})
