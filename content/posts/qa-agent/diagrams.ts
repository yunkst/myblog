import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

/* 共用 sigil（沿用 ArchDiagram DEMO 已校验的 16x16 SVG path） */
const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 图 1：服务总览（flowchart LR）─────────────────
 * 主链路横排在 y60；GitLab 同步源放 y200 与主链垂直错开；
 * 回程边 e4 走 y170 行间通道（两节点底边 y120 以下无元素）。 */
export const figQaOverview: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 图例挪到底部空带（y>260 全图无元素） */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 12, y: 290 },
  nodes: [
    { id: 'staff',    x: 40,  y: 60,  w: 130, h: 60, kind: 'external', label: '员工',         sub: '平台对话页提问',        sigil: SIGIL_DOC },
    { id: 'platform', x: 230, y: 60,  w: 170, h: 60, kind: 'be',       label: 'AI 数字员工平台', sub: '主 agent',              sigil: SIGIL_WRITE },
    { id: 'qa',       x: 460, y: 60,  w: 180, h: 60, kind: 'key',      label: '知识库问答服务',  sub: '独立部署 · 只读工具',   sigil: SIGIL_ARROWS },
    { id: 'repos',    x: 700, y: 60,  w: 150, h: 60, kind: 'db',       label: '本地知识副本',    sub: '每 5 分钟同步',         sigil: SIGIL_DB },
    { id: 'gitlab',   x: 700, y: 200, w: 150, h: 60, kind: 'external', label: 'GitLab 仓库',    sub: '知识即代码',            sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'staff',    to: 'platform', fromSide: 'right', toSide: 'left',  label: '① 提问', emph: true },
    { id: 'e2', from: 'platform', to: 'qa',       fromSide: 'right', toSide: 'left',  label: '② 调用只读工具', emph: true },
    { id: 'e3', from: 'qa',       to: 'repos',    fromSide: 'right', toSide: 'left',  label: '③ 读文件 / 搜索' },
    { id: 'e4', from: 'qa',       to: 'platform', fromSide: 'bottom', toSide: 'bottom', label: '④ 只回最终答案', dash: true, via: [{ x: 550, y: 170 }, { x: 315, y: 170 }] },
    { id: 'e5', from: 'gitlab',   to: 'repos',    fromSide: 'top',   toSide: 'bottom', label: '周期同步 + 失败自愈' },
  ],
  bounds: [],
}

/* ───────────────── 图 2：流式协议分流（flowchart TD）─────────────────
 * 过程解说盒放 y200；e4 回程走 y300 底部通道（解说盒底边 y260 以下无元素）。 */
export const figAsTool: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 图例挪到左下角空带 */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 12, y: 320 },
  nodes: [
    { id: 'center',  x: 40,  y: 60,  w: 180, h: 60, kind: 'be',  label: '平台主 agent',  sub: '按需检索发现此工具',      sigil: SIGIL_WRITE },
    { id: 'qa',      x: 300, y: 60,  w: 180, h: 60, kind: 'key', label: '知识库问答服务', sub: '契约工具 · 只读级',       sigil: SIGIL_ARROWS },
    { id: 'thought', x: 300, y: 200, w: 180, h: 60, kind: 'db',  label: '过程解说',       sub: '只展示给提问者看',        sigil: SIGIL_DOC },
    { id: 'answer',  x: 560, y: 200, w: 160, h: 60, kind: 'be',  label: '最终答案',       sub: '唯一进主 agent 上下文',   sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'center', to: 'qa',      fromSide: 'right',  toSide: 'left',  label: '① 调用', emph: true },
    { id: 'e2', from: 'qa',     to: 'thought', fromSide: 'bottom', toSide: 'top',   label: '② 检索 / 读文件过程', dash: true },
    { id: 'e3', from: 'qa',     to: 'answer',  fromSide: 'right',  toSide: 'top',   label: '③ 产出', via: [{ x: 620, y: 140 }] },
    { id: 'e4', from: 'answer', to: 'center',  fromSide: 'bottom', toSide: 'bottom', label: '④ 只有答案回流', emph: true, via: [{ x: 640, y: 300 }, { x: 130, y: 300 }] },
  ],
  bounds: [],
}
