import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import gsap from 'gsap'
import { buildTypewriterTimeline } from './useTypewriter'
import { getSceneClipApi, type SceneClipApi } from './sceneClipRegistry'
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
 * - mode 1：clip reparent 到 body 根 + 覆盖层全屏播放（`await api.play()`）→
 *   缩窗 tween 落到占位元素位置（onComplete 一处还原 inline style + 插回原槽位 +
 *   撤占位/覆盖层）→ 文字 → choices
 * - mode 2：act-head fade → dialogue 打字链 → demo → choices（默认）
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
  /* mode 1 手工全屏的兜底清理：overlay 是 append 到 body 的非 React 托管节点，
   * clip 被 reparent 到 body 根 + 改成 fixed 也是脱 React 的 DOM/inline style 操作，
   * 占位元素（placeholder）撑住 grid 原槽位——切幕/卸载中途 cleanup 时
   * tween 的 onComplete 不会跑（tl.kill 不触发），必须在这里手工收尾。 */
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const clipRef = useRef<HTMLElement | null>(null)
  const origStyleRef = useRef<string | null>(null)
  const placeholderRef = useRef<HTMLDivElement | null>(null)

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
      // act-head 立即 fade（不阻塞后续）；媒体段落（img/figure/table/ul…打字机跳过）
      // 随 head 一起揭示，避免 SSR 直出「终态」产生视觉跳跃
      const headP = fadeIn(headRef.current, 0.3)
      const mediaP = Promise.all(mediaEls.map((el) => fadeIn(el, 0.3)))

      if (scene.mode === 1) {
      // mode 1：demo 全屏播放 → 缩回 grid 原位 → 文字 → choices
      /* 2026-08-31 架构修复（reparent + placeholder 方案，取代原「clip 原地 fixed」方案）
       *
       * 原方案两个实锤 bug（用户实测）：
       * 1. 入场黑屏看不到动画——position:fixed 只跳出包含块，**跳不出祖先 stacking
       *    context**：.stage-inner 是 position:relative + z-index:2 的 stacking context，
       *    clip 的 z-index:5001 只在该 context 内部有效；body 根的 overlay(z-index:5000)
       *    与 stage-inner(z-index:2) 在根层比较，5000 >> 2 → overlay 把整个 stage 子树
       *    （含"fixed"的 clip）盖在黑幕下面。修复：把 clip **reparent 到 body 根**，
       *    与 overlay 同在根层比较，5001 > 5000 胜出。
       * 2. 播完缩到屏幕中间再闪现回容器——原 shrink 的终点是 x:0,y:0（fixed 的视口
       *    原点），根本不是 grid 槽位；onComplete 还原 style 瞬间元素从视口角落跳回
       *    槽位 = 闪现。修复：进全屏前在原槽位插**占位元素**撑住 grid 布局，缩窗时
       *    重量占位 rect 作为动画终点（播放期间页面滚动也能落准），动画终点与还原后
       *    的静态位置像素级重合 → 无缝。
       *
       * 时序：
       * 1. 量 clip rect（grid 原态）→ 插占位元素 → clip reparent 到 body 根；
       * 2. clip 设 fixed，同一同步任务内 gsap.set 直接到居中终态——第一帧即
       *    居中，无入场放大过程（2026-08-31 用户裁定）；overlay 仅背景淡入；
       * 3. demo 在黑幕上播放（可见——clip 已脱离 stage-inner stacking context）；
       * 4. 缩窗：重量占位 rect → 动画落到占位姿态（xPercent/yPercent 归零 + x/y =
       *    占位 left/top + scale 1），overlay 同步淡出；
       * 5. onComplete 一处收尾：还原 inline style → clip 插回占位位置 → 撤占位与
       *    overlay → FLIP 补偿（实测真实静态 rect 与落点的残差，同帧反向
       *    transform 对齐 + 0.18s 滑零）——占位只是布局近似，残差不可避免，
       *    补偿把「跳变」变成「滑入」；
       * 6. 后续 head / dialogue / choices 文字演出。
       *
       * React 安全性：reparent 的是 SceneClip 根节点，播放期间该子树无 React 重渲染
       * （打字机/dialogue 演出不动 stage 子树）；所有退出路径（onComplete / cleanup）
       * 都把 clip 插回原位。
       *
       * demo 元素是 SceneClip 渲染的根 .scene-clip（Answer 把它放进 .stage-inner
       * → .stage 链中）。用 querySelector 拿——避免改 Director 接口引入 clipRef。 */
      const stage = stageRef?.current ?? null
      const clip = document.querySelector<HTMLElement>('.scene-clip')
      if (stage && clip) {
        // 量 demo rect（grid 原态，未放大）
        const clipRect = clip.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight
        // scale: 让 demo 在视口里居中铺开（保 aspect，5% 边距）
        const scale = Math.min(vw / clipRect.width, vh / clipRect.height) * 0.95

        // 记下原 inline style 与原父节点，收尾时还原
        const origStyle = clip.getAttribute('style') ?? ''
        const origParent = clip.parentElement!
        // 占位元素：撑住 grid 左列槽位（clip 脱离后容器不塌），缩窗时作落点标尺
        const ph = document.createElement('div')
        ph.className = 'mode1-placeholder'
        ph.style.cssText = `width:${clipRect.width}px;height:${clipRect.height}px;visibility:hidden;pointer-events:none`
        origParent.insertBefore(ph, clip)

        // 覆盖层 + clip 都挂到 body 根（reparent 是治黑屏的关键，见上方架构注释）
        const overlay = document.createElement('div')
        overlay.className = 'mode1-overlay'
        overlay.style.cssText =
          'position:fixed;inset:0;background:var(--panel, #101010);z-index:5000;pointer-events:none;opacity:0'
        document.body.appendChild(overlay)
        document.body.appendChild(clip)
        /* 归属变化护栏（2026-08-31 用户实测「缩回落点偏左、还原瞬间跳变」的根因）：
         * reparent 后 .stage-frame .stage .scene-clip 选择器不再匹配，clip 回落到
         * v2 基线 .scene-clip（display:block 无居中 / margin:20px 0 / dashed border /
         * min-height / 宽度 shrink-to-fit）；还原回 grid 瞬间这些规则重新生效 →
         * 内容级跳变（外盒 rect 对齐了也没用，跳的是盒内内容）。挂镜像 class +
         * 内联宽度，让全屏期渲染与还原后逐规则一致。 */
        clip.classList.add('scene-clip--fs')
        clip.style.width = `${clipRect.width}px`
        clip.style.position = 'fixed'
        clip.style.left = '0'
        clip.style.top = '0'
        clip.style.zIndex = '5001'
        clipRef.current = clip
        origStyleRef.current = origStyle
        overlayRef.current = overlay
        placeholderRef.current = ph

        // 第一帧即居中终态（2026-08-31 用户裁定：入场放大过程没有必要）——
        // reparent + fixed + 居中 set 在同一同步任务内完成，无中间帧。
        gsap.set(clip, { xPercent: -50, yPercent: -50, x: vw / 2, y: vh / 2, scale })
        // overlay 淡入（仅背景过渡，不动 clip）
        overlay.style.transition = 'opacity 0.3s ease'
        overlay.style.opacity = '1'

        // demo 在全屏态播放
        await playDemo()
        if (cancelled) return

        // 缩窗落点：重量占位 rect（播放期间页面滚动也能落准 grid 槽位）
        const phRect = ph.getBoundingClientRect()
        // 缩窗动画终点 = 占位姿态（x/y = 占位 left/top、scale 1、xPercent 归零）。
        // 注意：不要再调 shrink.eventCallback('onComplete', ...) 追加回调——
        // eventCallback 是替换语义，会把这里的 vars onComplete 整个顶掉
        // （2026-08 实锤 bug：样式还原被覆盖，clip 永久残留 position:fixed）。
        const shrink = gsap.to(
          clip,
          {
            xPercent: 0,
            yPercent: 0,
            x: phRect.left,
            y: phRect.top,
            scale: 1,
            duration: 0.6,
            ease: 'power3.inOut',
            onStart: () => {
              overlay.style.transition = 'opacity 0.3s ease'
              overlay.style.opacity = '0'
            },
            onComplete: () => {
              // 摘镜像 class + 还原 inline style → 插回占位位置（同一同步任务内完成，无中间帧）
              clip.classList.remove('scene-clip--fs')
              clip.setAttribute('style', origStyle)
              origParent.insertBefore(clip, ph)
              ph.remove()
              overlay.remove()
              if (overlayRef.current === overlay) overlayRef.current = null
              if (placeholderRef.current === ph) placeholderRef.current = null
              if (clipRef.current === clip) { clipRef.current = null; origStyleRef.current = null }
              /* FLIP 收尾补偿（2026-08-31 用户实测：落点偏左、再跳变进黑框）：
               * 占位 div 的盒子与 clip 还原后的真实静态盒子可能有布局差
               * （clip 静态尺寸受内容/flex min-width 影响，占位只是近似）。
               * 还原后立即实测真实 rect，若有差值则同帧内反向 transform 把视觉
               * 位置对齐到缩窗落点（浏览器 paint 前完成，零跳变），再用一个
               * 0.18s 微 tween 归零——残留位移从「跳变」变成「滑入」。 */
              const real = clip.getBoundingClientRect()
              const dx = phRect.left - real.left
              const dy = phRect.top - real.top
              if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                const settle = gsap.fromTo(
                  clip,
                  { x: dx, y: dy },
                  { x: 0, y: 0, duration: 0.18, ease: 'power1.out', clearProps: 'transform' },
                )
                if (!cancelled) tls.current.push(settle)
              }
            },
          },
        )
        if (!cancelled) tls.current.push(shrink)
        await shrink.then().then(() => undefined)
      } else {
        // 无 stage 或无 clip：纯文字全屏（理论上 mode 1 + 无 .stage 不该存在，但兜底走原 demo 优先路径）
        await playDemo()
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
      // 注意：cleanup 时 tl.kill() 不会触发 tween 的 onComplete / clearProps
      // （v7 T3 实测）；mode 1 中途清理必须手工收尾——overlay/placeholder 是
      // append 到 DOM 的非 React 托管节点，clip 被 reparent 到 body 根 +
      // fixed 内联样式也要还原并插回原槽位（若 clip 仍在文档中）。
      overlayRef.current?.remove()
      overlayRef.current = null
      const clip = clipRef.current
      const ph = placeholderRef.current
      if (clip && clip.isConnected && origStyleRef.current != null) {
        clip.classList.remove('scene-clip--fs')
        clip.setAttribute('style', origStyleRef.current)
        if (ph && ph.isConnected) ph.parentElement?.insertBefore(clip, ph)
      }
      ph?.remove()
      placeholderRef.current = null
      clipRef.current = null
      origStyleRef.current = null
    }
    // refs 由 Answer 持有、身份稳定；onReady 走 ref——只随 scene 键重建演出
  }, [scene.id, scene.mode, scene.demo, headRef, dlgRef, choicesRef, stageRef])

  return <>{children}</>
}
