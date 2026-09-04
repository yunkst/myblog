// diagrams.ts — 本文章的架构图数据（设计契约见 docs/diagram-design.md）
// 写完跑 vitest run src/components/blog-anim/ArchDiagram.test.tsx：
// 文字下限 / 标签避让 / 边线穿节点 / 图例碰撞全部自动校验（glob 自动发现，无需注册）。
import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'

export const figTplOverview: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'user', x: 60,  y: 120, w: 180, h: 70, kind: 'external', label: '输入',   sub: '用户/上游', sigil: SIGIL_DOC },
    { id: 'core', x: 330, y: 120, w: 220, h: 70, kind: 'key',      label: '核心处理', sub: '本幕的主角', sigil: SIGIL_ARROWS },
    { id: 'out',  x: 640, y: 120, w: 180, h: 70, kind: 'be',       label: '输出',   sub: '下游/结果', sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'user', to: 'core', fromSide: 'right', toSide: 'left',  label: '请求', emph: true },
    { id: 'e2', from: 'core', to: 'out',  fromSide: 'right', toSide: 'left',  label: '结果', emph: true },
  ],
  bounds: [],
}

export const figTplDetail: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'a', x: 60,  y: 120, w: 180, h: 70, kind: 'key', label: '模块 A', sub: '职责一句话', sigil: SIGIL_ARROWS },
    { id: 'b', x: 330, y: 120, w: 180, h: 70, kind: 'db',  label: '模块 B', sub: '职责一句话', sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'a', to: 'b', fromSide: 'right', toSide: 'left', label: '调用', emph: true },
    { id: 'e2', from: 'b', to: 'a', fromSide: 'left',  toSide: 'right', label: '回包', dash: true, via: [{ x: 240, y: 250 }, { x: 150, y: 250 }] },
  ],
  bounds: [],
}
