import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Stage from './Stage'
import type { Post } from '../lib/types'

/**
 * <Stage> 回归测试（v5 终审 fix round；v6 面板改路线图）：
 * - **嵌套契约**（spec §2.2）：main.stage-frame 必须包在 ExploreRouter **外层**——
 *   RoadmapPanel 由 ExploreRouter 在 children 之后渲染，只有 main 包住 router，
 *   面板才是 main 的后代，`.stage-frame .roadmap-panel*` 的 CSS 作用域才命中。
 *   （反嵌套时 panel 是 .explore-router 的直接子元素、main 的兄弟——面板规则
 *   全部失效，面板画在不透明 fixed main 之下不可见。）
 *   这是该契约在 jsdom 可见的部分：main.contains(panel)。
 * - 路线图面板动作镜像（◀ 返回 / ⏵ 继续 / ✕ 退出）随面板一起在 main 内渲染。
 *
 * <Post> 薄壳 smoke（含 Head mock）在 Post.test.tsx；此处直接给 Stage 传 post，
 * 不经 getPost glob——聚焦 Stage 自身的嵌套/渲染契约。
 */

const post: Post = {
  slug: 'ai-digital-employee',
  title: 't',
  domain: 'd',
  date: '2026-08-29',
  anim_profile: 'auto',
  status: 'published',
  excerpt: '',
  fileName: 'ai-digital-employee',
  pinned: false,
  hasExplore: true,
}

function renderStage() {
  return render(
    <MemoryRouter>
      <Stage post={post} />
    </MemoryRouter>,
  )
}

describe('<Stage> 嵌套契约（v5 终审 fix round）', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/blog/ai-digital-employee/')
    sessionStorage.clear()
    document.body.className = ''
  })
  afterEach(() => {
    document.body.className = ''
    document.querySelector('main.stage-frame')?.removeAttribute('data-has-router')
  })

  it('main.stage-frame 包住 ExploreRouter（main 是 .explore-router 的祖先）', () => {
    const { container } = renderStage()
    const main = container.querySelector('main.stage-frame')!
    const router = main.querySelector('.explore-router')!
    expect(router).not.toBeNull()
    // router 的父级就是 main（而不是 router 包着 main）
    expect(router.parentElement).toBe(main)
  })

  it('点击 场景地图 后，.roadmap-panel 是 main.stage-frame 的后代（CSS 作用域契约）', () => {
    const { container } = renderStage()
    const main = container.querySelector('main.stage-frame')!
    expect(main.querySelector('.roadmap-panel')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '打开场景地图面板' }))
    const panel = main.querySelector('.roadmap-panel')
    expect(panel).not.toBeNull()
    expect(main.contains(panel)).toBe(true)
    // 直接父级是 .explore-router（RoadmapPanel 由 ExploreRouter 在 children 后渲染）
    expect(panel!.parentElement!.className).toContain('explore-router')
  })

  it('面板动作镜像随面板渲染在 main 内；Esc 关面板后消失', () => {
    const { container } = renderStage()
    const main = container.querySelector('main.stage-frame')!

    fireEvent.click(screen.getByRole('button', { name: '打开场景地图面板' }))
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
    expect(main.querySelector('.roadmap-panel__actions')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(main.querySelector('.roadmap-panel')).toBeNull()
  })
})
