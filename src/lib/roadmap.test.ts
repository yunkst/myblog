import { describe, it, expect } from 'vitest'
import {
  computeRoadmapLayout, applyFocus,
  ROADMAP_NODE_W, ROADMAP_COL_GAP, ROADMAP_PAD,
} from './roadmap'
import { parseExploreYaml } from './explore'
import type { ExploreConfig } from './types'
import realYamlRaw from '../../content/posts/ai-digital-employee/explore.yaml?raw'

function configOf(yaml: string): ExploreConfig {
  const r = parseExploreYaml(yaml)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const mini = configOf(`
title: t
entry: q-a
scenes:
  - id: q-a
    label: 入口
    demo: d
    features:
      - { text: 去 B, to: q-b }
    questions:
      - { text: 去 C, to: q-c }
  - id: q-b
    label: B
    demo: d
    questions:
      - { text: 回到入口, to: q-a }
  - id: q-c
    label: C
    demo: d
`)

describe('computeRoadmapLayout', () => {
  it('BFS 分层 + 树边：entry 第 0 列，首发现出口为实线边', () => {
    const l = computeRoadmapLayout(mini)
    const node = (id: string) => l.nodes.find((n) => n.id === id)!
    expect(node('q-a').layer).toBe(0)
    expect(node('q-b').layer).toBe(1)
    expect(node('q-c').layer).toBe(1)
    expect(l.edges).toEqual([
      { from: 'q-a', to: 'q-b' },
      { from: 'q-a', to: 'q-c' },
    ])
    /* 坐标：x 由 layer 决定，列内 row 按发现序 */
    expect(node('q-b').x).toBe(ROADMAP_PAD + ROADMAP_NODE_W + ROADMAP_COL_GAP)
    expect(node('q-b').row).toBe(0)
    expect(node('q-c').row).toBe(1)
    expect(l.total).toBe(3)
  })

  it('回边不画线：降级为源节点 ↩ 标记（目标 label），且按 label 去重', () => {
    const l = computeRoadmapLayout(mini)
    const b = l.nodes.find((n) => n.id === 'q-b')!
    expect(b.backLabels).toEqual(['入口'])
    /* 回边不在 edges 里 */
    expect(l.edges.some((e) => e.from === 'q-b')).toBe(false)
  })

  it('跨文章出口 → portal 叶子节点：href 预解析、不展开外部子图', () => {
    const cfg = configOf(`
title: t
entry: q-a
scenes:
  - id: q-a
    label: A
    demo: d
    questions:
      - { text: 去看另一篇, to: { post: other-post, scene: entry } }
`)
    const l = computeRoadmapLayout(cfg)
    const portal = l.nodes.find((n) => n.kind === 'portal')!
    expect(portal.id).toBe('portal:other-post:entry')
    expect(portal.label).toBe('去看另一篇')
    expect(portal.href).toBe('/blog/other-post/#entry')
    expect(portal.layer).toBe(1)
    expect(l.edges).toEqual([{ from: 'q-a', to: 'portal:other-post:entry' }])
    /* 全图只有 2 个节点：外部文章的子图不展开 */
    expect(l.total).toBe(2)
  })

  it('孤儿幕（entry 不可达）附加到末尾列，图不缺幕', () => {
    const cfg = configOf(`
title: t
entry: q-a
scenes:
  - id: q-a
    label: A
    demo: d
  - id: q-orphan
    label: 孤儿
    demo: d
    questions:
      - { text: 回 A, to: q-a }
`)
    const l = computeRoadmapLayout(cfg)
    const orphan = l.nodes.find((n) => n.id === 'q-orphan')!
    expect(orphan.layer).toBe(1)
    /* 孤儿的回边同样降级为 ↩ 标记 */
    expect(orphan.backLabels).toEqual(['A'])
    expect(l.total).toBe(2)
  })

  it('真实 explore.yaml（ai-digital-employee）：15 幕全可达 + 树边 14 条 + 回边标记命中', () => {
    const r = parseExploreYaml(realYamlRaw)
    if (!r.ok) throw new Error(r.error)
    const l = computeRoadmapLayout(r.value)
    expect(l.total).toBe(15)
    /* 无跨文章出口 → 无 portal；全部场景从 entry 可达 → 树边 = 节点数 - 1 */
    expect(l.nodes.every((n) => n.kind === 'scene')).toBe(true)
    expect(l.edges).toHaveLength(14)
    const node = (id: string) => l.nodes.find((n) => n.id === id)!
    expect(node('q-problem').layer).toBe(0)
    expect(node('q-tiered-confirm').layer).toBe(1)
    /* 「回到入口」式回边：威胁模型/局限性 两幕挂 ↩ 到入口 label */
    expect(node('q-threat-model').backLabels).toContain('公司的技术问题，都是谁在解决？')
    expect(node('q-limits').backLabels).toContain('公司的技术问题，都是谁在解决？')
  })
})

describe('applyFocus', () => {
  /* 25 幕直线链（超阈值 20） */
  const big: ExploreConfig = {
    title: 'big',
    entry: 's-0',
    scenes: Array.from({ length: 25 }, (_, i) => ({
      id: `s-${i}`,
      label: `第${i}幕`,
      demo: 'd',
      questions: i < 24 ? [{ text: 'next', to: `s-${i + 1}` }] : [],
    })),
  }

  it('节点数 ≤ 阈值时原样返回', () => {
    const l = computeRoadmapLayout(mini)
    expect(applyFocus(l, 'q-a', ['q-a'])).toBe(l)
  })

  it('超阈值：已读 ∪ 路径 ∪ 当前邻居保留，其余折叠为 +N 未探索', () => {
    const l = computeRoadmapLayout(big)
    const f = applyFocus(l, 's-10', ['s-3', 's-10'])
    /* 可见：visited(s-3,s-10) + 路径(s-0..s-9 中 s-10 的祖先链 = s-0..s-9) + 邻居(s-9,s-11) */
    expect(f.nodes.some((n) => n.id === 's-11')).toBe(true)
    expect(f.nodes.some((n) => n.id === 's-0')).toBe(true)
    expect(f.nodes.some((n) => n.id === 's-20')).toBe(false)
    const more = f.nodes.find((n) => n.kind === 'more')!
    /* 隐藏场景 = 25 - 可见场景(s-0..s-11 共 12 个) = 13 */
    expect(more.hiddenCount).toBe(13)
    expect(more.label).toBe('+13 未探索')
    expect(f.total).toBe(25)
    /* 坐标已重算（more 节点有有效坐标） */
    expect(more.x).toBeGreaterThan(0)
    /* 不改写传入的全图（父组件 useMemo 缓存安全） */
    expect(l.nodes.find((n) => n.id === 's-20')).toBeTruthy()
    expect(l.nodes.some((n) => n.kind === 'more')).toBe(false)
  })

  it('聚焦后当前幕的坐标不溢出画布', () => {
    const l = computeRoadmapLayout(big)
    const f = applyFocus(l, 's-10', [])
    const cur = f.nodes.find((n) => n.id === 's-10')!
    expect(cur.x + ROADMAP_NODE_W).toBeLessThanOrEqual(f.width)
    expect(cur.y).toBeGreaterThanOrEqual(ROADMAP_PAD)
  })
})
