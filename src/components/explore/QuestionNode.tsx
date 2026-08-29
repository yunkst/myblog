import { Link } from 'react-router-dom'
import type { ExploreNode } from '../../lib/types'

interface Props {
  node: ExploreNode
  activeId: string | null
  onActivate: (id: string, node: ExploreNode) => void
}

export default function QuestionNode({ node, activeId, onActivate }: Props) {
  const active = activeId === node.id
  const placeholder = node.status === 'placeholder'
  const cls = `qnode${active ? ' qnode-active' : ''}${placeholder ? ' qnode-placeholder' : ''}`

  if (node.kind === 'cross-link' && node.to) {
    return (
      <li className={cls}>
        <Link
          to={`/blog/${node.to.post}/${node.to.anchor.startsWith('#') ? node.to.anchor : '#' + node.to.anchor}`}
          className="qnode-link"
          data-cross-link={node.id}
        >
          <span className="qnode-label">→ {node.label}</span>
          <span className="qnode-hint">跨文章</span>
        </Link>
      </li>
    )
  }

  return (
    <li className={cls}>
      <button
        type="button"
        className="qnode-btn"
        onClick={() => onActivate(node.id, node)}
        data-question-id={node.id}
        aria-expanded={active}
      >
        <span className="qnode-label">{node.label}</span>
        {placeholder && <span className="qnode-hint">待补</span>}
      </button>
    </li>
  )
}
