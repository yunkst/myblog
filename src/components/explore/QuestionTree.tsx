import { useEffect } from 'react'
import type { ExploreNode } from '../../lib/types'
import type { SceneHandle } from './SceneController'
import QuestionNode from './QuestionNode'

interface Props {
  nodes: ExploreNode[]
  handle: SceneHandle | null
  /** 当前激活节点 id（受控，由 ExploreView 拥有，详见 ExploreView 顶部注释） */
  activeId: string | null
  /** 激活变化回调：点节点时上报，便于 ExploreView 同步 detail/hash */
  onActivate: (id: string, node: ExploreNode) => void
}

/**
 * 任务 7 review 后由 final-review 整段重构（M2/M3 fix）：
 * - 删掉内部的 DetailPanel（含"本 Task 阶段预留"占位文字）—— detail 职责完全归
 *   ExploreView 的 DetailForActiveId。原先两份 detail 并存且普通节点只显示占位，
 *   直接违背 spec §4.1"答案面板从正文 <Answer> 抽出"的核心承诺。
 * - activeId 状态从内部 state 提升为受控 prop，初始化 + hashchange 监听
 *   都在 ExploreView（useEffect 内读 window.location.hash，SSG 期无 window，
 *   故 hydration 后再同步）。
 */
export default function QuestionTree({ nodes, handle, activeId, onActivate }: Props) {
  // 移动端：点击节点后滚到舞台
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 920 && activeId) {
      const el = document.querySelector('.scene-stage')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeId])

  function activate(id: string, node: ExploreNode) {
    onActivate(id, node)
    if (handle) {
      if (node.seek) handle.seek(node.seek)
      handle.focus(node.focus || [])
    }
  }

  return (
    <aside className="qtree" aria-label="问题树">
      <ul className="qtree-root">
        {nodes.map((n) => (
          <TreeBranch key={n.id} node={n} activeId={activeId} onActivate={activate} />
        ))}
      </ul>
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
