import { useMemo, useState } from 'react'
import {
  applyFocus,
  ROADMAP_FOCUS_THRESHOLD,
  ROADMAP_NODE_W,
  ROADMAP_NODE_H,
  type RoadmapLayout,
  type RoadmapNode,
} from '../../lib/roadmap'

interface Props {
  /** 受控：false 时整层不挂载 */
  open: boolean
  onClose: () => void
  /** 完整图布局（调用方 useMemo 缓存；聚焦裁剪在本组件内做） */
  layout: RoadmapLayout
  currentId: string
  /** 已读幕 id（useHistoryStack.visited，只增不减） */
  visited: readonly string[]
  /** 点击任意场景节点（含未读）→ goTo */
  onGoTo: (sceneId: string) => void
  /* 动作镜像条（沿用 v5 spec §3.3） */
  canBack?: boolean
  onBack?: () => void
  nextLabel?: string
  onNext?: () => void
  onExit?: () => void
}

function nodeClass(n: RoadmapNode, currentId: string, visitedSet: ReadonlySet<string>): string {
  const cls = ['roadmap-node']
  if (n.kind === 'portal') cls.push('roadmap-node--portal')
  if (n.kind === 'more') cls.push('roadmap-node--more')
  if (n.kind === 'scene') {
    if (n.id === currentId) cls.push('roadmap-node--current')
    else if (visitedSet.has(n.id)) cls.push('roadmap-node--visited')
    else cls.push('roadmap-node--unvisited')
  }
  return cls.join(' ')
}

function nodeGlyph(n: RoadmapNode, currentId: string, visitedSet: ReadonlySet<string>): string {
  if (n.kind === 'portal') return '⬈'
  if (n.kind === 'more') return '+'
  if (n.id === currentId) return '●'
  return visitedSet.has(n.id) ? '◉' : '○'
}

/**
 * 探索路线图弹层（v6，取代 v4 视觉小说式 HistoryPanel）。
 *
 * - 主体 = 整篇 explore.yaml 的有向图：实线树边（SVG）+ 场景节点（button，任意节点可点直达）
 *   + portal 节点（<a> 整页跳外站文章）+ ↩ 回边标记（title 浮出目标）。
 * - 三态：● 当前（accent 脉冲）/ ◉ 已读 / ○ 未读（暗色虚线）。
 * - 节点数 > ROADMAP_FOCUS_THRESHOLD 默认聚焦模式（applyFocus），头部「查看全图/聚焦当前」切换；
 *   聚焦图的 +N 未探索 节点点击即展开全图。
 * - 动作镜像条（◀ 返回 / ⏵ 继续 / ✕ 退出）保留——键盘流用户的导航入口。
 * - 无障碍：role=dialog + aria-label；当前节点 aria-current；节点全是原生 button/a。
 */
export default function RoadmapPanel({
  open, onClose, layout, currentId, visited, onGoTo,
  canBack, onBack, nextLabel, onNext, onExit,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const focusable = layout.nodes.length > ROADMAP_FOCUS_THRESHOLD
  const view = useMemo(
    () => (focusable && !expanded ? applyFocus(layout, currentId, visited) : layout),
    [focusable, expanded, layout, currentId, visited],
  )
  const visitedSet = useMemo(() => new Set(visited), [visited])
  const nodeById = useMemo(() => new Map(view.nodes.map((n) => [n.id, n])), [view])

  if (!open) return null

  const hasPortal = view.nodes.some((n) => n.kind === 'portal')
  const hasBack = view.nodes.some((n) => n.backLabels.length > 0)

  const renderInner = (n: RoadmapNode) => (
    <>
      <span className="roadmap-node__glyph" aria-hidden="true">
        {nodeGlyph(n, currentId, visitedSet)}
      </span>
      <span className="roadmap-node__label">{n.label}</span>
      {n.backLabels.length > 0 && (
        <span className="roadmap-node__back" title={`回到：${n.backLabels.join('、')}`}>
          ↩
        </span>
      )}
    </>
  )

  return (
    <div className="roadmap-panel" role="dialog" aria-label="探索路线图">
      <div className="roadmap-panel__backdrop" onClick={onClose} />
      <div className="roadmap-panel__body">
        <header className="roadmap-panel__header">
          <span className="roadmap-panel__title">─ 探索路线图 ─</span>
          {focusable && (
            <button
              type="button"
              className="roadmap-panel__toggle"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? '聚焦当前' : '查看全图'}
            </button>
          )}
          <button
            type="button"
            aria-label="关闭"
            className="roadmap-panel__close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="roadmap-panel__actions">
          <button type="button" disabled={!canBack} onClick={onBack}>◀ 返回</button>
          <button type="button" onClick={onNext}>{nextLabel}</button>
          <button type="button" onClick={onExit}>✕ 退出</button>
        </div>
        <div className="roadmap-panel__canvas">
          <div className="roadmap-stage" style={{ width: view.width, height: view.height }}>
            <svg
              className="roadmap-edges"
              width={view.width}
              height={view.height}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="roadmap-arrow"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0 L8 4 L0 8 z" />
                </marker>
              </defs>
              {view.edges.map((e) => {
                const a = nodeById.get(e.from)
                const b = nodeById.get(e.to)
                if (!a || !b) return null
                return (
                  <line
                    key={`${e.from}->${e.to}`}
                    className={b.kind === 'portal' ? 'roadmap-edge--portal' : undefined}
                    x1={a.x + ROADMAP_NODE_W}
                    y1={a.y + ROADMAP_NODE_H / 2}
                    x2={b.x}
                    y2={b.y + ROADMAP_NODE_H / 2}
                    markerEnd="url(#roadmap-arrow)"
                  />
                )
              })}
            </svg>
            {view.nodes.map((n) => {
              const style = { left: n.x, top: n.y }
              const className = nodeClass(n, currentId, visitedSet)
              if (n.kind === 'portal') {
                return (
                  <a key={n.id} data-node-id={n.id} className={className} style={style} href={n.href}>
                    {renderInner(n)}
                  </a>
                )
              }
              if (n.kind === 'more') {
                return (
                  <button
                    key={n.id}
                    data-node-id={n.id}
                    type="button"
                    className={className}
                    style={style}
                    onClick={() => setExpanded(true)}
                  >
                    {renderInner(n)}
                  </button>
                )
              }
              return (
                <button
                  key={n.id}
                  data-node-id={n.id}
                  type="button"
                  className={className}
                  style={style}
                  aria-current={n.id === currentId ? 'true' : undefined}
                  onClick={() => onGoTo(n.id)}
                >
                  {renderInner(n)}
                </button>
              )
            })}
          </div>
        </div>
        <footer className="roadmap-panel__legend">
          <span>● 当前</span>
          <span>◉ 已读</span>
          <span>○ 未读</span>
          {hasPortal && <span>⬈ 其他文章</span>}
          {hasBack && <span>↩ 可回跳</span>}
        </footer>
      </div>
    </div>
  )
}
