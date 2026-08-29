import { useState, useEffect } from 'react'
import type { ExploreNode } from '../../lib/types'
import type { SceneHandle } from './SceneController'
import QuestionNode from './QuestionNode'

interface Props {
  nodes: ExploreNode[]
  handle: SceneHandle | null
  /** 进入页面默认激活的 id（来自 #hash） */
  initialId?: string | null
}

export default function QuestionTree({ nodes, handle, initialId }: Props) {
  const [activeId, setActiveId] = useState<string | null>(initialId || null)

  // hash 变化时同步激活
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.replace(/^#/, '')
      if (h) setActiveId(h)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // 移动端：点击节点后滚到舞台
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 920 && activeId) {
      const el = document.querySelector('.scene-stage')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeId])

  function onActivate(id: string, node: ExploreNode) {
    setActiveId(id)
    if (handle) {
      if (node.seek) handle.seek(node.seek)
      handle.focus(node.focus || [])    // 节点的 focus 字段（YAML 里加，见 Step 5 加 schema）
    }
  }

  // detail 面板：placeholder 放 detail，正文 Answer 内容取自 AnswerProvider
  return (
    <aside className="qtree" aria-label="问题树">
      <ul className="qtree-root">
        {nodes.map((n) => (
          <TreeBranch key={n.id} node={n} activeId={activeId} onActivate={onActivate} />
        ))}
      </ul>
      <DetailPanel activeId={activeId} rootNodes={nodes} />
    </aside>
  )
}

interface BranchProps {
  node: ExploreNode
  activeId: string | null
  onActivate: (id: string, node: ExploreNode) => void
}

function TreeBranch({ node, activeId, onActivate }: BranchProps) {
  return (
    <>
      <QuestionNode node={node} activeId={activeId} onActivate={onActivate} />
      {node.children && node.children.length > 0 && (
        <ul className="qtree-children">
          {node.children.map((c) => (
            <TreeBranch key={c.id} node={c} activeId={activeId} onActivate={onActivate} />
          ))}
        </ul>
      )}
    </>
  )
}

function DetailPanel({ activeId, rootNodes }: { activeId: string | null; rootNodes: ExploreNode[] }) {
  const found = activeId ? findNode(rootNodes, activeId) : null
  if (!found) return null
  return (
    <div className="qtree-detail" data-detail-for={activeId}>
      <h3 className="qtree-detail-title">{found.label}</h3>
      {found.status === 'placeholder' && found.detail && (
        <p className="qtree-detail-body">{found.detail}</p>
      )}
      {found.kind === 'cross-link' && found.preview && (
        <p className="qtree-detail-body">{found.preview}</p>
      )}
      {(!found.status || found.status !== 'placeholder') && found.kind !== 'cross-link' && (
        // 正文 Answer 内容由 SceneStage 内部的 AnswerMap 注入到全局可用（侵入式方案见 Step 5 修正）。
        // 此处占位：本 Task 阶段先打 TODO，下一 Task 让 ExploreView 注入完整内容。
        <p className="qtree-detail-body"><em>答案正文由 explore 视图层注入，本 Task 阶段预留。</em></p>
      )}
    </div>
  )
}

function findNode(nodes: ExploreNode[], id: string): ExploreNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const r = findNode(n.children, id)
      if (r) return r
    }
  }
  return undefined
}
