import { useEffect, useState } from 'react'
import type { ExploreNode } from '../../lib/types'
import type { Scene, SceneHandle } from './SceneController'
import SceneStage from './SceneStage'
import QuestionTree from './QuestionTree'
import { useAnswerContext } from './AnswerProvider'

interface Props {
  nodes: ExploreNode[]
  scene: Scene | null
  seekRoot?: string
  slug: string
}

/**
 * 激活节点状态（activeId）放在本组件——而非 QuestionTree 内部——是 M2/M3 修复的一部分：
 * - detail 面板（DetailForActiveId）需要跟随激活节点（含 hashchange），
 *   若 activeId 在 QuestionTree 内部，detail 只能用 freeze 的 initialHash，点击/hash 变化都不联动。
 * - hash 初值在 useEffect 里读（客户端 only）：SSG 阶段没有 window，渲染期直接取会拿到 null，
 *   hydration 后再同步才能让 #<node-id> 落地生效。
 */
function readHashId(): string | null {
  if (typeof window === 'undefined') return null
  return window.location.hash.replace(/^#/, '') || null
}

export default function ExploreView({ nodes, scene, seekRoot, slug }: Props) {
  const [handle, setHandle] = useState<SceneHandle | null>(null)
  const [activeId, setActiveId] = useState<string | null>(readHashId)
  const answerCtx = useAnswerContext()

  // hydration 后同步一次 hash（SSG 首帧无 window；Explore.tsx 传入的 initialHash 也是 null）
  useEffect(() => {
    setActiveId(readHashId())
  }, [])

  // hashchange 时同步激活节点（浏览器返回 / QuestionAnchor 跳转带 hash 落地）
  useEffect(() => {
    const sync = () => setActiveId(readHashId())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // 把 AnswerMap 提供给 DetailForActiveId。
  // 不用 useMemo 缓存：Answer 子组件在 effect 里才 register（首渲染后），
  // 而 SceneStage 的 onReady→setHandle 触发的第二次渲染发生在 Answer 注册之后
  // （兄弟节点 effect 顺序：ExploreView 子树先于 .explore-answers 子树），
  // 所以在渲染期间直接取 snapshot 拿到的就是已注册完整内容；useMemo 的 deps
  // （answerCtx/nodes）都不会变，缓存住反而会把空 Map 永久固化。
  const answerMap = answerCtx ? answerCtx.snapshot() : {}

  // 详情面板渲染条件：激活节点存在且不是 cross-link（cross-link 的"详情"就是目标文章本身，点击即跳转）
  const activeNode = activeId ? findNode(nodes, activeId) : null
  const showDetail = Boolean(handle && activeNode && activeNode.kind !== 'cross-link')

  return (
    <div className="explore-grid" data-slug={slug}>
      <section className="explore-stage">
        {scene ? (
          <SceneStage scene={scene} seekTo={seekRoot} onReady={setHandle}>
            {() => (scene.Stage ? <scene.Stage /> : null)}
          </SceneStage>
        ) : (
          <div className="explore-no-anim">这篇文章没有动画舞台，只有问题树。</div>
        )}
      </section>
      <aside className="explore-tree">
        <QuestionTree
          nodes={nodes}
          handle={handle}
          activeId={activeId}
          onActivate={setActiveId}
        />
        {showDetail && activeId && (
          <DetailForActiveId nodes={nodes} activeId={activeId} answerMap={answerMap} />
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
