import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Post from './Post'

/**
 * Post 页入口链接的条件渲染 smoke：
 * - v2 已废除独立 /explore 路由与「走进探索视图 →」入口链接，
 *   原「有 yaml 渲染入口链接」的断言随之删除（Task 5 会接管入口逻辑）。
 * - 无 explore.yaml 的文章不渲染入口链接（避免落到探索回退页，UX 死链）。
 * - 用真实的 content.ts（SSG 侧数据层）。
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
  it('无 explore.yaml 的文章：不渲染入口链接（避免落到探索回退页）', () => {
    const { container } = renderAt('/blog/shixi-open-source-study-app')
    expect(container.querySelector('a.explore-entry-link')).toBeNull()
    expect(container.textContent).not.toContain('走进探索视图')
  })
})

describe('<Post> v3 stage class', () => {
  it('有 explore.yaml 的文章：main 有 post-wrap--stage 类', () => {
    const { container } = renderAt('/blog/ai-digital-employee')
    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    expect(main!.className).toContain('post-wrap')
    expect(main!.className).toContain('post-wrap--stage')
  })

  it('无 explore.yaml 的文章：main 无 post-wrap--stage 类', () => {
    const { container } = renderAt('/blog/shixi-open-source-study-app')
    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    expect(main!.className).toContain('post-wrap')
    expect(main!.className).not.toContain('post-wrap--stage')
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

  it('无 explore：body 不挂 stage-locked', () => {
    renderAt('/blog/shixi-open-source-study-app')
    expect(document.body.classList.contains('stage-locked')).toBe(false)
  })
})