import { createContext, useContext, type ReactNode } from 'react'
import SceneClip from './SceneClip'
import ExitChips from './ExitChips'
import { toChineseOrdinal } from '../../lib/explore'
import type { ExploreConfig } from '../../lib/types'

/**
 * exploreConfig 经 Context 注入（Post.tsx 提供，Answer 消费）——MDX 端只写
 * `<Answer id="...">`，chips 由 Answer 依据 yaml scenes[].id === props.id 自动渲染，
 * 文案只在 yaml 一处（spec §1 三铁律「内容只写一遍」）。
 */
export const ExploreConfigContext = createContext<ExploreConfig | null>(null)

/** v3 分区（spec §2.2）：children → heading(first-found) / SceneClip / 其余 */
function partition(children: ReactNode) {
  const arr = Array.isArray(children) ? children : [children]
  const clips: ReactNode[] = []
  const rest: ReactNode[] = []
  let heading: ReactNode | null = null
  let headingTaken = false
  for (const child of arr) {
    if (child == null || child === false) continue
    const t = (child as { type?: unknown }).type
    if (t === SceneClip) { clips.push(child); continue }
    if (!headingTaken && typeof t === 'string' && (t === 'h2' || t === 'h3')) {
      heading = child; headingTaken = true; continue
    }
    rest.push(child)
  }
  return { heading, clips, rest }
}

/**
 * v3：theater 五段式渲染（theater / act-head / stage / dialogue / choices）。
 * - `.theater` 同 id 锚点（v2 `.answer-block` 改名）；类名双挂 `answer-block`
 *   保留为过渡别名，让 v2 遗留的 `.answer-block` 查询继续命中。
 * - heading：children 中 **first-found**（遍历遇到的第一个）h2/h3 进 act-head；
 *   后续 heading 留在 dialogue。
 * - SceneClip：children 中所有 `type === SceneClip` 进 stage-inner。
 * - idx ≥ 0 才渲染 act-no（孤儿 Answer 无序号）。
 * - 无 SceneClip → 不渲染 `.stage`；其它区照常。
 */
export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  const config = useContext(ExploreConfigContext)
  const scene = config?.scenes.find((s) => s.id === id)
  const idx = config?.scenes.findIndex((s) => s.id === id) ?? -1
  const { heading, clips, rest } = partition(children)
  const hasExits = !!scene && (!!scene.features?.length || !!scene.questions?.length)

  return (
    <section className="theater answer-block" id={id}>
      {(heading || idx >= 0) && (
        <div className="act-head">
          {idx >= 0 && <span className="act-no">第{toChineseOrdinal(idx + 1)}幕</span>}
          {heading}
          <div className="act-rule" />
        </div>
      )}
      {clips.length > 0 && (
        <div className="stage">
          <span className="stage-tag">DEMO · {scene?.demo ?? '—'}</span>
          <span className="stage-ch">CH-{String(idx + 1).padStart(2, '0')}</span>
          <div className="stage-spot" />
          <div className="stage-inner">{clips}</div>
        </div>
      )}
      <div className="dialogue">
        <span className="dlg-name">解 说</span>
        {rest}
      </div>
      {hasExits && scene && config && (
        <div className="choices">
          <span className="choices-label">─ 選択肢 ─</span>
          <ExitChips group="features" exits={scene.features ?? []} config={config} />
          <ExitChips group="questions" exits={scene.questions ?? []} config={config} />
        </div>
      )}
    </section>
  )
}
