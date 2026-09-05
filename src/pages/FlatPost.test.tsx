import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Component from './FlatPost'

/* <Head> 内部走 react-helmet-async（需要 HelmetProvider），直接 mock 掉（同 Post.test） */
vi.mock('vite-react-ssg', () => ({ Head: () => null }))

/**
 * v8 平铺阅读页（/blog/<slug>/flat/）回归测试。
 *
 * 用真实文章 ai-digital-employee（11 幕，含 mode 1/2/3 + features/questions 出口），
 * 验证双形态共存的平铺侧契约：
 * - 全部幕按 yaml 顺序平铺为 section（id = scene.id，锚点可跳）；
 * - 无舞台 chrome（无底栏/路线图面板/stage-locked）；
 * - 无 runtime → Answer 静态直渲（无 Director，文本立即完整可见——打字机不清空）；
 * - 出口 chips 降级为文内锚点 <a href="#...">；
 * - 头部/页尾「▶ 舞台模式」互链。
 */

function renderFlat(path = '/blog/ai-digital-employee/flat/') {
  window.history.replaceState(null, '', path)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="blog/:slug/flat" element={<Component />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<FlatPost> 平铺阅读页（v8）', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.body.className = ''
  })
  afterEach(() => {
    document.body.className = ''
  })

  it('11 幕全部按 yaml 顺序平铺为 section（id=scene.id）', () => {
    const { container } = renderFlat()
    const sections = [...container.querySelectorAll('.flat-post section.theater')]
    expect(sections).toHaveLength(11)
    /* yaml 顺序：入口 q-problem 第一、q-future 最后 */
    expect(sections[0].id).toBe('q-problem')
    expect(sections[1].id).toBe('q-tiered-confirm')
    expect(sections[10].id).toBe('q-future')
    /* 每节都有标题（label 兜底 h2） */
    expect(sections[0].querySelector('h2')?.textContent).toContain('公司的技术问题')
  })

  it('无舞台 chrome：无底栏 / 无路线图面板 / body 无 stage-locked / 无 Director 演出态', () => {
    const { container } = renderFlat()
    expect(container.querySelector('.stage-nav')).toBeNull()
    expect(container.querySelector('.roadmap-panel')).toBeNull()
    expect(container.querySelector('.explore-router')).toBeNull()
    expect(document.body.classList.contains('stage-locked')).toBe(false)
    /* 无 runtime → 无 data-active（演出态属性只属于舞台模式） */
    expect(container.querySelector('[data-active]')).toBeNull()
  })

  it('静态直渲：解说文本立即完整可见（Director 未挂载，打字机不清空）', () => {
    const { container } = renderFlat()
    const dialogue = container.querySelector('#q-problem .dialogue')
    /* 解说全文在 SSR/首渲染即存在——不是逐字打出来的 */
    expect(dialogue?.textContent).toContain('能不能做一个 AI 数字分身')
    expect(dialogue?.textContent!.length).toBeGreaterThan(40)
  })

  it('出口 chips 渲染为文内锚点 <a href="#...">', () => {
    const { container } = renderFlat()
    const chip = container.querySelector('#q-problem .exit-chip')
    expect(chip?.getAttribute('href')).toMatch(/^#q-/)
    /* 跨场景锚点目标都在本页存在 */
    const id = chip!.getAttribute('href')!.slice(1)
    expect(container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull()
  })

  it('头部 + 页尾「▶ 舞台模式」互链回 /blog/<slug>/', () => {
    renderFlat()
    const switches = screen.getAllByRole('link', { name: /舞台模式/ })
    expect(switches.length).toBe(2)
    for (const a of switches) {
      expect(a).toHaveAttribute('href', '/blog/ai-digital-employee/')
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('一个人撑起全公司技术')
  })

  it('文章不存在 → 占位', () => {
    renderFlat('/blog/nonexistent-post/flat/')
    expect(screen.getByText('文章不存在。')).toBeInTheDocument()
  })
})
