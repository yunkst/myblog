import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import gsap from 'gsap'
import { buildTypewriterTimeline } from './useTypewriter'
import { getSceneClipApi } from './sceneClipRegistry'

/** Director 消费的幕契约（plan §Task 4 Interfaces）。 */
export interface DirectorScene {
  id: string
  mode: 1 | 2 | 3
  demo: string
}

interface Props {
  scene: DirectorScene
  /** act-head / dialogue / choices refs（由 Answer 注入，Task 5 接线） */
  headRef: RefObject<HTMLElement | null>
  dlgRef: RefObject<HTMLElement | null>
  choicesRef: RefObject<HTMLElement | null>
  /** 全屏 mode 1 用的舞台 ref（Answer 的 .stage 容器） */
  stageRef?: RefObject<HTMLElement | null>
  children: ReactNode
  /** 挂载时调一次：把 skip API 交给父（ExploreRouter 存进 skipRef） */
  onReady?: (api: { skip(): void }) => void
}

/** mode 1 全屏 class（CSS 由 Task 6 写） */
const FULLSCREEN_CLASS = 'stage--fullscreen'

/** 同 Answer/useTypewriter：含媒体子元素的段落整段跳过打字（final review B2 同款） */
const MEDIA_SELECTOR = 'img, svg, figure, table, ul, ol, video, canvas'

/** SceneClip v4 在 demo onComplete 时给容器设 data-finished（SceneClip.tsx:63） */
const FINISHED_SELECTOR = '[data-finished]'

/**
 * v4 Director：mode 1/2/3 演出编排 + 点击 skip。
 *
 * - mode 1：stage 加全屏 class → demo 先（等 data-finished）→ 缩窗 tween
 *   （scale 1.4 → 1，tween 完成后移除全屏 class）→ 文字 → choices
 * - mode 2：act-head fade → dialogue 打字链 → demo → choices（默认）
 * - mode 3：纯文字（refuse 幕等无 demo 场景；.stage 容器由 Answer 决定是否渲染）
 * - skip()：当前进行中的 timeline 全部 progress(1)（触发下一段接力）+ 立即移除全屏 class；
 *   用快照迭代——onComplete 接力新建的 timeline 保持正常速度播放，点击逐段推进。
 * - demo 完成等待：MutationObserver 监听 stage 容器子树里 data-finished 出现
 *   （SceneClip onComplete 时 setAttribute）；15 秒超时兜底（覆盖最长真实 demo 7.3s + 余量）。
 * - onReady 只在挂载/scene 变化时经 ref 调用——父组件传内联箭头也不会导致
 *   每次重渲染都重建演出。
 * - GSAP `.then()`：animation 完成时 resolve（gsap core 自带 Promise），无需包裹。
 * - tls 用 `gsap.core.Animation[]`：fromTo 产出 Tween、打字机产出 Timeline，共同基类。
 */
export function Director({
  scene,
  headRef,
  dlgRef,
  choicesRef,
  stageRef,
  children,
  onReady,
}: Props) {
  const tls = useRef<gsap.core.Animation[]>([])
  // 经 ref 调用，避免 onReady 身份变化触发演出重建
  const onReadyRef = useRef(onReady)
  useEffect(() => { onReadyRef.current = onReady })

  /* useLayoutEffect（非 useEffect）：演出必须在 paint 之前启动——
   * SSR 直出「终态」HTML（dialogue 全文可见 / chips opacity 1）后，
   * useEffect 在 paint 之后才跑，用户会先看到全文再被打回原态（视觉跳跃）。
   * hydration 后第一时间在 layout 与 paint 之间压回隐藏，消除中间帧（C2+I1 fix round）。 */
  useLayoutEffect(() => {
    const reduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      // 直出终态，无演出（不做 gsap.set——保留 SSR 直出终态的语义）；skip 交给父一个 noop
      onReadyRef.current?.({ skip: () => {} })
      return
    }

    /* 演出开始前（fadeIn 调起前）把 SSR 直出的「终态」先压回隐藏——
     * head / dialogue 段落 / choices chips 逐个交由演出链揭示。
     * dialogue 选择器必须同时覆盖 mode 2 段落与 mode 3 纯文字幕（两者都走打字机）；
     * 保留 img/figure 等媒体子元素的原生可见性（打字机整段跳过它们，同步 set 隐藏后由
     * tl.play(0) 的段落时间线立即揭示）。 */
    const hideTargets: HTMLElement[] = []
    const headEl = headRef.current
    if (headEl) hideTargets.push(headEl)
    const dlg = dlgRef.current
    if (dlg) {
      hideTargets.push(...dlg.querySelectorAll<HTMLElement>(':scope > *'))
    }
    const choicesEl = choicesRef.current
    if (choicesEl) {
      hideTargets.push(...choicesEl.querySelectorAll<HTMLElement>('.exit-chip'))
    }
    if (hideTargets.length > 0) gsap.set(hideTargets, { opacity: 0 })

    /* playDemo 的等待句柄：cleanup 时撤销（observer 断开 / timer 清掉） */
    const demoWait: { observer: MutationObserver | null; timer: number } = {
      observer: null,
      timer: 0,
    }

    const playTypewriterChain = (): Promise<void> => {
      const dlg = dlgRef.current
      if (!dlg) return Promise.resolve()
      const paras = Array.from(
        dlg.querySelectorAll<HTMLElement>(':scope > p, :scope > blockquote'),
      ).filter((p) => !p.querySelector(MEDIA_SELECTOR))
      if (paras.length === 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const run = (i: number) => {
          if (i >= paras.length) { resolve(); return }
          const tl = buildTypewriterTimeline(paras[i])
          if (!tl) { run(i + 1); return }
          tls.current.push(tl)
          if (i + 1 < paras.length) tl.eventCallback('onComplete', () => run(i + 1))
          else tl.eventCallback('onComplete', () => resolve())
          tl.play(0)
        }
        run(0)
      })
    }

    const fadeIn = (el: HTMLElement | null, dur = 0.4): Promise<void> => {
      if (!el) return Promise.resolve()
      const tween = gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur })
      tls.current.push(tween)
      return tween.then().then(() => undefined)
    }

    const choicesRise = (el: HTMLElement | null): Promise<void> => {
      if (!el) return Promise.resolve()
      const chips = el.querySelectorAll('.exit-chip')
      if (chips.length === 0) return Promise.resolve()
      const tween = gsap.fromTo(chips,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.18, ease: 'power2.out' })
      tls.current.push(tween)
      return tween.then().then(() => undefined)
    }

    /**
     * 触发 demo 并等它完成。
     * - data-finished 由 SceneClip 的 demo timeline onComplete 设置（可能在嵌套的
     *   .scene-clip 容器上 → 必须 subtree 监听）。
     * - IO 自动播放可能已让 demo 播完（data-finished 已在）→ 立即返回。
     * - 15 秒超时兜底：覆盖最长真实 demo（ai-digital-employee q-problem 7.3s +
     *   余量）+ 防极端卡死；C2 fix round 前为 3s，会截断长 demo 导致打字机从中段开始。
     */
    const playDemo = (): Promise<void> => {
      const api = getSceneClipApi(scene.demo)
      const container = stageRef?.current ?? null
      if (!api || !container) return Promise.resolve()
      api.play()
      if (container.querySelector(FINISHED_SELECTOR)) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const finish = () => {
          demoWait.observer?.disconnect()
          demoWait.observer = null
          window.clearTimeout(demoWait.timer)
          resolve()
        }
        demoWait.timer = window.setTimeout(finish, 15000)
        const observer = new MutationObserver(() => {
          if (container.querySelector(FINISHED_SELECTOR)) finish()
        })
        observer.observe(container, {
          attributes: true,
          attributeFilter: ['data-finished'],
          subtree: true,
        })
        demoWait.observer = observer
      })
    }

    const run = async () => {
      // act-head 立即 fade（不阻塞后续）
      const headP = fadeIn(headRef.current, 0.3)

      if (scene.mode === 1) {
        // mode 1：全屏 demo 先 → 缩窗 → 文字 → choices
        const stage = stageRef?.current ?? null
        if (stage) stage.classList.add(FULLSCREEN_CLASS)
        await playDemo()
        if (stage) {
          // 缩小过渡 0.6s，tween 完成后再摘全屏 class
          const tween = gsap.fromTo(
            stage,
            { scale: 1.4 },
            { scale: 1, duration: 0.6, ease: 'power3.inOut' },
          )
          tls.current.push(tween)
          await tween.then().then(() => undefined)
          stage.classList.remove(FULLSCREEN_CLASS)
        }
        await headP
        await playTypewriterChain()
        await choicesRise(choicesRef.current)
      } else if (scene.mode === 3) {
        // mode 3：纯文字
        await headP
        await playTypewriterChain()
        await choicesRise(choicesRef.current)
      } else {
        // mode 2：文字先行（默认）
        await headP
        await playTypewriterChain()
        await playDemo()
        await choicesRise(choicesRef.current)
      }
    }
    // 启动演出（不 await——onReady 需同步交付）
    void run()

    // skip：快照迭代当前 timeline 全部 progress(1)（onComplete 接力出的下一段
    // 保持正常速播，点击逐段推进）+ 立即摘全屏 class
    const skip = () => {
      for (const tl of [...tls.current]) tl.progress(1)
      const stage = stageRef?.current ?? null
      if (stage?.classList.contains(FULLSCREEN_CLASS)) {
        stage.classList.remove(FULLSCREEN_CLASS)
      }
    }
    onReadyRef.current?.({ skip })

    return () => {
      for (const tl of tls.current) tl.kill()
      tls.current = []
      demoWait.observer?.disconnect()
      window.clearTimeout(demoWait.timer)
      const stage = stageRef?.current ?? null
      if (stage?.classList.contains(FULLSCREEN_CLASS)) {
        stage.classList.remove(FULLSCREEN_CLASS)
      }
    }
    // refs 由 Answer 持有、身份稳定；onReady 走 ref——只随 scene 键重建演出
  }, [scene.id, scene.mode, scene.demo, headRef, dlgRef, choicesRef, stageRef])

  return <>{children}</>
}
