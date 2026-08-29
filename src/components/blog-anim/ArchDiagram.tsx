import { useEffect, useRef } from 'react'

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
}
export interface ArchBound { x: number; y: number; w: number; h: number; label: string }

interface Props {
  nodes: ArchNode[]
  edges: ArchEdge[]
  bounds?: ArchBound[]
  caption?: string
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
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function ArchDiagram({ nodes, edges, bounds = [], caption }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const played = useRef(false)
  const W = Math.max(...nodes.map((n) => n.x + n.w)) + 60
  const H = Math.max(...nodes.map((n) => n.y + n.h)) + 60

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ns = Array.from(svg.querySelectorAll<SVGGElement>('.ag-node'))
    const es = Array.from(svg.querySelectorAll<SVGPathElement>('.ag-edge'))
    const boundsEls = Array.from(svg.querySelectorAll<SVGElement>('.ag-bound, .ag-bound-label'))
    const labs = Array.from(svg.querySelectorAll<SVGElement>('.ag-lab-bg, .ag-lab-tx'))
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
      played.current = true
    }
    play()
    wrap.addEventListener('click', play)
    return () => wrap.removeEventListener('click', play)
  }, [])

  return (
    <figure className="ba-arch" ref={wrapRef}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption || '架构示意'}>
        {/* 1) 容器 bounds */}
        {bounds.map((b) => (
          <g key={b.label + b.x}>
            <rect className="ag-bound" x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
              fill="rgba(14,110,92,.045)" stroke="rgba(28,43,40,.3)" strokeWidth={1} strokeDasharray="6 4" />
            <text className="ag-bound-label" x={b.x + 12} y={b.y + 20} fontSize={10} letterSpacing={3}
              fill="#93A39C" fontFamily="var(--fang),serif">{b.label}</text>
          </g>
        ))}
        {/* 2) 边线（锚点都在节点边框上，所以 path 实际只存在于两节点间隙中，节点不会遮 path） */}
        {edges.map((e) => {
          const color = e.emph ? '#0E6E5C' : '#55665F'
          return (
            <path key={`l-${e.id}`} className="ag-edge" data-edge={e.id} d={edgePath(nodes, e)}
              fill="none" stroke={color} strokeWidth={e.emph ? 1.8 : 1.4}
              strokeDasharray={e.dash ? '5 4' : undefined}
              markerEnd={e.emph ? 'url(#arE)' : 'url(#ar)'} />
          )
        })}
        {/* 3) 节点（在边之上：节点白底自然遮挡穿过间隙的边线，不挡边线全段） */}
        {nodes.map((n) => {
          const key = n.kind === 'key'
          return (
            <g key={n.id} className="ag-node" data-node={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={2} fill="#FFFFFF"
                stroke={key ? '#0E6E5C' : '#1C2B28'} strokeWidth={key ? 1.8 : 1.2} />
              <path d={n.sigil} transform={`translate(${n.x + 8} ${n.y + 7}) scale(0.85)`} fill="none"
                stroke="#0E6E5C" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
              <text x={n.x + n.w / 2} y={n.y + 26} textAnchor="middle" fontSize={11.5} fontWeight={600}
                fill="#1C2B28" fontFamily="var(--sans),sans-serif">{esc(n.label)}</text>
              <text x={n.x + n.w / 2} y={n.y + 44} textAnchor="middle" fontSize={9.5} fill="#93A39C"
                fontFamily="var(--mono),monospace" letterSpacing={0.5}>{esc(n.sub)}</text>
            </g>
          )
        })}
        {/* 4) 边 label（最上层：当 label 比节点间隙宽时，白底贴在节点边缘，
              形成"标签贴纸"效果，文字不会被节点白底截断） */}
        {edges.map((e) => {
          const a = anchor(nodeById(nodes, e.from)!, e.fromSide)
          const b = anchor(nodeById(nodes, e.to)!, e.toSide)
          let lx = 0, ly = 0
          if (e.via) { lx = (a.x + e.via[0].x) / 2; ly = (a.y + e.via[0].y) / 2 }
          else if (e.fromSide === 'top' || e.fromSide === 'bottom') { lx = a.x + 34; ly = (a.y + b.y) / 2 }
          else { lx = (a.x + b.x) / 2; ly = a.y }
          const wpx = (e.label?.length || 0) * 6.4 + 14
          if (!e.label) return null
          return (
            <g key={`lab-${e.id}`}>
              <rect className="ag-lab-bg" x={lx - wpx / 2} y={ly - 8} width={wpx} height={16} rx={3} fill="#F6F7F4" />
              <text className="ag-lab-tx" x={lx} y={ly + 3.5} textAnchor="middle" fontSize={9.5}
                fill={e.emph ? '#0E6E5C' : '#55665F'} fontFamily="var(--mono),monospace">{e.label}</text>
            </g>
          )
        })}
        <defs>
          <marker id="ar" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#55665F" />
          </marker>
          <marker id="arE" markerWidth={9} markerHeight={7} refX={8} refY={3.5} orient="auto">
            <path d="M0,0 L9,3.5 L0,7 z" fill="#0E6E5C" />
          </marker>
        </defs>
      </svg>
      {caption && <figcaption className="ba-arch-caption">{caption}</figcaption>}
    </figure>
  )
}

export default ArchDiagram
