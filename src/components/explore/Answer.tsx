import { useContext, useRef, type ReactNode } from 'react'
import SceneClip from './SceneClip'
import ExitChips from './ExitChips'
import { toChineseOrdinal } from '../../lib/explore'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'
import { Director } from './Director'

/** 重新导出供测试/外部消费者沿用旧路径 import Answer, { ExploreConfigContext }。 */
export { ExploreConfigContext }

/**
 * exploreConfig 经 Context 注入（Post.tsx 提供，Answer 消费）——MDX 端只写
 * `<Answer id="...">`，chips 由 Answer 依据 yaml scenes[].id === props.id 自动渲染，
 * 文案只在 yaml 一处（spec §1 三铁律「内容只写一遍」）。
 *
 * v3 分区（spec §2.2）：children → heading(first-found) / SceneClip / 其余
 */
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
 *
 * v4 演出层（spec §4，Task 5）：
 * - 渲染结构完全不动；`.theater` 追加 `data-scene-id={id}`，激活态由
 *   ExploreRuntimeContext.activeId 决定（`data-active` 仅激活幕有）。
 * - v3 的 IntersectionObserver 演出 useEffect 整体退役——演出统一归 Director：
 *   仅「激活且首次看过」（firstActivation，seenScenes 判定）时包一层 `<Director>`，
 *   headRef/dialogueRef/choicesRef/stageRef 交给它编排 mode 1/2/3；
 *   未激活或回看（已 seen）直接渲染静态结构（SSG 直出 / 无 JS 降级同构）。
 * - skip 回传：Director.onReady → runtime.onActivate → ExploreRouter.skipRef
 *   （点击空白跳过用）。
 */
export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  const config = useContext(ExploreConfigContext)
  const runtime = useContext(ExploreRuntimeContext)
  const scene = config?.scenes.find((s) => s.id === id)
  const idx = config?.scenes.findIndex((s) => s.id === id) ?? -1
  const { heading, clips, rest } = partition(children)
  const hasExits = !!scene && (!!scene.features?.length || !!scene.questions?.length)
  const hasHead = !!(heading || idx >= 0)

  /* 演出层 ref（交给 Director 编排） */
  const headRef = useRef<HTMLDivElement>(null)
  const dialogueRef = useRef<HTMLDivElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const active = runtime?.activeId === id
  /* 演出条件：有路由上下文 + 本幕激活 + 首次看过（spec §3.3 seenScenes：回看不重播） */
  const perform = !!runtime && active && runtime.firstActivation

  const body = (
    <>
      {hasHead && (
        <div className="act-head" ref={headRef}>
          {idx >= 0 && <span className="act-no">第{toChineseOrdinal(idx + 1)}幕</span>}
          {heading}
          <div className="act-rule" />
        </div>
      )}
      {clips.length > 0 && (
        <div className="stage" ref={stageRef}>
          <span className="stage-tag">DEMO · {scene?.demo ?? '—'}</span>
          <span className="stage-ch">CH-{String(idx + 1).padStart(2, '0')}</span>
          <div className="stage-spot" />
          <div className="stage-inner">{clips}</div>
        </div>
      )}
      <div className="dialogue" ref={dialogueRef}>
        <span className="dlg-name">解 说</span>
        {rest}
      </div>
      {hasExits && scene && config && (
        <div className="choices" ref={choicesRef}>
          <span className="choices-label">─ 選択肢 ─</span>
          <ExitChips group="features" exits={scene.features ?? []} config={config} />
          <ExitChips group="questions" exits={scene.questions ?? []} config={config} />
        </div>
      )}
    </>
  )

  return (
    <section
      className="theater answer-block"
      id={id}
      data-scene-id={id}
      data-active={active ? '' : undefined}
    >
      {perform ? (
        <Director
          scene={{ id, mode: scene?.mode ?? 2, demo: scene?.demo ?? '' }}
          headRef={headRef}
          dlgRef={dialogueRef}
          choicesRef={choicesRef}
          stageRef={clips.length > 0 ? stageRef : undefined}
          onReady={(api) => runtime.onActivate(id, api.skip)}
        >
          {body}
        </Director>
      ) : (
        body
      )}
    </section>
  )
}
