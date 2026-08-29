import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Explore from './Explore'

/**
 * Route-level smoke：
 * - /blog/ai-digital-employee/explore 是仓库里唯一有 explore.yaml 的文章。
 * - 用真实的 content.ts（SSG 侧数据层，vitest 里跑 node 环境）+ 真实的 explore.ts。
 * - mdxModules/sceneModules glob（import.meta.glob）在 vitest（jsdom+vite-node）下可用。
 * - <Head> 内部走 react-helmet-async（需要 HelmetProvider，react-helmet-async 是
 *   vite-react-ssg 的传递依赖，这里直接 mock 掉——head 渲染不属于本 smoke 关心的内容）。
 */
vi.mock('vite-react-ssg', () => ({ Head: () => null }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog/:slug/explore" element={<Explore />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<Explore> route smoke', () => {
  it('有 yaml 的文章：explore-wrap + 问题树节点渲染', () => {
    const { container } = renderAt('/blog/ai-digital-employee/explore')
    expect(container.querySelector('.explore-wrap')).toBeTruthy()
    // ai-digital-employee/explore.yaml 顶层 2 个节点（1 local + 1 cross-link）
    const buttons = container.querySelectorAll('[data-question-id]')
    const links = container.querySelectorAll('[data-cross-link]')
    expect(buttons.length).toBe(1)
    expect(links.length).toBe(1)
    // 隐藏正文区存在且被 display:none 隐藏（AnswerProvider 收集来源）
    const answers = container.querySelector('.explore-answers')
    expect(answers).toBeTruthy()
    expect(answers!.getAttribute('aria-hidden')).toBe('true')
  })

  it('无 yaml 的文章：回退到「没有探索视图」页', () => {
    const { container, getByText } = renderAt('/blog/shixi-open-source-study-app/explore')
    expect(container.querySelector('.explore-wrap')).toBeTruthy()
    expect(getByText(/没有探索视图/)).toBeTruthy()
    // 回退页不应渲染问题树
    expect(container.querySelector('[data-question-id]')).toBeNull()
  })

  it('不存在的文章：同样回退', () => {
    const { getByText } = renderAt('/blog/does-not-exist/explore')
    expect(getByText(/没有探索视图/)).toBeTruthy()
  })
})
