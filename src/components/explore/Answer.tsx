import { useContext, useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import SceneClip from './SceneClip'
import ExitChips from './ExitChips'
import { toChineseOrdinal } from '../../lib/explore'
import { buildTypewriterTimeline } from './useTypewriter'
import { ExploreConfigContext } from './AnswerContext'

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
 * 演出层（spec §4 / Task 5）：
 * - act-head / choices：IO 进入后 GSAP fromTo（SSG 直出可见 → hydration 后演出时 from 隐藏 → to 显现）；
 *   threshold 0.5，进入即 disconnect，不重播。
 * - dialogue：IO 进入（threshold 0.4）后对每段 `buildTypewriterTimeline` 链式触发：
 *   前一段 onComplete → 下一段 play。reduced-motion 直出原文。
 * - 浏览器 only（jsdom 无 IO/matchMedia → 直接 return）。
 */
export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  const config = useContext(ExploreConfigContext)
  const scene = config?.scenes.find((s) => s.id === id)
  const idx = config?.scenes.findIndex((s) => s.id === id) ?? -1
  const { heading, clips, rest } = partition(children)
  const hasExits = !!scene && (!!scene.features?.length || !!scene.questions?.length)
  const hasHead = !!(heading || idx >= 0)

  /* 演出层 ref */
  const headRef = useRef<HTMLDivElement>(null)
  const dialogueRef = useRef<HTMLDivElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /* jsdom 无 IntersectionObserver；reduced-motion 也不演出 */
    if (typeof IntersectionObserver === 'undefined') return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const tls: gsap.core.Timeline[] = []

    /* act-head fade：threshold 0.5，duration 0.4 */
    const headEl = headRef.current
    if (headEl) {
      const ioHead = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ioHead.disconnect()
          const tl = gsap.timeline()
          tl.fromTo(headEl, { opacity: 0 }, { opacity: 1, duration: 0.4 })
          tls.push(tl)
        }
      }, { threshold: 0.5 })
      ioHead.observe(headEl)
    }

    /* choices 浮现：threshold 0.5，stagger 0.18，duration 0.4，y 8→0 */
    const choicesEl = choicesRef.current
    if (choicesEl) {
      const ioChoices = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ioChoices.disconnect()
          const chips = choicesEl.querySelectorAll('.exit-chip')
          if (chips.length === 0) return
          const tl = gsap.timeline()
          tl.fromTo(chips,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.18, ease: 'power2.out' })
          tls.push(tl)
        }
      }, { threshold: 0.5 })
      ioChoices.observe(choicesEl)
    }

    /* dialogue 打字机链式：threshold 0.4；段落选择器 :scope > p, :scope > blockquote
     * 前一段 onComplete → 下一段 play；打字启动时 buildTypewriterTimeline 内部才清空 innerHTML（SSG 安全）。
     * charMs 单位是毫秒（库内部换算成 GSAP 的秒语义），默认 28ms/字。
     * 空段或 reduced-motion → buildTypewriterTimeline 返回 null，立即接力下一段。 */
    const dlg = dialogueRef.current
    if (dlg) {
      const paras = Array.from(dlg.querySelectorAll<HTMLElement>(':scope > p, :scope > blockquote'))
      if (paras.length > 0) {
        const ioDlg = new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            ioDlg.disconnect()
            const chainPara = (i: number) => {
              if (i >= paras.length) return
              const tl = buildTypewriterTimeline(paras[i])
              if (!tl) { chainPara(i + 1); return }
              tls.push(tl)
              if (i + 1 < paras.length) {
                tl.eventCallback('onComplete', () => chainPara(i + 1))
              }
              tl.play(0)
            }
            chainPara(0)
          }
        }, { threshold: 0.4 })
        ioDlg.observe(dlg)
      }
    }

    return () => {
      /* cleanup：所有 timeline kill */
      for (const tl of tls) tl.kill()
    }
  }, [])

  return (
    <section className="theater answer-block" id={id}>
      {hasHead && (
        <div className="act-head" ref={headRef}>
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
    </section>
  )
}
