import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import gsap from 'gsap'
import { buildTypewriterTimeline } from './useTypewriter'
import { getSceneClipApi, type SceneClipApi } from './sceneClipRegistry'
import { playClipFullscreen, cancelClipFullscreen } from './clipFullscreen'
import { prefersReducedMotion } from '../../lib/motion'

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

/** 同 Answer/useTypewriter：含媒体子元素的段落整段跳过打字（final review B2 同款） */
const MEDIA_SELECTOR = 'img, svg, figure, table, ul, ol, video, canvas'

/**
 * v4 Director：mode 1/2/3 演出编排 + 点击 skip。
 *
 * - mode 1：demo 全屏播放（playClipFullscreen，见 clipFullscreen.ts）→ 缩回原位 → 文字 → choices
 * - mode 2：文字全屏展示（theater--text-focus：藏舞台、正文单列居中打字）→
 *   淡出撤类恢复双列 → demo 原地播 → choices（默认）
 * - mode 3：纯文字（refuse 幕等无 demo 场景；.stage 容器由 Answer 决定是否渲染）
 * - skip()：当前进行中的 timeline 全部 progress(1)（触发下一段接力）；
 *   demo 时间线归 SceneClip 持有、不在 tls 里——经 registry 取 api，
 *   「已开始且未播完」才 finish()（progress(1) 同步触发 onComplete →
 *   play() promise resolve → 演出链推进到缩窗）。未开始的 demo 不动——
 *   skip 语义是逐段推进，不是整幕跳没；用快照迭代——onComplete 接力新建的
 *   timeline 保持正常速度播放，点击逐段推进。
 * - demo 完成等待：v7 Task 3（demo API promise 化）收敛为 SceneClipApi.play() 返回
 *   的 Promise——onComplete（自然完成）/ cleanup（卸载/切幕兜底）时 resolve；
 *   不再用 MutationObserver + 15s 超时。
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
    const reduced = prefersReducedMotion()

    if (reduced) {
      // 直出终态，无演出（不做 gsap.set——保留 SSR 直出终态的语义）；skip 交给父一个 noop
      onReadyRef.current?.({ skip: () => {} })
      return
    }

    /* 演出开始前（fadeIn 调起前）把 SSR 直出的「终态」压回隐藏（C2+I1 fix round）。
     * 粒度是「揭示单元」而不是容器——容器一旦 opacity 0，打字机/choicesRise 的
     * 揭示会被一并吞掉（真实浏览器实测：打字机在打但容器不可见）：
     * - head 整块 → fadeIn 揭示
     * - dialogue 全部直接子元素（p/blockquote 打字、ul/table 等媒体淡入）→
     *   按文档顺序串行揭示（2026-09-02 fix：媒体元素不再随 head 提前放出——
     *   此前后文表格在前文打字时就已全量可见，阅读顺序被打乱）
     * - choices 每枚 chip 与组标签 → choicesRise fromTo 揭示
     * reduced-motion 早 return 不经过这里（直出终态）。
     * 2026-09-01 fix：统一用 autoAlpha 而非 opacity——autoAlpha:0 同时写
     * visibility:hidden，隐藏的 chip 不再响应点击（此前 opacity:0 的 chip
     * 仍吃点击事件，用户点空白区域被隐形按钮跳走）。 */
    const hidden: HTMLElement[] = []
    const headEl = headRef.current
    if (headEl) hidden.push(headEl)
    const dlg = dlgRef.current
    if (dlg) {
      hidden.push(...Array.from(dlg.querySelectorAll<HTMLElement>(':scope > *')))
    }
    const choicesEl = choicesRef.current
    if (choicesEl) {
      /* v14：组标签（▸ 深入 / ？ 提问 / ▸ 去向）与 chip 一起压回隐藏——
       * 否则演出期间（含 mode 1 demo 全屏播放）空标签悬在屏幕上 */
      hidden.push(...Array.from(choicesEl.querySelectorAll<HTMLElement>('.exit-chip, .choices-group-label')))
    }
    if (hidden.length > 0) gsap.set(hidden, { autoAlpha: 0 })

    /* v5 review fix:async run() 生命周期守卫——cleanup 后 await 链 resolve
     * 不得再推进演出/挂新 tween(快速切幕时旧链对已卸载 DOM 继续动画)。 */
    let cancelled = false
    /* v11：mode 2 文字全屏态的 theater 元素——cleanup 时必须摘类 + 清 inline
     * opacity（淡出中被切幕会残留 opacity:0 的黑面板） */
    let textFocusEl: HTMLElement | null = null

    /* 2026-09-02：对话区按文档顺序串行揭示（取代原 playTypewriterChain +
     * 媒体元素随 head 提前放出）。直接子元素逐个处理：文本段落（p/blockquote
     * 且无媒体子元素）逐字打字；媒体元素（ul/ol/table/img…）淡入后继续。
     * 保证「前文未出现，后文不可见」的阅读顺序。 */
    const playDialogueChain = (): Promise<void> => {
      const dlg = dlgRef.current
      if (!dlg) return Promise.resolve()
      const units = Array.from(dlg.querySelectorAll<HTMLElement>(':scope > *'))
      if (units.length === 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const run = (i: number) => {
          if (cancelled) { resolve(); return }
          if (i >= units.length) { resolve(); return }
          const el = units[i]
          const isTextPara =
            (el.tagName === 'P' || el.tagName === 'BLOCKQUOTE') &&
            !el.querySelector(MEDIA_SELECTOR)
          const revealTween = gsap.to(el, { autoAlpha: 1, duration: 0.25 })
          if (!cancelled) tls.current.push(revealTween)
          if (!isTextPara) {
            // 媒体元素：淡入完成后推进到下一个单元
            revealTween.then(() => run(i + 1))
            return
          }
          const tl = buildTypewriterTimeline(el)
          if (!tl) { revealTween.progress(1); run(i + 1); return }
          if (!cancelled) tls.current.push(tl)
          tl.eventCallback('onComplete', () => run(i + 1))
          tl.play(0)
        }
        run(0)
      })
    }

    const fadeIn = (el: HTMLElement | null, dur = 0.4): Promise<void> => {
      if (!el) return Promise.resolve()
      const tween = gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur })
      if (!cancelled) tls.current.push(tween)
      return tween.then().then(() => undefined)
    }

    const choicesRise = (el: HTMLElement | null): Promise<void> => {
      if (!el) return Promise.resolve()
      // v14：组标签与 chip 同批升起（selector 与初始隐藏一致）
      const chips = el.querySelectorAll('.exit-chip, .choices-group-label')
      if (chips.length === 0) return Promise.resolve()
      const tween = gsap.fromTo(chips,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.18, ease: 'power2.out' })
      if (!cancelled) tls.current.push(tween)
      return tween.then().then(() => undefined)
    }

    /**
     * 触发 demo 并等它完成（v7 Task 3 promise 化收敛）。
     * - SceneClip 注册时序竞态：SceneClip 的 useEffect（passive）在 Director 的
     *   useLayoutEffect 之后跑——mount 阶段首次调 getSceneClipApi 必然拿到 undefined。
     *   这里先 await 一帧（rAF）让 SceneClip 注册完成；2 秒兜底超时（与 SceneClip
     *   慢注册的极端情况兼容）。
     * - 已 finished 时不重播（data-finished 由 SceneClip 的 demo timeline onComplete
     *   设置，IO 提前进入视口可能已让 demo 播完）。
     * - 完成等待：`await api.play()`——onComplete / cleanup resolve，
     *   不再用 MutationObserver + 15s 超时。
     */
    const playDemo = (): Promise<void> => {
      /* v6 review fix：demo 名显式短路——纯文字幕（mode 3 / 无 scene.demo）
       * 不该进 waitForApi 轮询（getSceneClipApi('') 永远 undefined）。 */
      if (!scene.demo) return Promise.resolve()

      const waitForApi = (deadline: number): Promise<SceneClipApi | null> => new Promise((resolve) => {
        const a = getSceneClipApi(scene.demo)
        if (a) return resolve(a)
        if (Date.now() > deadline) return resolve(null)
        requestAnimationFrame(() => waitForApi(deadline).then(resolve))
      })

      return waitForApi(Date.now() + 2000).then((api) => {
        if (cancelled) return // cleanup 后 SceneClip 的 play() 不得再触发
        if (!api) return // SceneClip 没注册（理论上不应发生；兜底跳过）
        if (api.finished()) return // 已 finished 直接返回，不重播
        return api.play()
      })
    }

    const run = async () => {
      // act-head 立即 fade（不阻塞后续）；对话区内容（含媒体元素）由
      // playDialogueChain 按文档顺序串行揭示，不再随 head 提前放出
      const headP = fadeIn(headRef.current, 0.3)

      if (scene.mode === 1) {
      // mode 1：demo 全屏播放 → 缩回 grid 原位 → 文字 → choices
      // v12：clip 经 stageRef 在本幕舞台内定位（clipFullscreen showModal 进
      // top layer；reparent 版的全局 document.querySelector 已不需要）
      const stage = stageRef?.current ?? null
      const clip = stage?.querySelector<HTMLDialogElement>('.scene-clip') ?? null
      if (stage && clip) {
        await playClipFullscreen({
          clip,
          play: playDemo,
          isCancelled: () => cancelled,
          registerTl: (tl) => { if (!cancelled) tls.current.push(tl) },
        })
      } else {
        // 无 stage 或无 clip：纯文字全屏（理论上 mode 1 + 无 .stage 不该存在，但兜底走原 demo 优先路径）
        await playDemo()
      }
      if (cancelled) return
      await headP
      if (cancelled) return
      await playDialogueChain()
      if (cancelled) return
      await choicesRise(choicesRef.current)
    } else if (scene.mode === 3) {
      // mode 3：纯文字
      await headP
      if (cancelled) return
      await playDialogueChain()
      if (cancelled) return
      await choicesRise(choicesRef.current)
    } else {
      // mode 2：文字全屏展示 → 收起到双列 → demo 原地播 → choices
      /* v11（用户裁定）：全屏的是**文字**而不是 demo——
       * 演出开始给 theater 挂 .theater--text-focus（隐藏左列舞台、正文单列居中），
       * 打字机在「文字独占屏幕」的状态下落字；读完后剧场淡出 → 撤类恢复双列 →
       * 淡入，demo 再原地播（IO 抢播已由 SceneDirectedContext 关掉，
       * 不会出现「文字动画一起播」）；想全屏看动画用 clip 上的 ⛶ 按钮。 */
      const theaterEl = (headRef.current ?? dlgRef.current)?.closest<HTMLElement>('.theater') ?? null
      if (theaterEl) {
        textFocusEl = theaterEl
        theaterEl.classList.add('theater--text-focus')
      }
      await headP
      if (cancelled) return
      await playDialogueChain()
      if (cancelled) return
      if (theaterEl) {
        // 读完停顿半秒 → 淡出 → 撤文字全屏态 → 淡入双列布局（demo 初始态已隐藏）
        const hold = gsap.to({}, { duration: 0.5 })
        if (!cancelled) tls.current.push(hold)
        await hold.then().then(() => undefined)
        if (cancelled) return
        const fadeOut = gsap.to(theaterEl, { opacity: 0, duration: 0.25 })
        if (!cancelled) tls.current.push(fadeOut)
        await fadeOut.then().then(() => undefined)
        if (cancelled) return
        theaterEl.classList.remove('theater--text-focus')
        textFocusEl = null
        const fadeInBack = gsap.to(theaterEl, { opacity: 1, duration: 0.35, clearProps: 'opacity' })
        if (!cancelled) tls.current.push(fadeInBack)
        await fadeInBack.then().then(() => undefined)
        if (cancelled) return
      }
      await playDemo()
      if (cancelled) return
      await choicesRise(choicesRef.current)
    }
    }
    // 启动演出（不 await——onReady 需同步交付）
    void run()

    // skip：快照迭代当前 timeline 全部 progress(1)（onComplete 接力出的下一段
    // 保持正常速播，点击逐段推进）。GSAP 在 progress(1) 时同步触发 onComplete
    // + tween vars 里的 clearProps，所以不再额外 gsap.set。
    const skip = () => {
      for (const tl of [...tls.current]) tl.progress(1)
      /* demo 时间线不在 tls 里（SceneClip 持有）——经 registry 取 api 一并推进：
       * 只 finish「已开始且未播完」的播放中 demo；未开始的不动（skip 是逐段推进
       * 语义——mode 2 打字机阶段点 skip，不该把还没轮到的 demo 直接跳没）。 */
      if (scene.demo) {
        const api = getSceneClipApi(scene.demo)
        if (api?.started?.() && !api.finished()) api.finish?.()
      }
    }
    onReadyRef.current?.({ skip })

    return () => {
      cancelled = true
      for (const tl of tls.current) tl.kill()
      tls.current = []
      // v11：mode 2 文字全屏态中途清理——摘类 + 清掉淡出残留的 inline opacity
      if (textFocusEl) {
        textFocusEl.classList.remove('theater--text-focus')
        gsap.set(textFocusEl, { clearProps: 'opacity' })
        textFocusEl = null
      }
      // 注意：cleanup 时 tl.kill() 不会触发 tween 的 onComplete / clearProps
      // （v7 T3 实测）；全屏中途清理必须手工收尾——clip 的 inline 几何要还原、
      // dialog 要撤 top layer、placeholder/灯箱控制条是 append 到 DOM 的非 React
      // 托管节点。v12：收尾逻辑收敛到 clipFullscreen 的会话 cancel（幂等，
      // 内部判 isConnected；clip 不再被 reparent，React 卸载节点本身无障碍）。
      cancelClipFullscreen()
    }
    // refs 由 Answer 持有、身份稳定；onReady 走 ref——只随 scene 键重建演出
  }, [scene.id, scene.mode, scene.demo, headRef, dlgRef, choicesRef, stageRef])

  return <>{children}</>
}
