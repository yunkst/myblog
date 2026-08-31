import { Fragment, useContext, useRef, type ReactNode } from 'react'
import SceneClip from './SceneClip'
import ExitChips from './ExitChips'
import { toChineseOrdinal } from '../../lib/explore'
import { ExploreConfigContext, ExploreRuntimeContext, SceneDemoContext } from './AnswerContext'
import { Director } from './Director'
import type { ExploreScene } from '../../lib/types'

/** 重新导出供测试/外部消费者沿用旧路径 import Answer, { ExploreConfigContext }。 */
export { ExploreConfigContext }

/**
 * exploreConfig 经 Context 注入（Post.tsx 提供，Answer 消费）——MDX 端只写
 * `<Answer id="...">`，chips 由 Answer 依据 yaml scenes[].id === props.id 自动渲染，
 * 文案只在 yaml 一处（spec §1 三铁律「内容只写一遍」）。
 *
 * v3 分区（spec §2.2）：children → heading(first-found) / SceneClip / 其余
 */
/**
 * v5（spec §7.4）partition：body 元素树 → heading(first-found) / SceneClip / 其余。
 *
 * v3 的 partition 只看顶层 children（MDX 手写场景里 <Answer> 的直接子元素就是
 * h2/SceneClip/p 等混排）。v5 SceneRoute 传 `body={<Scene />}`——**函数组件或
 * Fragment 包裹**，顶层 type 不是 h2/SceneClip。所以需要浅递归展开：
 * - 顶层函数组件（typeof type === 'function'，仅 depth 0）→ 调用它拿到内部
 *   元素树再分类（场景文件都是 `export default function X() { return <>...</> }`
 *   形态，无 hooks——直调安全）。**只展开这一层**：更深的函数组件
 *   （如 ArchDiagram，内部 useRef/useEffect）保持为元素原样进 rest，交由 React
 *   正常挂 fiber 渲染——直调会把它们的 hook 挂到 Answer 的 hook 槽位上（寄生）。
 * - Fragment（type === Fragment）→ 任意深度都递归它的 children（Fragment 无 hooks，
 *   直调无副作用；嵌在展开后的场景组件里也照穿）。
 * - DOM 元素（typeof type === 'string'）按 v3 规则分类。
 *
 * 不处理类组件 / memo / lazy —— v5 场景文件形态统一（T6 产物），无需覆盖。
 */
function partition(children: ReactNode) {
  const clips: ReactNode[] = []
  const rest: ReactNode[] = []
  let heading: ReactNode | null = null
  let headingTaken = false

  /* top：还在 depth 0（body 的直接子层 + 顶层 Fragment 穿透）——只有这一层允许展开函数组件 */
  const walk = (nodes: ReactNode, top: boolean) => {
    const arr = Array.isArray(nodes) ? nodes : [nodes]
    for (const child of arr) {
      if (child == null || child === false || child === true) continue
      const el = child as { type?: unknown; props?: { children?: ReactNode } }
      const t = el.type
      if (t === SceneClip) { clips.push(child); continue }
      if (t === Fragment) { walk(el.props?.children, top); continue }
      if (top && typeof t === 'function') {
        /* 仅顶层函数组件（场景包裹层，无 hooks）：直调展开 */
        const Comp = t as (props: unknown) => ReactNode
        walk(Comp(el.props), false)
        continue
      }
      if (!headingTaken && typeof t === 'string' && (t === 'h2' || t === 'h3')) {
        heading = child; headingTaken = true; continue
      }
      rest.push(child)
    }
  }
  walk(children, true)

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
 * v7 布局显式化（三原则 1）：单列/双列的布局决策从 CSS `:has(> .stage)` 探测
 * 收敛为 Answer 显式声明的 modifier class——`theater--dual`（有 .stage，双列
 * grid）/ `theater--solo`（无 .stage，单列）。CSS 侧不再用 :has() 反推 DOM。
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
 *
 * mode 1 全屏由 Director 手工编排（demo clip 临时 fixed + body 级覆盖层，
 * 见 Director.tsx），Answer 不持有任何全屏 state——旧的 data-fullscreen
 * 属性路径已退役（实现从未走通，属死代码，2026-08-31 移除）。
 */
/** v5（spec §7.4）props 改造：
 * - 旧：{ id, children }（MDX 端手写 <Answer id="..."> children）。
 * - 新：{ scene, body }——SceneRoute 从 glob 命中场景组件后，把 yaml scene 对象 +
 *   <Scene/> 元素树交给 Answer。partition(body) 逻辑不变（body 元素树里
 *   child.type === SceneClip 判定——同模块实例直接 import 命中）。
 * - heading 兜底：body 无 h2/h3 时用 <h2>{scene.label}</h2>（yaml 单一真相）。
 * - Director 演出层（mode 判定/演出条件/skip 回传）与 v4 完全一致，未动。
 */
export default function Answer({ scene, body }: { scene: ExploreScene; body: ReactNode }) {
  const config = useContext(ExploreConfigContext)
  const runtime = useContext(ExploreRuntimeContext)
  const id = scene.id
  const idx = config?.scenes.findIndex((s) => s.id === id) ?? -1
  const { heading, clips, rest } = partition(body)
  const hasExits = !!config && (!!scene.features?.length || !!scene.questions?.length)
  const headTitle = heading ?? <h2>{scene.label}</h2>
  const hasHead = !!(headTitle || idx >= 0)

  /* 演出层 ref（交给 Director 编排） */
  const headRef = useRef<HTMLDivElement>(null)
  const dialogueRef = useRef<HTMLDivElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const active = runtime?.activeId === id
  /* 演出条件：有路由上下文 + 本幕激活 + 首次看过（spec §3.3 seenScenes：回看不重播） */
  const perform = !!runtime && active && runtime.firstActivation

  /* v7 布局显式化（三原则 1）：布局由组件声明、CSS 不再 :has() 探测 DOM。
   * clips.length > 0 时下方恰好渲染一个 .stage 子元素 → theater--dual 双列；
   * 否则无 .stage → theater--solo 单列。 */
  const dual = clips.length > 0

  const sections = (
    /* SceneDemoContext：注入本幕 scene.demo（yaml 单一真相）——幕内 SceneClip
     * 消费它，q-*.tsx 不再写死 demo 名（v6 review 单源收敛）。 */
    <SceneDemoContext.Provider value={scene.demo ?? null}>
      {hasHead && (
        <div className="act-head" ref={headRef}>
          {idx >= 0 && <span className="act-no">第{toChineseOrdinal(idx + 1)}幕</span>}
          {headTitle}
          <div className="act-rule" />
        </div>
      )}
      {clips.length > 0 && (
        <div className="stage" ref={stageRef}>
          <span className="stage-tag">DEMO · {scene.demo ?? '—'}</span>
          <span className="stage-ch">CH-{String(idx + 1).padStart(2, '0')}</span>
          <div className="stage-spot" />
          <div className="stage-inner">{clips}</div>
        </div>
      )}
      <div className="dialogue" ref={dialogueRef}>
        <span className="dlg-name">解 说</span>
        {rest}
      </div>
      {hasExits && config && (
        <div className="choices" ref={choicesRef}>
          <span className="choices-label">─ 選択肢 ─</span>
          {/* v5 Task 3：baseIdx 与 runtime.focusedExitIdx 平铺序对齐——features 0 起，questions 接 features 长度 */}
          <ExitChips group="features" baseIdx={0} exits={scene.features ?? []} config={config} />
          <ExitChips group="questions" baseIdx={(scene.features ?? []).length} exits={scene.questions ?? []} config={config} />
        </div>
      )}
    </SceneDemoContext.Provider>
  )

  return (
    <section
      /* v7 布局显式化：dual ⇔ 有 .stage 子元素——与原 `:has(> .stage)` 判定严格等价 */
      className={`theater answer-block ${dual ? 'theater--dual' : 'theater--solo'}`}
      id={id}
      data-scene-id={id}
      data-active={active ? '' : undefined}
    >
      {perform ? (
        <Director
          scene={{ id, mode: scene.mode ?? 2, demo: scene.demo ?? '' }}
          headRef={headRef}
          dlgRef={dialogueRef}
          choicesRef={choicesRef}
          stageRef={clips.length > 0 ? stageRef : undefined}
          onReady={(api) => runtime.onActivate(id, api.skip)}
        >
          {sections}
        </Director>
      ) : (
        sections
      )}
    </section>
  )
}
