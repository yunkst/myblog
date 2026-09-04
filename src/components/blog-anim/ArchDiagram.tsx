import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

export interface ArchNode {
  id: string; x: number; y: number; w: number; h: number
  kind: 'external' | 'key' | 'be' | 'db' | 'mq'
  label: string; sub: string; sigil: string
}
export interface ArchEdge {
  id: string; from: string; to: string
  fromSide: 'left' | 'right' | 'top' | 'bottom'
  toSide: 'left' | 'right' | 'top' | 'bottom'
  label?: string; emph?: boolean; dash?: boolean
  via?: { x: number; y: number }[]
  /** v2 手动微调标签位置（自动避让仍不理想的顽固边兜底） */
  labelDx?: number; labelDy?: number
}
export interface ArchBound { x: number; y: number; w: number; h: number; label: string }

/* ───────── v3 语义色板（2026-09-01，参考 archify DESIGN.md「语义色规则」浅色适配）─────────
 * 颜色只为含义服务：每种 kind 固定一个语义色（描边 + 同色 6~7% 淡底），
 * 不为「好看」加无含义的点缀。图例由图里实际出现的 kind 自动生成。 */
/* v3：淡彩改为不透明 pastel（预混白底）——图会出现在深色舞台（.stage #060606）
 * 与浅色平铺页两个语境，半透明淡底在深色上会脏；pastel + 语义描边两处都可读。 */
export interface ArchKindStyle { stroke: string; tint: string; legend: string }
export const ARCH_KIND_STYLE: Record<ArchNode['kind'], ArchKindStyle> = {
  key:      { stroke: '#0E6E5C', tint: '#EDF5F2', legend: '核心' },
  be:       { stroke: '#3B5BDB', tint: '#EEF1FC', legend: '服务' },
  db:       { stroke: '#7048E8', tint: '#F1EDFB', legend: '存储' },
  mq:       { stroke: '#E8890C', tint: '#FBF3E6', legend: '队列' },
  external: { stroke: '#5C7C8A', tint: '#EFF3F5', legend: '外部' },
}
const KIND_ORDER: ArchNode['kind'][] = ['external', 'key', 'be', 'db', 'mq']

/** GSAP 演出时间线 → ArchDiagram 内部动画的重播事件（buildArchFade 在时间线
 *  起点派发；灯箱「从头播放」/ ↻ 重看 重启时间线时，图的揭示动画同步重播） */
export const ARCH_REPLAY_EVENT = 'ag:replay'

/* 文字测量：CJK 1.05 单位 / 其余 0.65 单位（9.5px mono 实测近似校准），
 * width(text, fontSize) = units * fontSize —— 与 archify text-fit 同思路：
 * 收缩有「可辨识下限」，跌破下限由测试报错，而不是放任溢出。 */
function textUnits(s: string): number {
  let u = 0
  for (const c of s) u += c.codePointAt(0)! > 0x2e7f ? 1.05 : 0.65
  return u
}
export function fittedFontSize(text: string, width: number, preferred: number, minimum: number): number {
  const avail = Math.max(1, width - 16)
  const fitted = Math.min(preferred, avail / Math.max(1, textUnits(text)))
  return Math.max(minimum, Math.floor(fitted * 10) / 10)
}
/** 节点文字适配校验：跌破下限返回问题列表（测试断言为空数组） */
export function nodeTextFitProblems(fig: { nodes: ArchNode[] }): string[] {
  const out: string[] = []
  for (const n of fig.nodes) {
    if (fittedFontSize(n.label, n.w, 11.5, 9) * textUnits(n.label) > n.w - 16 + 0.5) {
      out.push(`节点 ${n.id} label「${n.label}」跌破 9px 下限仍溢出（宽 ${n.w}）`)
    }
    if (fittedFontSize(n.sub, n.w, 9.5, 8) * textUnits(n.sub) > n.w - 16 + 0.5) {
      out.push(`节点 ${n.id} sub「${n.sub}」跌破 8px 下限仍溢出（宽 ${n.w}）`)
    }
  }
  return out
}

/* ───────── 自动图例：只列图里实际出现的 kind + 虚线边约定 ───────── */
const LEGEND_DASH_LABEL = '次要 / 复用'
/** 图例矩形（与渲染处几何一致——测试断言它不与节点/bound/图例贴纸相撞） */
export function legendRect(fig: { nodes: ArchNode[]; edges: ArchEdge[] }, at?: { x: number; y: number }): Rect {
  const kinds = KIND_ORDER.filter((k) => fig.nodes.some((n) => n.kind === k))
  const hasDash = fig.edges.some((e) => e.dash)
  let w = 10 /* 左右内边距 */
  for (const k of kinds) w += 16 + textUnits(ARCH_KIND_STYLE[k].legend) * 9 + 8
  if (hasDash) w += 20 + textUnits(LEGEND_DASH_LABEL) * 9 + 8
  const p = at ?? { x: 12, y: 12 }
  return { x: p.x, y: p.y, w: Math.ceil(w), h: 22 }
}

interface Props {
  nodes: ArchNode[]
  edges: ArchEdge[]
  bounds?: ArchBound[]
  caption?: string
  /** 图例位置逃生口：默认左上角 (12,12)，与图元素相撞时在数据里显式指定 */
  legendAt?: { x: number; y: number }
}

/* 与 style-tile.html 同款的 demo 数据（图几何已校验：锚点在边框、回源线走底部走廊） */
export const DEMO_ARCH: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'client', x: 40, y: 100, w: 130, h: 60, kind: 'external', label: '客户端', sub: 'Browser', sigil: 'M2 4h8M2 8h8M2 12h8' },
    { id: 'gw', x: 330, y: 100, w: 130, h: 60, kind: 'key', label: 'API 网关', sub: 'auth · rate-limit', sigil: 'M6 3 3 8l3 5M10 3l3 5-3 5' },
    { id: 'redis', x: 40, y: 260, w: 120, h: 60, kind: 'db', label: 'Redis', sub: 'cache :6379', sigil: 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v4c0 1.6 2.2 3 5 3s5-1.4 5-3V5' },
    { id: 'read', x: 220, y: 260, w: 130, h: 60, kind: 'key', label: '读服务 ×3', sub: 'hash 分片 · ttl 30s', sigil: 'M4 12a6 6 0 0 1 8-5M12 12a4 3 0 0 0-8 0zM5 12v3M9 12v3' },
    { id: 'write', x: 470, y: 260, w: 130, h: 60, kind: 'be', label: '写服务', sub: 'batch · retry 3', sigil: 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10' },
    { id: 'queue', x: 650, y: 260, w: 120, h: 60, kind: 'mq', label: '队列', sub: 'fifo', sigil: 'M2 4h12M2 8h12M2 12h12M2 4v8' },
    { id: 'db', x: 820, y: 260, w: 130, h: 60, kind: 'db', label: 'PostgreSQL', sub: 'primary :5432', sigil: 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5' },
  ],
  edges: [
    { id: 'e1', from: 'client', to: 'gw', fromSide: 'right', toSide: 'left', label: 'HTTPS', emph: true },
    { id: 'e2', from: 'gw', to: 'read', fromSide: 'bottom', toSide: 'top', label: 'route', via: [{ x: 395, y: 210 }, { x: 285, y: 210 }] },
    { id: 'e3', from: 'read', to: 'redis', fromSide: 'left', toSide: 'right', label: 'read-through', emph: true },
    { id: 'e4', from: 'gw', to: 'write', fromSide: 'right', toSide: 'top', label: 'enqueue', dash: true },
    { id: 'e5', from: 'write', to: 'queue', fromSide: 'right', toSide: 'left', label: '', dash: true },
    { id: 'e6', from: 'queue', to: 'db', fromSide: 'right', toSide: 'left', label: 'flush' },
    { id: 'e7', from: 'read', to: 'db', fromSide: 'bottom', toSide: 'bottom', label: 'miss 回源', via: [{ x: 285, y: 380 }, { x: 885, y: 380 }], dash: true },
  ],
  bounds: [
    { x: 200, y: 80, w: 440, h: 260, label: '应用层 · app' },
    { x: 20, y: 240, w: 160, h: 100, label: '缓存' },
    { x: 630, y: 240, w: 340, h: 100, label: '存储 / 队列' },
  ],
}

function anchor(n: ArchNode, side: string) {
  if (side === 'left') return { x: n.x, y: n.y + n.h / 2 }
  if (side === 'right') return { x: n.x + n.w, y: n.y + n.h / 2 }
  if (side === 'top') return { x: n.x + n.w / 2, y: n.y }
  return { x: n.x + n.w / 2, y: n.y + n.h }
}
function nodeById(nodes: ArchNode[], id: string) { return nodes.find((n) => n.id === id) }
function edgePath(nodes: ArchNode[], e: ArchEdge) {
  const a = anchor(nodeById(nodes, e.from)!, e.fromSide)
  const b = anchor(nodeById(nodes, e.to)!, e.toSide)
  if (!e.via) {
    if (e.fromSide === 'right' || e.fromSide === 'left') return `M${a.x},${a.y} H${b.x} V${b.y}`
    return `M${a.x},${a.y} V${b.y} H${b.x}`
  }
  let d = `M${a.x},${a.y}`
  e.via.forEach((p) => { d += ` L${p.x},${p.y}` })
  d += ` L${b.x},${b.y}`
  return d
}

/* ───────── v2 标签布局引擎：路径感知 + 碰撞避让（2026-08-31，修「原理图普遍文本重叠」）─────────
 * 旧实现的三个系统性缺陷：
 * 1) 边标签定位天真——无 via 边放两锚点中点（共享锚点的兄弟边标签必然重叠，
 *    如「有·直接跑」/「无·首次访问」）；有 via 边放「锚点与首个 via 的中点」
 *    （第一段贴节点时标签直接盖节点标题，如「下次同站命中」盖「正文提取」）。
 * 2) bound 标签无背景、钉死在框内左上角——bound 顶边附近的节点必被撞。
 * 3) label 宽度估算不区分全半角（length*6.4），CJK 长标签溢出白底贴纸。
 * 解法：折线 50% 处取点 → 法线两侧 ±12/±20/±28 试探 → 首个不碰节点的位置胜出；
 * 全撞回退 50%+12（白底贴纸兜底）；labelDx/labelDy 提供手动微调口子。 */

interface Pt { x: number; y: number }

/** 边的完整折线（含无 via 时的 H/V 拐角），与 edgePath 的几何严格一致 */
function edgePolyline(nodes: ArchNode[], e: ArchEdge): Pt[] {
  const a = anchor(nodeById(nodes, e.from)!, e.fromSide)
  const b = anchor(nodeById(nodes, e.to)!, e.toSide)
  if (!e.via) {
    if (e.fromSide === 'right' || e.fromSide === 'left') return [a, { x: b.x, y: a.y }, b]
    return [a, { x: a.x, y: b.y }, b]
  }
  return [a, ...e.via, b]
}

/** 标签宽度估算：CJK 全角 10px、其余 6.2px（9.5px mono 实测近似），含左右内边距 14 */
export function labelWidth(s: string): number {
  let w = 14
  for (const c of s) w += c.codePointAt(0)! > 0x2e7f ? 10 : 6.2
  return w
}

/** 折线总长（光点 animateMotion 的 dur = 长度 / 统一速度） */
function polylineLength(pts: Pt[]): number {
  let L = 0
  for (let i = 0; i + 1 < pts.length; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
  return L
}

/* ───────── v3.5 边线穿越校验（2026-09-01，修「边从节点下面过」的方法论漏洞）─────────
 * 根因：旧假设「锚点在边框上 ⇒ path 只存在于两节点间隙」只对无 via 直连边成立；
 * 带 via 的绕行边（如 figArchitecture e7 的 x=680 竖线穿 policy 节点）可以
 * 去到画布任何地方，而校验体系只覆盖了贴纸类元素，从没管过边线本身。
 * 规则：边的折线段不允许穿过任何**第三方**节点（端点节点锚点在边框上合法）。
 * 纯贴边（graze）不算穿越——节点矩形内缩 1px 判定。 */
export function edgeNodeCrossings(fig: { nodes: ArchNode[]; edges: ArchEdge[] }): string[] {
  const out: string[] = []
  const segInt = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const cross = (o: Pt, u: Pt, v: Pt) => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x)
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d)
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  }
  const segHitNode = (p: Pt, q: Pt, n: ArchNode) => {
    const x1 = n.x + 1, y1 = n.y + 1, x2 = n.x + n.w - 1, y2 = n.y + n.h - 1
    const inside = (s: Pt) => s.x > x1 && s.x < x2 && s.y > y1 && s.y < y2
    if (inside(p) || inside(q)) return true
    return segInt(p, q, { x: x1, y: y1 }, { x: x2, y: y1 })
      || segInt(p, q, { x: x2, y: y1 }, { x: x2, y: y2 })
      || segInt(p, q, { x: x2, y: y2 }, { x: x1, y: y2 })
      || segInt(p, q, { x: x1, y: y2 }, { x: x1, y: y1 })
  }
  for (const e of fig.edges) {
    const pts = edgePolyline(fig.nodes, e)
    for (let i = 0; i + 1 < pts.length; i++) {
      for (const n of fig.nodes) {
        if (n.id === e.from || n.id === e.to) continue
        if (segHitNode(pts[i], pts[i + 1], n)) {
          out.push(`边 ${e.id}（${e.from}→${e.to}）第 ${i + 1} 段穿过节点 ${n.id}「${n.label}」`)
        }
      }
    }
  }
  return out
}

interface Rect { x: number; y: number; w: number; h: number }
/** 矩形相交判定（a 为标签、b 外扩 pad 留呼吸缝） */
const hitRect = (a: Rect, b: Rect, pad = 2) =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad
const hitNode = (r: Rect, n: ArchNode) =>
  hitRect(r, { x: n.x, y: n.y, w: n.w, h: n.h })

/** bound 图例贴纸矩形（与渲染处的几何公式一致——碰撞避让需要把它当障碍物） */
export function boundLegendRect(b: ArchBound): Rect {
  const bw = labelWidth(b.label) + b.label.length * 3 + 6
  return { x: b.x + 10, y: b.y - 9, w: bw, h: 18 }
}

/**
 * v2.1：除节点外，额外避开 obstacles（bound 图例 + 已放置的其他边标签）——
 * 修「标签撞 bound 图例 / 标签互撞」（2026-08-31 截图实锤：
 * 「有·直接跑」撞 bound 图例、「无·首次访问」与「执行」互撞）。
 * 导出供测试：验证所有图数据的标签落点无碰撞。
 */
export function edgeLabelPos(nodes: ArchNode[], e: ArchEdge, wpx: number, obstacles: Rect[] = []): Pt {
  const pts = edgePolyline(nodes, e)
  const segs: { p: Pt; q: Pt; len: number }[] = []
  let total = 0
  for (let i = 0; i + 1 < pts.length; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
    if (len > 0.01) { segs.push({ p: pts[i], q: pts[i + 1], len }); total += len }
  }
  if (segs.length === 0) return pts[0]
  /* 折线上 t（0~1）处的点 + 单位法线 */
  const at = (t: number) => {
    let d = t * total
    for (const s of segs) {
      if (d <= s.len) {
        const k = d / s.len
        return {
          x: s.p.x + (s.q.x - s.p.x) * k,
          y: s.p.y + (s.q.y - s.p.y) * k,
          nx: -(s.q.y - s.p.y) / s.len,
          ny: (s.q.x - s.p.x) / s.len,
        }
      }
      d -= s.len
    }
    const s = segs[segs.length - 1]
    return { x: s.q.x, y: s.q.y, nx: -(s.q.y - s.p.y) / s.len, ny: (s.q.x - s.p.x) / s.len }
  }
  let fallback = pts[0]
  for (const t of [0.5, 0.35, 0.65]) {
    const { x, y, nx, ny } = at(t)
    /* 偏移候选放开到 ±56：窄间隙边（两节点仅 60px）的标签比间隙宽时，
     * 只有「离边更远」才能同时避开两侧节点（DEMO_ARCH e3 实锤） */
    for (const off of [12, -12, 20, -20, 28, -28, 40, -40, 56, -56]) {
      const cx = x + nx * off
      const cy = y + ny * off
      if (t === 0.5 && off === 12) fallback = { x: cx, y: cy }
      const rect = { x: cx - wpx / 2, y: cy - 8, w: wpx, h: 16 }
      if (!nodes.some((n) => hitNode(rect, n)) && !obstacles.some((o) => hitRect(rect, o))) {
        return { x: cx, y: cy }
      }
    }
  }
  return fallback
}

/* ───────── v3.1 交互聚焦（参考 archify「交互不编造拓扑」：只高亮作者定义的
 * 关系，上下游沿有向边 BFS，不推断任何运行时影响）───────── */
/** 语义色：上游 = 服务蓝，下游 = 核心绿（复用色板，不新增无含义颜色） */
export const UPSTREAM_COLOR = '#3B5BDB'
export const DOWNSTREAM_COLOR = '#0E6E5C'
export const DIM_OPACITY = 0.28

export interface ReachSets { up: Set<string>; down: Set<string>; upE: Set<string>; downE: Set<string> }
/** 从焦点节点沿有向边做双向 BFS：上游（逆向可达）/ 下游（顺向可达）的节点与边 */
export function reachableSets(edges: ArchEdge[], id: string): ReachSets {
  const up = new Set<string>(), down = new Set<string>()
  const upE = new Set<string>(), downE = new Set<string>()
  let frontier = [id]
  while (frontier.length) {
    const cur = frontier.pop()!
    for (const e of edges) {
      if (e.to === cur && !upE.has(e.id)) {
        upE.add(e.id)
        if (!up.has(e.from)) { up.add(e.from); frontier.push(e.from) }
      }
    }
  }
  frontier = [id]
  while (frontier.length) {
    const cur = frontier.pop()!
    for (const e of edges) {
      if (e.from === cur && !downE.has(e.id)) {
        downE.add(e.id)
        if (!down.has(e.to)) { down.add(e.to); frontier.push(e.to) }
      }
    }
  }
  return { up, down, upE, downE }
}
/** 悬停用的直接邻接（一度邻居 + 相连边） */
export function adjacentSets(edges: ArchEdge[], id: string): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>(), es = new Set<string>()
  for (const e of edges) {
    if (e.from === id) { nodes.add(e.to); es.add(e.id) }
    if (e.to === id) { nodes.add(e.from); es.add(e.id) }
  }
  return { nodes, edges: es }
}

export function ArchDiagram({ nodes, edges, bounds = [], caption, legendAt }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const played = useRef(false)
  /* v3.1 交互聚焦：focusId = 点击锁定（上下游 BFS），hoverId = 悬停（一度邻接）；
   * 锁定时悬停不生效。冲突约定：点节点=聚焦（stopPropagation），点空白=重播，
   * 锁定时点空白只退出聚焦不重播，Esc 同效。 */
  const [focusId, setFocusId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const playRef = useRef<() => void>(() => {})
  const W = Math.max(...nodes.map((n) => n.x + n.w)) + 60
  const H = Math.max(...nodes.map((n) => n.y + n.h)) + 60

  const reach = focusId ? reachableSets(edges, focusId) : null
  const adj = !focusId && hoverId ? adjacentSets(edges, hoverId) : null
  const dimNode = (id: string) =>
    reach ? id !== focusId && !reach.up.has(id) && !reach.down.has(id)
      : adj ? id !== hoverId && !adj.nodes.has(id) : false
  const dimEdge = (id: string) =>
    reach ? !reach.upE.has(id) && !reach.downE.has(id)
      : adj ? !adj.edges.has(id) : false
  /* 聚焦/悬停涉及的边：光点放大一档（与淡出相反方向的强调） */
  const edgeActive = (id: string) =>
    reach ? reach.upE.has(id) || reach.downE.has(id)
      : adj ? adj.edges.has(id) : false
  /* 聚焦时边按方向换语义色（上下游同在回环里的边取下游绿），marker 同步换色 */
  const edgeColor = (e: ArchEdge) => {
    if (reach) {
      if (reach.downE.has(e.id)) return DOWNSTREAM_COLOR
      if (reach.upE.has(e.id)) return UPSTREAM_COLOR
    }
    return e.emph ? DOWNSTREAM_COLOR : e.dash ? '#8FA3AB' : '#55665F'
  }
  const edgeMarker = (e: ArchEdge) => {
    if (reach) {
      if (reach.downE.has(e.id)) return 'url(#arE)'
      if (reach.upE.has(e.id)) return 'url(#arU)'
    }
    return e.emph ? 'url(#arE)' : e.dash ? 'url(#arD)' : 'url(#ar)'
  }

  useEffect(() => {
    if (!focusId) return
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setFocusId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusId])

  /* v3.1.1 原生事件委托（2026-09-01）：灯箱全屏把 clip reparent 到 body，脱离
   * React 根容器后合成事件（onClick/onMouseEnter）根本到不了这棵子树——
   * 交互全部改为挂在 figure 上的原生监听，DOM 被搬到哪里都生效。
   * 状态读取走 focusRef 镜像，handler 用函数式 setState 不捕旧值。 */
  const focusRef = useRef<string | null>(null)
  focusRef.current = focusId
  useEffect(() => {
    const fig = wrapRef.current
    if (!fig) return
    const nodeOf = (t: EventTarget | null) =>
      (t as Element | null)?.closest?.('.ag-node') ?? null
    const onClick = (ev: Event) => {
      const nodeEl = nodeOf(ev.target)
      if (nodeEl && fig.contains(nodeEl)) {
        const id = nodeEl.getAttribute('data-node')!
        setFocusId((f) => (f === id ? null : id))
      } else if (focusRef.current) {
        setFocusId(null) /* 锁定态点空白：只退出聚焦，不重播 */
      } else {
        playRef.current() /* 非锁定态点空白：重播 */
      }
    }
    const onOver = (ev: Event) => {
      if (focusRef.current) return /* 锁定态悬停不生效 */
      const nodeEl = nodeOf(ev.target)
      if (nodeEl && fig.contains(nodeEl)) setHoverId(nodeEl.getAttribute('data-node'))
    }
    const onOut = (ev: Event) => {
      const nodeEl = nodeOf(ev.target)
      if (!nodeEl) return
      const rel = (ev as MouseEvent).relatedTarget as Element | null
      if (rel && nodeEl.contains(rel)) return /* 节点内部子元素间移动不算移出 */
      setHoverId((h) => (h === nodeEl.getAttribute('data-node') ? null : h))
    }
    const onReplay = () => playRef.current()
    fig.addEventListener('click', onClick)
    fig.addEventListener('mouseover', onOver)
    fig.addEventListener('mouseout', onOut)
    fig.addEventListener(ARCH_REPLAY_EVENT, onReplay)
    return () => {
      fig.removeEventListener('click', onClick)
      fig.removeEventListener('mouseover', onOver)
      fig.removeEventListener('mouseout', onOut)
      fig.removeEventListener(ARCH_REPLAY_EVENT, onReplay)
    }
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const reduced = prefersReducedMotion()
    const ns = Array.from(svg.querySelectorAll<SVGGElement>('.ag-node'))
    const es = Array.from(svg.querySelectorAll<SVGPathElement>('.ag-edge'))
    const boundsEls = Array.from(svg.querySelectorAll<SVGElement>('.ag-bound, .ag-bound-label, .ag-legend'))
    const labs = Array.from(svg.querySelectorAll<SVGElement>('.ag-lab-bg, .ag-lab-tx'))
    const dots = Array.from(svg.querySelectorAll<SVGCircleElement>('.ag-dot'))
    const play = () => {
      if (reduced) return
      ns.forEach((n) => { n.style.transition = 'none'; n.style.opacity = '0' })
      es.forEach((p) => {
        const len = p.getTotalLength()
        p.style.transition = 'none'
        p.style.strokeDasharray = `${len} ${len}`
        p.style.strokeDashoffset = String(len)
        p.style.opacity = '1'
      })
      boundsEls.forEach((b) => { b.style.transition = 'none'; b.style.opacity = '0' })
      labs.forEach((l) => { l.style.transition = 'none'; l.style.opacity = '0' })
      dots.forEach((d) => { d.style.transition = 'none'; d.style.opacity = '0' })
      void wrap.offsetWidth
      setTimeout(() => boundsEls.forEach((b) => { b.style.transition = 'opacity .5s'; b.style.opacity = '1' }), 60)
      /* 按 DOM 顺序播放（DOM 顺序即 props.nodes/edges 数据顺序），不再硬编码 demo 的 id 列表 */
      ns.forEach((n, i) => setTimeout(() => {
        n.style.transition = 'opacity .4s'; n.style.opacity = '1'
      }, 200 + i * 260))
      es.forEach((p, i) => setTimeout(() => {
        p.style.transition = 'stroke-dashoffset .55s ease'; p.style.strokeDashoffset = '0'
      }, 200 + (i + 1.5) * 260))
      /* labels 时间跟随实际规模，避免大图过早/小图过晚 */
      setTimeout(() => labs.forEach((l) => { l.style.transition = 'opacity .5s'; l.style.opacity = '1' }), 200 + (es.length + 2) * 260)
      /* v3.3 光点：标签揭示后淡入（'' 回落到 attribute 0.9），随后常流 */
      setTimeout(() => dots.forEach((d) => { d.style.transition = 'opacity .6s'; d.style.opacity = '' }), 200 + (es.length + 2.5) * 260)
      played.current = true
    }
    playRef.current = play
    play()
    return () => { playRef.current = () => {} }
  }, [])

  return (
    /* 事件全部走 figure 上的原生委托（见 useEffect），JSX 不挂合成 handler——
       灯箱 reparent 到 body 后合成事件失效 */
    <figure className="ba-arch" ref={wrapRef}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption || '架构示意'}>
        {/* 1) 容器 bounds（v2：标签改为 fieldset 图例式——白底贴纸跨在顶边上，
                不再钉在框内左上角撞节点） */}
        {bounds.map((b) => {
          const lr = boundLegendRect(b)
          return (
            <g key={b.label + b.x}>
              <rect className="ag-bound" x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
                fill="rgba(14,110,92,.045)" stroke="rgba(28,43,40,.3)" strokeWidth={1} strokeDasharray="6 4" />
              <rect className="ag-lab-bg" x={lr.x} y={lr.y} width={lr.w} height={lr.h} rx={3} fill="#F6F7F4" />
              <text className="ag-bound-label" x={lr.x + lr.w / 2} y={b.y + 3.5} textAnchor="middle"
                fontSize={10} letterSpacing={3}
                fill="#55665F" fontFamily="var(--fang),serif">{b.label}</text>
            </g>
          )
        })}
        {/* 2) 边线（锚点都在节点边框上，所以 path 实际只存在于两节点间隙中，节点不会遮 path）
            v3 边分级：emph=主路径语义绿加粗；dash=次要/复用灰虚线；普通=墨色细线 */}
        {edges.map((e) => (
          <path key={`l-${e.id}`} className={`ag-edge${dimEdge(e.id) ? ' ag-dim' : ''}`} data-edge={e.id}
            d={edgePath(nodes, e)}
            fill="none" stroke={edgeColor(e)} strokeWidth={e.emph ? 1.8 : 1.4}
            strokeDasharray={e.dash ? '5 4' : undefined}
            style={dimEdge(e.id) ? { opacity: adj ? 0 : DIM_OPACITY } : undefined}
            markerEnd={edgeMarker(e)} />
        ))}
        {/* 2b) 数据光点（v3.3，2026-09-01 用户裁定：比「走一遍即消失的虚线」直观）：
            每条边一个光点，SMIL animateMotion 沿边匀速常流（110 单位/秒）；
            颜色 = 出发节点的语义色——不同线路自然不同色，颜色仍只为含义服务。
            聚焦/悬停时相关边光点放大；随边一起淡出；reduced-motion 由 CSS 隐藏。 */}
        {edges.map((e) => {
          const fromKind = nodeById(nodes, e.from)!.kind
          const len = polylineLength(edgePolyline(nodes, e))
          const dim = dimEdge(e.id)
          return (
            <circle key={`dot-${e.id}`} data-edge={e.id}
              className={`ag-dot${dim ? ' ag-dim' : ''}`}
              r={edgeActive(e.id) ? 3.4 : 2.5}
              fill="currentColor" opacity={0.9} pointerEvents="none"
              style={{ color: ARCH_KIND_STYLE[fromKind].stroke, ...(dim ? { opacity: adj ? 0 : DIM_OPACITY } : {}) }}>
              <animateMotion dur={`${Math.max(0.6, len / 110).toFixed(2)}s`}
                repeatCount="indefinite" calcMode="linear" path={edgePath(nodes, e)} />
            </circle>
          )
        })}
        {/* 3) 节点（在边之上：节点白底自然遮挡穿过间隙的边线，不挡边线全段）
            v3 语义色：pastel 淡底 + 语义描边 + 同色 sigil；key 加粗保留层级。
            文字收缩有下限（label 9px / sub 8px），跌破下限由 nodeTextFitProblems 测试拦截 */}
        {nodes.map((n) => {
          const ks = ARCH_KIND_STYLE[n.kind]
          const labelFs = fittedFontSize(n.label, n.w, 11.5, 9)
          const subFs = fittedFontSize(n.sub, n.w, 9.5, 8)
          const dim = dimNode(n.id)
          /* v3.4（2026-09-01 用户裁定）：悬停时无关节点直接隐藏（opacity 0 +
           * pointer-events:none 防幽灵悬停/闪烁）；锁定聚焦仍淡出 0.28 保留上下文 */
          const hide = dim && !!adj
          return (
            <g key={n.id} data-node={n.id}
              className={`ag-node${dim ? ' ag-dim' : ''}${focusId === n.id ? ' ag-focus' : ''}`}
              style={{
                ...(dim ? { opacity: hide ? 0 : DIM_OPACITY } : {}),
                ...(hide ? { pointerEvents: 'none' as const } : {}),
              }}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={2} fill={ks.tint}
                stroke={ks.stroke} strokeWidth={n.kind === 'key' ? 1.8 : 1.2} />
              <path d={n.sigil} transform={`translate(${n.x + 8} ${n.y + 7}) scale(0.85)`} fill="none"
                stroke={ks.stroke} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
              <text x={n.x + n.w / 2} y={n.y + 26} textAnchor="middle" fontSize={labelFs} fontWeight={600}
                fill="#1C2B28" fontFamily="var(--sans),sans-serif">{n.label}</text>
              <text x={n.x + n.w / 2} y={n.y + 44} textAnchor="middle" fontSize={subFs} fill="#55665F"
                fontFamily="var(--mono),monospace" letterSpacing={0.5}>{n.sub}</text>
            </g>
          )
        })}
        {/* 4) 边 label（v2.1：预排一遍——按边序放置，bound 图例与已放标签都计入
                障碍集，标签互撞/撞图例在布局期消化；labelDx/labelDy 手动兜底） */}
        {(() => {
          const obstacles: Rect[] = bounds.map(boundLegendRect)
          return edges.map((e) => {
            if (!e.label) return null
            const wpx = labelWidth(e.label)
            const p = edgeLabelPos(nodes, e, wpx, obstacles)
            const lx = p.x + (e.labelDx ?? 0)
            const ly = p.y + (e.labelDy ?? 0)
            const rect: Rect = { x: lx - wpx / 2, y: ly - 8, w: wpx, h: 16 }
            obstacles.push(rect)
            return (
              <g key={`lab-${e.id}`} className={dimEdge(e.id) ? 'ag-dim' : undefined}
                style={dimEdge(e.id) ? { opacity: adj ? 0 : DIM_OPACITY } : undefined}>
                <rect className="ag-lab-bg" x={rect.x} y={rect.y} width={wpx} height={16} rx={3} fill="#F6F7F4" />
                <text className="ag-lab-tx" x={lx} y={ly + 3.5} textAnchor="middle" fontSize={9.5}
                  fill={e.emph ? '#0E6E5C' : '#55665F'} fontFamily="var(--mono),monospace">{e.label}</text>
              </g>
            )
          })
        })()}
        {/* 5) 自动图例（v3，参考 archify「图例自动规则」）：只列图里实际出现的
                kind + 有虚线边时追加「次要 / 复用」约定；位置由 legendRect 计算，
                测试断言不与任何节点 / bound / bound 图例贴纸相撞 */}
        {(() => {
          const kinds = KIND_ORDER.filter((k) => nodes.some((n) => n.kind === k))
          const hasDash = edges.some((e) => e.dash)
          const lr = legendRect({ nodes, edges }, legendAt)
          let cx = lr.x + 6
          return (
            <g className="ag-legend">
              <rect x={lr.x} y={lr.y} width={lr.w} height={lr.h} rx={3}
                fill="#F6F7F4" stroke="rgba(28,43,40,.18)" strokeWidth={1} />
              {kinds.map((k) => {
                const ks = ARCH_KIND_STYLE[k]
                const chipW = 16 + textUnits(ks.legend) * 9 + 8
                const chip = (
                  <g key={`lg-${k}`}>
                    <rect x={cx + 8} y={lr.y + 6} width={10} height={10} rx={2}
                      fill={ks.tint} stroke={ks.stroke} strokeWidth={1.2} />
                    <text x={cx + 22} y={lr.y + 14.5} fontSize={9} fill="#55665F"
                      fontFamily="var(--mono),monospace">{ks.legend}</text>
                  </g>
                )
                cx += chipW
                return chip
              })}
              {hasDash && (
                <g>
                  <line x1={cx + 8} y1={lr.y + 11} x2={cx + 24} y2={lr.y + 11}
                    stroke="#8FA3AB" strokeWidth={1.4} strokeDasharray="4 3" />
                  <text x={cx + 28} y={lr.y + 14.5} fontSize={9} fill="#55665F"
                    fontFamily="var(--mono),monospace">{LEGEND_DASH_LABEL}</text>
                </g>
              )}
            </g>
          )
        })()}
        <defs>
          <marker id="ar" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#55665F" />
          </marker>
          <marker id="arE" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#0E6E5C" />
          </marker>
          <marker id="arD" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#8FA3AB" />
          </marker>
          <marker id="arU" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#3B5BDB" />
          </marker>
        </defs>
      </svg>
      {/* v3.1 聚焦状态条：archify「chip 可概述 focus 状态」原则——只概述状态，不做图标按钮 */}
      {focusId && (
        <div className="ba-arch-hint">
          聚焦「{nodeById(nodes, focusId)?.label}」 ·{' '}
          <span className="up">蓝 = 上游</span> · <span className="down">绿 = 下游</span> ·{' '}
          Esc / 点击空白退出
        </div>
      )}
      {caption && <figcaption className="ba-arch-caption">{caption}</figcaption>}
    </figure>
  )
}

export default ArchDiagram
