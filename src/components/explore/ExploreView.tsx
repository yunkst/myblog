import { useState } from 'react'
import type { ExploreNode } from '../../lib/types'
import type { Scene, SceneHandle } from './SceneController'
import SceneStage from './SceneStage'
import QuestionTree from './QuestionTree'
import { useAnswerContext } from './AnswerProvider'

interface Props {
  nodes: ExploreNode[]
  scene: Scene | null
  seekRoot?: string
  initialHash: string | null
  slug: string
}

export default function ExploreView({ nodes, scene, seekRoot, initialHash, slug }: Props) {
  const [handle, setHandle] = useState<SceneHandle | null>(null)
  const answerCtx = useAnswerContext()

  // 把 AnswerMap 提供给 DetailForActiveId。
  // 不用 useMemo 缓存：Answer 子组件在 effect 里才 register（首渲染后），
  // 而 SceneStage 的 onReady→setHandle 触发的第二次渲染发生在 Answer 注册之后
  // （兄弟节点 effect 顺序：ExploreView 子树先于 .explore-answers 子树），
  // 所以在渲染期间直接取 snapshot 拿到的就是已注册完整内容；useMemo 的 deps
  // （answerCtx/nodes）都不会变，缓存住反而会把空 Map 永久固化。
  const answerMap = answerCtx ? answerCtx.snapshot() : {}

  return (
    <div className="explore-grid" data-slug={slug}>
      <section className="explore-stage">
        {scene ? (
          <SceneStage scene={scene} seekTo={seekRoot} onReady={setHandle}>
            {() => null}
          </SceneStage>
        ) : (
          <div className="explore-no-anim">这篇文章没有动画舞台，只有问题树。</div>
        )}
      </section>
      <aside className="explore-tree">
        <QuestionTree
          nodes={nodes}
          handle={handle}
          initialId={initialHash}
        />
        {/* Detail panel —— ExploreView 自己的 DetailForActiveId。
            QuestionTree 内部 DetailPanel 是占位，两份并存是预期（控制器裁决 6）。 */}
        {handle && initialHash && (
          <DetailForActiveId nodes={nodes} activeId={initialHash} answerMap={answerMap} />
        )}
      </aside>
    </div>
  )
}

function DetailForActiveId({
  nodes,
  activeId,
  answerMap,
}: {
  nodes: ExploreNode[]
  activeId: string
  answerMap: Record<string, string>
}) {
  const found = findNode(nodes, activeId)
  if (!found) return null

  return (
    <div className="explore-detail" data-detail-for={activeId}>
      <h3>{found.label}</h3>
      {found.status === 'placeholder' && found.detail && <p>{found.detail}</p>}
      {found.kind === 'cross-link' && found.preview && <p>{found.preview}</p>}
      {!found.status && found.kind !== 'cross-link' && answerMap[found.id] && (
        // dangerouslySetInnerHTML：AnswerHtml 来自作者本人编写的 MDX，可信；XSS 风险可接受。
        // 如果未来 MDX 来源被撑开（评论、用户投稿），需重新评估（见 lib/explore.ts 顶部注释）。
        <div
          className="explore-detail-body"
          dangerouslySetInnerHTML={{ __html: answerMap[found.id] }}
        />
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
