import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ArchDiagram, {
  DEMO_ARCH, edgeLabelPos, labelWidth, boundLegendRect,
  legendRect, nodeTextFitProblems, ARCH_KIND_STYLE,
  reachableSets, adjacentSets, UPSTREAM_COLOR, DOWNSTREAM_COLOR,
  edgeNodeCrossings,
} from './ArchDiagram'
import type { ArchNode, ArchEdge, ArchBound } from './ArchDiagram'
/* 单图钉案测试的具名 fixture（兄弟边标签避让来自 novel-builder 的 figNbScriptGen） */
import { figNbScriptGen } from '../../../content/posts/novel-builder/diagrams'

type Fig = { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]; legendAt?: { x: number; y: number } }

/* 全部真实图数据：标签引擎对每一张图都要交出无碰撞落点（防「原理图普遍文本重叠」回归）。
 * 2026-09-03：图数据已从框架目录迁到 content/posts/<slug>/diagrams.ts（内容归内容层），
 * 这里用 glob 自动发现——新增文章的图无需注册即纳入校验。 */
const diagramModules = import.meta.glob<Record<string, unknown>>('/content/posts/*/diagrams.ts', { eager: true })
const FIGURES: Record<string, Fig> = { DEMO_ARCH }
for (const [path, mod] of Object.entries(diagramModules)) {
  for (const [key, v] of Object.entries(mod)) {
    if (v && typeof v === 'object' && Array.isArray((v as Fig).nodes) && Array.isArray((v as Fig).edges)) {
      FIGURES[`${path.split('/').slice(-2, -1)[0]}:${key}`] = v as Fig
    }
  }
}

interface Rect { x: number; y: number; w: number; h: number }
const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

describe('ArchDiagram', () => {
  it('渲染节点与连线（节点数 = 数据节点数）', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    expect(container.querySelectorAll('.ag-node').length).toBe(DEMO_ARCH.nodes.length)
    expect(container.querySelectorAll('.ag-edge').length).toBe(DEMO_ARCH.edges.length)
  })

  it('所有图数据：边标签落点不与节点 / bound 图例 / 先放的边标签重叠（复现渲染预排）', () => {
    for (const [name, fig] of Object.entries(FIGURES)) {
      /* 与 ArchDiagram 渲染处的预排逻辑逐行一致：
       * 障碍集初始 = bound 图例贴纸，每放一个标签就把自己 push 进去 */
      const obstacles: Rect[] = fig.bounds.map(boundLegendRect)
      for (const e of fig.edges) {
        if (!e.label) continue
        const wpx = labelWidth(e.label)
        const p = edgeLabelPos(fig.nodes, e, wpx, obstacles)
        const r: Rect = {
          x: p.x + (e.labelDx ?? 0) - wpx / 2,
          y: p.y + (e.labelDy ?? 0) - 8,
          w: wpx,
          h: 16,
        }
        for (const n of fig.nodes) {
          expect(overlap(r, n), `${name} / ${e.id}「${e.label}」撞到节点 ${n.id}`).toBe(false)
        }
        obstacles.forEach((o, i) => {
          expect(overlap(r, o), `${name} / ${e.id}「${e.label}」撞到障碍物 #${i}`).toBe(false)
        })
        obstacles.push(r)
      }
    }
  })

  it('所有图数据：边线不穿越任何第三方节点（「边从节点下面过」回归防线）', () => {
    for (const [name, fig] of Object.entries(FIGURES)) {
      expect(edgeNodeCrossings(fig), `${name} 存在边线穿节点`).toEqual([])
    }
  })

  it('所有图数据：bound 图例贴纸不与任何节点重叠', () => {
    for (const [name, fig] of Object.entries(FIGURES)) {
      for (const b of fig.bounds) {
        const r = boundLegendRect(b)
        for (const n of fig.nodes) {
          expect(overlap(r, n), `${name} / bound「${b.label}」撞到节点 ${n.id}`).toBe(false)
        }
      }
    }
  })

  /* ───────── v3 语义色 / 自动图例 / 文字下限 ───────── */

  it('所有图数据：节点文字收缩不跌破可辨识下限仍溢出（label 9px / sub 8px）', () => {
    for (const [name, fig] of Object.entries(FIGURES)) {
      expect(nodeTextFitProblems(fig), `${name} 存在跌破下限仍溢出的节点文字`).toEqual([])
    }
  })

  it('所有图数据：自动图例不与节点 / bound / bound 图例贴纸相撞', () => {
    for (const [name, fig] of Object.entries(FIGURES)) {
      const lr = legendRect(fig, fig.legendAt)
      for (const n of fig.nodes) {
        expect(overlap(lr, n), `${name} 图例撞到节点 ${n.id}`).toBe(false)
      }
      for (const b of fig.bounds) {
        expect(overlap(lr, b), `${name} 图例撞到 bound「${b.label}」`).toBe(false)
        expect(overlap(lr, boundLegendRect(b)), `${name} 图例撞到 bound 贴纸「${b.label}」`).toBe(false)
      }
    }
  })

  it('渲染：图例存在且 chip 数 = 图中实际出现的 kind 数（有虚线边时追加约定项）', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    const legend = container.querySelector('.ag-legend')
    expect(legend).not.toBeNull()
    const kinds = new Set(DEMO_ARCH.nodes.map((n) => n.kind))
    /* 每个 chip 一块 tint 底 rect；hasDash 时多一条 line */
    expect(legend!.querySelectorAll('rect').length).toBe(kinds.size + 1 /* 底板 */)
    const hasDash = DEMO_ARCH.edges.some((e) => e.dash)
    expect(legend!.querySelectorAll('line').length).toBe(hasDash ? 1 : 0)
    /* 图例文字必须包含每个 kind 的语义名 */
    for (const k of kinds) {
      expect(legend!.textContent).toContain(ARCH_KIND_STYLE[k].legend)
    }
  })

  it('兄弟边（共享锚点）的标签不再落在同一位置', () => {
    // figNbScriptGen e2/e3 都从 q1 right 出发——旧实现两标签重叠在同一中点
    const e2 = figNbScriptGen.edges.find((e) => e.id === 'e2')!
    const e3 = figNbScriptGen.edges.find((e) => e.id === 'e3')!
    const p2 = edgeLabelPos(figNbScriptGen.nodes, e2, labelWidth(e2.label!))
    const p3 = edgeLabelPos(figNbScriptGen.nodes, e3, labelWidth(e3.label!))
    const dist = Math.hypot(p2.x - p3.x, p2.y - p3.y)
    expect(dist).toBeGreaterThan(16)
  })

  /* ───────── v3.1 交互聚焦：上下游可达 + 一度邻接 + 点击锁定 ───────── */

  it('reachableSets：从 read 出发，上游 = client/gw，下游 = redis/db（DEMO_ARCH 实锤）', () => {
    const r = reachableSets(DEMO_ARCH.edges, 'read')
    expect([...r.up].sort()).toEqual(['client', 'gw'])
    expect([...r.upE].sort()).toEqual(['e1', 'e2'])
    expect([...r.down].sort()).toEqual(['db', 'redis'])
    expect([...r.downE].sort()).toEqual(['e3', 'e7'])
  })

  it('adjacentSets：gw 的一度邻居 = client/read/write，相连边 = e1/e2/e4', () => {
    const a = adjacentSets(DEMO_ARCH.edges, 'gw')
    expect([...a.nodes].sort()).toEqual(['client', 'read', 'write'])
    expect([...a.edges].sort()).toEqual(['e1', 'e2', 'e4'])
  })

  it('点击节点锁定聚焦：无关拓扑淡出，上游边蓝、下游边绿，出现状态条', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    /* 聚焦 queue：上游 write/gw/client（e5/e4/e1），下游 db（e6）；read/redis/e2/e3/e7 无关 */
    fireEvent.click(container.querySelector('[data-node="queue"]')!)
    const dim = (sel: string) => (container.querySelector(sel) as HTMLElement).style.opacity
    expect(dim('[data-node="read"]')).toBe('0.28')
    expect(dim('[data-node="redis"]')).toBe('0.28')
    expect(dim('[data-node="db"]')).toBe('')
    const stroke = (id: string) => container.querySelector(`[data-edge="${id}"]`)!.getAttribute('stroke')
    expect(stroke('e4')).toBe(UPSTREAM_COLOR)
    expect(stroke('e6')).toBe(DOWNSTREAM_COLOR)
    expect(dim('[data-edge="e2"]')).toBe('0.28')
    expect(container.querySelector('.ba-arch-hint')?.textContent).toContain('队列')
    /* 点同一节点 = 取消锁定 */
    fireEvent.click(container.querySelector('[data-node="queue"]')!)
    expect(dim('[data-node="read"]')).toBe('')
    expect(container.querySelector('.ba-arch-hint')).toBeNull()
  })

  it('锁定态点空白只退出聚焦（不触发重播），Esc 同样退出', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    const figure = container.querySelector('figure.ba-arch')!
    fireEvent.click(container.querySelector('[data-node="gw"]')!)
    expect(container.querySelector('.ba-arch-hint')).not.toBeNull()
    fireEvent.click(figure) /* 空白点击：退出聚焦 */
    expect(container.querySelector('.ba-arch-hint')).toBeNull()
    fireEvent.click(container.querySelector('[data-node="gw"]')!)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(container.querySelector('.ba-arch-hint')).toBeNull()
  })

  it('悬停（未锁定）无关节点/边直接隐藏（opacity 0 + pointer-events none），移开即恢复', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    const gw = container.querySelector('[data-node="gw"]')!
    fireEvent.mouseEnter(gw)
    const dim = (sel: string) => (container.querySelector(sel) as HTMLElement).style.opacity
    expect(dim('[data-node="redis"]')).toBe('0')       /* 非邻居直接隐藏 */
    expect((container.querySelector('[data-node="redis"]') as HTMLElement).style.pointerEvents).toBe('none')
    expect(dim('[data-node="client"]')).toBe('')       /* 邻居保留 */
    expect(dim('[data-edge="e7"]')).toBe('0')          /* 不相连边隐藏 */
    fireEvent.mouseLeave(gw)
    expect(dim('[data-node="redis"]')).toBe('')
    expect((container.querySelector('[data-node="redis"]') as HTMLElement).style.pointerEvents).toBe('')
  })

  it('数据光点：每条边一个 .ag-dot，颜色 = 出发节点语义色，带 animateMotion 路径', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    /* jsdom 的 cssstyle 会把 hex 归一成 rgb()——两边过同一管线再比 */
    const norm = (c: string) => { const el = document.createElement('div'); el.style.color = c; return el.style.color }
    const dots = Array.from(container.querySelectorAll<SVGCircleElement>('.ag-dot'))
    expect(dots.length).toBe(DEMO_ARCH.edges.length)
    for (const d of dots) {
      const e = DEMO_ARCH.edges.find((x) => x.id === d.getAttribute('data-edge'))!
      const fromKind = DEMO_ARCH.nodes.find((n) => n.id === e.from)!.kind
      expect(d.style.color).toBe(norm(ARCH_KIND_STYLE[fromKind].stroke))
      expect(d.querySelector('animateMotion')?.getAttribute('path')).toBeTruthy()
    }
  })
})
