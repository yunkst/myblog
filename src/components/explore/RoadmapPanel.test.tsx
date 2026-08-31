import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import RoadmapPanel from './RoadmapPanel'
import { computeRoadmapLayout, ROADMAP_FOCUS_THRESHOLD } from '../../lib/roadmap'
import { parseExploreYaml } from '../../lib/explore'
import type { ExploreConfig } from '../../lib/types'

const noop = () => {}

function layoutOf(yaml: string) {
  const r = parseExploreYaml(yaml)
  if (!r.ok) throw new Error(r.error)
  return computeRoadmapLayout(r.value)
}

const miniLayout = layoutOf(`
title: t
entry: q-a
scenes:
  - id: q-a
    label: 入口场景
    demo: d
    features:
      - { text: 去 B, to: q-b }
  - id: q-b
    label: B 场景
    demo: d
    questions:
      - { text: 回到入口, to: q-a }
      - { text: 去看另一篇, to: { post: other-post, scene: entry } }
`)

/** 超阈值大图：直线链（ROADMAP_FOCUS_THRESHOLD + 5 幕） */
function bigLayout() {
  const n = ROADMAP_FOCUS_THRESHOLD + 5
  const config: ExploreConfig = {
    title: 'big',
    entry: 's-0',
    scenes: Array.from({ length: n }, (_, i) => ({
      id: `s-${i}`,
      label: `第${i}幕`,
      demo: 'd',
      questions: i < n - 1 ? [{ text: 'next', to: `s-${i + 1}` }] : [],
    })),
  }
  return computeRoadmapLayout(config)
}

describe('RoadmapPanel', () => {
  it('open=false 时不渲染任何 DOM', () => {
    const { container } = render(
      <RoadmapPanel open={false} onClose={noop} layout={miniLayout}
        currentId="q-a" visited={[]} onGoTo={noop} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('渲染路线图：场景节点显示 label（不是 sceneId）+ 三态 class + 图例', () => {
    const { container } = render(
      <RoadmapPanel open onClose={noop} layout={miniLayout}
        currentId="q-b" visited={['q-a', 'q-b']} onGoTo={noop} />,
    )
    expect(screen.getByRole('dialog', { name: '探索路线图' })).toBeInTheDocument()
    expect(screen.getByText('入口场景')).toBeInTheDocument()
    expect(screen.getByText('B 场景')).toBeInTheDocument()
    /* 不渲染原始 sceneId */
    expect(screen.queryByText('q-a')).toBeNull()
    const a = container.querySelector('[data-node-id="q-a"]')!
    const b = container.querySelector('[data-node-id="q-b"]')!
    expect(a.className).toContain('roadmap-node--visited')
    expect(b.className).toContain('roadmap-node--current')
    expect(b).toHaveAttribute('aria-current', 'true')
    /* 图例 */
    expect(screen.getByText('● 当前')).toBeInTheDocument()
    expect(screen.getByText('◉ 已读')).toBeInTheDocument()
    expect(screen.getByText('○ 未读')).toBeInTheDocument()
  })

  it('回边不画线：节点挂 ↩ 标记，title 浮出目标 label', () => {
    const { container } = render(
      <RoadmapPanel open onClose={noop} layout={miniLayout}
        currentId="q-a" visited={['q-a']} onGoTo={noop} />,
    )
    const back = container.querySelector('[data-node-id="q-b"] .roadmap-node__back')!
    expect(back).not.toBeNull()
    expect(back).toHaveAttribute('title', '回到：入口场景')
    /* 树边只有 q-a→q-b 一条线（回边 q-b→q-a 不画） */
    expect(container.querySelectorAll('.roadmap-edges line')).toHaveLength(2) // q-a→q-b + q-b→portal
  })

  it('portal 节点渲染为 <a> 整页跳转，图例带「其他文章」', () => {
    const { container } = render(
      <RoadmapPanel open onClose={noop} layout={miniLayout}
        currentId="q-a" visited={[]} onGoTo={noop} />,
    )
    const portal = container.querySelector('[data-node-id="portal:other-post:entry"]')!
    expect(portal.tagName).toBe('A')
    expect(portal).toHaveAttribute('href', '/blog/other-post/#entry')
    expect(screen.getByText('⬈ 其他文章')).toBeInTheDocument()
  })

  it('点击任意场景节点（含未读）调 onGoTo', () => {
    const onGoTo = vi.fn()
    const { container } = render(
      <RoadmapPanel open onClose={noop} layout={miniLayout}
        currentId="q-a" visited={['q-a']} onGoTo={onGoTo} />,
    )
    fireEvent.click(container.querySelector('[data-node-id="q-b"]')!)
    expect(onGoTo).toHaveBeenCalledWith('q-b')
  })

  it('点击关闭按钮 / backdrop 调 onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <RoadmapPanel open onClose={onClose} layout={miniLayout}
        currentId="q-a" visited={[]} onGoTo={noop} />,
    )
    fireEvent.click(screen.getByLabelText(/关闭/))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.roadmap-panel__backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('动作镜像：◀ 返回（disabled 态）/ ⏵ 继续：<label> / ✕ 退出', () => {
    const onBack = vi.fn(), onNext = vi.fn(), onExit = vi.fn()
    render(
      <RoadmapPanel open onClose={noop} layout={miniLayout}
        currentId="q-a" visited={[]} onGoTo={noop}
        canBack={false} onBack={onBack} nextLabel="⏵ 继续：B" onNext={onNext} onExit={onExit} />,
    )
    expect(screen.getByText('◀ 返回').closest('button')).toBeDisabled()
    expect(screen.getByText('⏵ 继续：B')).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕ 退出'))
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('超阈值默认聚焦：渲染 +N 未探索聚合节点，点击展开全图', () => {
    const layout = bigLayout()
    const { container } = render(
      <RoadmapPanel open onClose={noop} layout={layout}
        currentId="s-3" visited={['s-3']} onGoTo={noop} />,
    )
    /* 聚焦：尾部幕被折叠 */
    expect(container.querySelector('[data-node-id="s-20"]')).toBeNull()
    const more = container.querySelector('[data-node-id="__more__"]')!
    expect(more).not.toBeNull()
    expect(more.textContent).toMatch(/\+\d+ 未探索/)
    /* 头部出现全图切换；点 +N 节点也展开 */
    fireEvent.click(more)
    expect(container.querySelector('[data-node-id="s-20"]')).not.toBeNull()
    expect(screen.getByText('聚焦当前')).toBeInTheDocument()
  })

  it('未超阈值不出现聚焦切换按钮', () => {
    render(
      <RoadmapPanel open onClose={noop} layout={miniLayout}
        currentId="q-a" visited={[]} onGoTo={noop} />,
    )
    expect(screen.queryByText('查看全图')).toBeNull()
    expect(screen.queryByText('聚焦当前')).toBeNull()
  })
})
