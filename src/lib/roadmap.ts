import type { ExploreConfig } from './types'
import { resolveExploreHref } from './explore'

/**
 * 探索路线图布局（v6：HistoryPanel → RoadmapPanel 改造）。
 *
 * 输入 ExploreConfig（有向图，可含环、可含跨文章出口），输出分层布局：
 * - **树边**（BFS 首发现目标节点的边）= 主骨架，画实线、参与分层；
 * - **回边/横叉边**（出口指向已布局节点，如「回到入口」「上一层」）= 不画线，
 *   降级为源节点上的 ↩ 标记（backLabels 存目标 label，hover 浮出）；
 * - **跨文章出口**（to: { post, scene }）= portal 叶子节点，href 预解析，
 *   不展开对方子图——图规模永久锁死在「单篇节点数 + portal 数」；
 * - **孤儿幕**（entry 不可达）逐条以新根 BFS 附加到末尾列，保证图不缺幕。
 *
 * applyFocus：节点数 > ROADMAP_FOCUS_THRESHOLD 时面板默认聚焦模式——
 * 只留「已读 ∪ 入口→当前路径 ∪ 当前邻居」，其余折叠成 +N 未探索聚合节点。
 */

export interface RoadmapNode {
  id: string
  label: string
  kind: 'scene' | 'portal' | 'more'
  mode?: 1 | 2 | 3
  /** portal：整页跳转地址（resolveExploreHref 预解析） */
  href?: string
  /** 回边目标 label 列表（↩ 标记的 tooltip），不参与连线与分层 */
  backLabels: string[]
  layer: number
  row: number
  x: number
  y: number
  /** kind='more'：被折叠的未探索场景数 */
  hiddenCount?: number
}

export interface RoadmapEdge {
  from: string
  to: string
}

export interface RoadmapLayout {
  nodes: RoadmapNode[]
  edges: RoadmapEdge[]
  width: number
  height: number
  /** 完整图节点数（聚焦裁剪后仍指全图规模，供阈值/图例判断） */
  total: number
}

export const ROADMAP_NODE_W = 180
export const ROADMAP_NODE_H = 52
export const ROADMAP_COL_GAP = 72
export const ROADMAP_ROW_GAP = 16
export const ROADMAP_PAD = 24
/** 节点数超过该阈值时面板默认聚焦模式（可手动切全图） */
export const ROADMAP_FOCUS_THRESHOLD = 20

/** 分层坐标：layer=列（x 左→右），列内按发现序排 row（y 上→下），各列垂直居中。 */
function assignCoords(nodes: RoadmapNode[]): { width: number; height: number } {
  const byLayer = new Map<number, RoadmapNode[]>()
  let maxLayer = 0
  for (const n of nodes) {
    const arr = byLayer.get(n.layer) ?? []
    arr.push(n)
    byLayer.set(n.layer, arr)
    if (n.layer > maxLayer) maxLayer = n.layer
  }
  const stepY = ROADMAP_NODE_H + ROADMAP_ROW_GAP
  let maxRows = 1
  for (const arr of byLayer.values()) maxRows = Math.max(maxRows, arr.length)
  const maxH = maxRows * stepY - ROADMAP_ROW_GAP
  for (const [layer, arr] of byLayer) {
    const h = arr.length * stepY - ROADMAP_ROW_GAP
    arr.forEach((n, row) => {
      n.row = row
      n.x = ROADMAP_PAD + layer * (ROADMAP_NODE_W + ROADMAP_COL_GAP)
      n.y = ROADMAP_PAD + (maxH - h) / 2 + row * stepY
    })
  }
  return {
    width: ROADMAP_PAD * 2 + (maxLayer + 1) * (ROADMAP_NODE_W + ROADMAP_COL_GAP) - ROADMAP_COL_GAP,
    height: ROADMAP_PAD * 2 + maxH,
  }
}

export function computeRoadmapLayout(config: ExploreConfig): RoadmapLayout {
  const byId = new Map(config.scenes.map((s) => [s.id, s]))
  /** Map 迭代序 = 插入序 = 发现序，assignCoords 的列内排序依赖这一点 */
  const nodes = new Map<string, RoadmapNode>()
  const edges: RoadmapEdge[] = []
  let maxLayer = 0

  const mkScene = (id: string, layer: number): RoadmapNode => {
    const s = byId.get(id)!
    const n: RoadmapNode = {
      id, label: s.label, kind: 'scene', mode: s.mode,
      backLabels: [], layer, row: 0, x: 0, y: 0,
    }
    nodes.set(id, n)
    maxLayer = Math.max(maxLayer, layer)
    return n
  }

  /** 从 root 做 BFS；返回用到的最大 layer。 */
  const bfs = (rootId: string, baseLayer: number): void => {
    const layerOf = new Map<string, number>([[rootId, baseLayer]])
    mkScene(rootId, baseLayer)
    const queue = [rootId]
    while (queue.length > 0) {
      const id = queue.shift()!
      const scene = byId.get(id)!
      const layer = layerOf.get(id)!
      for (const exit of [...(scene.features ?? []), ...(scene.questions ?? [])]) {
        if (typeof exit.to === 'string') {
          const target = exit.to
          /* 坏目标（指向不存在的幕）由 validate:explore 把关，布局期静默跳过 */
          if (!byId.has(target)) continue
          if (nodes.has(target)) {
            /* 回边/横叉边：不画线，记到源节点 ↩ 标记（按 label 去重） */
            const src = nodes.get(id)!
            const label = byId.get(target)!.label
            if (!src.backLabels.includes(label)) src.backLabels.push(label)
          } else {
            mkScene(target, layer + 1)
            layerOf.set(target, layer + 1)
            edges.push({ from: id, to: target })
            queue.push(target)
          }
        } else {
          /* 跨文章出口：portal 叶子（不展开外部子图）；多个源指向同一 portal 各自画边 */
          const pid = `portal:${exit.to.post}:${exit.to.scene}`
          if (!nodes.has(pid)) {
            nodes.set(pid, {
              id: pid, label: exit.text, kind: 'portal',
              href: resolveExploreHref(exit.to, config),
              backLabels: [], layer: layer + 1, row: 0, x: 0, y: 0,
            })
            maxLayer = Math.max(maxLayer, layer + 1)
          }
          edges.push({ from: id, to: pid })
        }
      }
    }
  }

  const entry = byId.has(config.entry) ? config.entry : config.scenes[0]?.id
  if (entry) bfs(entry, 0)
  /* 孤儿幕（entry 不可达）：按 yaml 序逐条作为新根附加到末尾列 */
  for (const s of config.scenes) {
    if (!nodes.has(s.id)) bfs(s.id, maxLayer + 1)
  }

  const nodeList = [...nodes.values()]
  const { width, height } = assignCoords(nodeList)
  return { nodes: nodeList, edges, width, height, total: nodeList.length }
}

/**
 * 聚焦模式裁剪：已读 ∪ 入口→当前路径 ∪ 当前节点邻居，其余场景折叠为 +N 未探索。
 * 节点数 ≤ 阈值时原样返回（调用方无须判断）。
 * 返回新 layout——节点全部克隆，不改写传入的全图（父组件 useMemo 缓存）。
 */
export function applyFocus(
  layout: RoadmapLayout,
  currentId: string,
  visited: readonly string[],
): RoadmapLayout {
  if (layout.nodes.length <= ROADMAP_FOCUS_THRESHOLD) return layout

  const visible = new Set<string>(visited)
  visible.add(currentId)
  /* 入口→当前路径：沿树边 parent 链回走 */
  const parent = new Map<string, string>()
  for (const e of layout.edges) if (!parent.has(e.to)) parent.set(e.to, e.from)
  let cur = currentId
  while (parent.has(cur)) {
    cur = parent.get(cur)!
    visible.add(cur)
  }
  /* 当前节点的直接邻居（出 + 入，含 portal） */
  for (const e of layout.edges) {
    if (e.from === currentId) visible.add(e.to)
    if (e.to === currentId) visible.add(e.from)
  }

  const hiddenCount = layout.nodes.filter((n) => n.kind === 'scene' && !visible.has(n.id)).length
  const nodes = layout.nodes
    .filter((n) => visible.has(n.id))
    .map((n) => ({ ...n, backLabels: [...n.backLabels] }))
  const curNode = layout.nodes.find((n) => n.id === currentId)
  if (hiddenCount > 0 && curNode) {
    nodes.push({
      id: '__more__', label: `+${hiddenCount} 未探索`, kind: 'more',
      backLabels: [], layer: curNode.layer + 1, row: 0, x: 0, y: 0,
      hiddenCount,
    })
  }
  const kept = new Set(nodes.map((n) => n.id))
  const edges = layout.edges.filter((e) => kept.has(e.from) && kept.has(e.to))
  const { width, height } = assignCoords(nodes)
  return { nodes, edges, width, height, total: layout.total }
}
