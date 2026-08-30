import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import gsap from 'gsap'
import { buildTypewriterTimeline } from './useTypewriter'
import { getSceneClipApi, type SceneClipApi } from './sceneClipRegistry'

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

    /* 演出开始前（fadeIn 调起前）把 SSR 直出的「终态」压回隐藏（C2+I1 fix round）。
     * 粒度是「揭示单元」而不是容器——容器一旦 opacity 0，打字机/choicesRise 的
     * 揭示会被一并吞掉（真实浏览器实测：打字机在打但容器不可见）：
     * - head 整块 → fadeIn 揭示
     * - dialogue 文本段落（p/blockquote，打字机管辖）→ 打字机启动该段时揭示
     *   （buildTypewriterTimeline 构建时即清空 innerHTML，揭示瞬间无内容可闪）
     * - dialogue 非文本子元素（img/figure/table/ul…打字机跳过）→ 随 head fade
     * - choices 每枚 chip → choicesRise fromTo 揭示
     * reduced-motion 早 return 不经过这里（直出终态）。 */
    const hidden: HTMLElement[] = []
    const mediaEls: HTMLElement[] = []
    const headEl = headRef.current
    if (headEl) hidden.push(headEl)
    const dlg = dlgRef.current
    if (dlg) {
      for (const el of Array.from(dlg.querySelectorAll<HTMLElement>(':scope > *'))) {
        const isTextPara =
          (el.tagName === 'P' || el.tagName === 'BLOCKQUOTE') &&
          !el.querySelector(MEDIA_SELECTOR)
        if (isTextPara) hidden.push(el)
        else mediaEls.push(el)
      }
    }
    const choicesEl = choicesRef.current
    if (choicesEl) {
      hidden.push(...Array.from(choicesEl.querySelectorAll<HTMLElement>('.exit-chip')))
    }
    if (hidden.length > 0) gsap.set(hidden, { opacity: 0 })

    /* playDemo 的等待句柄：cleanup 时撤销（observer 断开 / timer 清掉） */
    const demoWait: { observer: MutationObserver | null; timer: number } = {
      observer: null,
      timer: 0,
    }

    /* v5 review fix:async run() 生命周期守卫——cleanup 后 await 链 resolve
     * 不得再推进演出/挂新 tween(快速切幕时旧链对已卸载 DOM 继续动画)。 */
    let cancelled = false

    const playTypewriterChain = (): Promise<void> => {
      const dlg = dlgRef.current
      if (!dlg) return Promise.resolve()
      const paras = Array.from(
        dlg.querySelectorAll<HTMLElement>(':scope > p, :scope > blockquote'),
      ).filter((p) => !p.querySelector(MEDIA_SELECTOR))
      if (paras.length === 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const run = (i: number) => {
          if (cancelled) { resolve(); return }
          if (i >= paras.length) { resolve(); return }
          const p = paras[i]
          // 段落揭示（与打字机同步：先 reveal 让浏览器有 layout，再打字）
          const revealTween = gsap.to(p, { opacity: 1, duration: 0.25 })
          if (!cancelled) tls.current.push(revealTween)
          const tl = buildTypewriterTimeline(p)
          if (!tl) { revealTween.progress(1); run(i + 1); return }
          if (!cancelled) tls.current.push(tl)
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
      if (!cancelled) tls.current.push(tween)
      return tween.then().then(() => undefined)
    }

    const choicesRise = (el: HTMLElement | null): Promise<void> => {
      if (!el) return Promise.resolve()
      const chips = el.querySelectorAll('.exit-chip')
      if (chips.length === 0) return Promise.resolve()
      const tween = gsap.fromTo(chips,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.18, ease: 'power2.out' })
      if (!cancelled) tls.current.push(tween)
      return tween.then().then(() => undefined)
    }

    /**
     * 触发 demo 并等它完成。
     * - API 注册时序竞态：SceneClip 的 useEffect(passive)在 Director 的
     *   useLayoutEffect 之后跑——mount 阶段首次调 getSceneClipApi 必然拿到 undefined。
     *   这里先 await 一帧（rAF）让 SceneClip 注册完成；拿不到 API 兜底超时。
     * - data-finished 由 SceneClip 的 demo timeline onComplete 设置（可能在嵌套的
     *   .scene-clip 容器上 → 必须 subtree 监听）。
     * - IO 自动播放可能已让 demo 播完（data-finished 已在）→ 立即返回。
     * - 15 秒超时兜底：覆盖最长真实 demo（ai-digital-employee q-problem 7.3s +
     *   余量）+ 防极端卡死；C2 fix round 前为 3s，会截断长 demo 导致打字机从中段开始。
     */
    const playDemo = (): Promise<void> => {
      const container = stageRef?.current ?? null
      if (!container) return Promise.resolve()

      const waitForApi = (deadline: number): Promise<SceneClipApi | null> => new Promise((resolve) => {
        const a = getSceneClipApi(scene.demo)
        if (a) return resolve(a)
        if (Date.now() > deadline) return resolve(null)
        requestAnimationFrame(() => waitForApi(deadline).then(resolve))
      })

      return waitForApi(Date.now() + 2000).then((api) => {
        if (cancelled) return // cleanup 后 SceneClip 的 play() 不得再触发
        if (!api) return // SceneClip 没注册（理论上不应发生；兜底跳过）
        api.play()
        if (container.querySelector(FINISHED_SELECTOR)) return
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
      })
    }

    const run = async () => {
      // act-head 立即 fade（不阻塞后续）；媒体段落（img/figure/table/ul…打字机跳过）
      // 随 head 一起揭示，避免 SSR 直出「终态」产生视觉跳跃
      const headP = fadeIn(headRef.current, 0.3)
      const mediaP = Promise.all(mediaEls.map((el) => fadeIn(el, 0.3)))

      if (scene.mode === 1) {
        // mode 1：全屏 demo 先 → 缩窗 → 文字 → choices
        const stage = stageRef?.current ?? null
        if (stage) stage.classList.add(FULLSCREEN_CLASS)
        await playDemo()
        if (cancelled) return
        if (stage) {
          /* v5 fix round：缩窗时序
           *
           * 旧版问题：tween 走完后才摘 FULLSCREEN_CLASS → 元素从 position:fixed
           * 跳回文档流布局是0 帧突变，视觉像「闪一下又缩回原位」。
           *
           * 修法：tween 启动后立即摘全屏 class（元素还在 scale(1.4→1) 的 transform 中，
           * 浏览器从 fixed 切回原位时几何中心保持连续），再用 transform-origin: center
           * 防剧场区布局偏移导致缩窗中心看起来不对。
           *
           * tween 自身的 transform 在原位置继续从 1.4 缩到 1，因为元素此时已切回文档流——
           * transform 是相对自身的，不依赖外层 fixed 定位。 */
          const tween = gsap.fromTo(
            stage,
            { scale: 1.4, transformOrigin: 'center center' },
            { scale: 1, transformOrigin: 'center center', duration: 0.6, ease: 'power3.inOut' },
          )
          if (!cancelled) tls.current.push(tween)
          stage.classList.remove(FULLSCREEN_CLASS)
          await tween.then().then(() => undefined)
        }
        if (cancelled) return
        await headP
        if (cancelled) return
        await mediaP
        if (cancelled) return
        await playTypewriterChain()
        if (cancelled) return
        await choicesRise(choicesRef.current)
      } else if (scene.mode === 3) {
        // mode 3：纯文字
        await headP
        if (cancelled) return
        await mediaP
        if (cancelled) return
        await playTypewriterChain()
        if (cancelled) return
        await choicesRise(choicesRef.current)
      } else {
        // mode 2：文字先行（默认）
        await headP
        if (cancelled) return
        await mediaP
        if (cancelled) return
        await playTypewriterChain()
        if (cancelled) return
        await playDemo()
        if (cancelled) return
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
      cancelled = true
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
