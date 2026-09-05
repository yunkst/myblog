import gsap from 'gsap'

/**
 * clip 全屏机制（v12 top-layer 重构）。
 *
 * 单一机制：clip 由 SceneClip 渲染为 <dialog class="scene-clip">，全屏 =
 * showModal() 提升到浏览器 top layer。与已退役的 reparent 方案（v10：量 rect →
 * 插占位 → 搬到 body 根 → 镜像 class 补级联）相比：
 *
 * - 不搬 DOM——节点仍在 React 树里，.stage .scene-clip 级联、合成事件、
 *   运行中的 GSAP timeline 引用全部原样；镜像 class scene-clip--fs 与
 *   「React removeChild 找不到节点」整类问题随之消失。
 * - top layer 天然盖过一切祖先 stacking context / z-index / overflow
 *   （reparent 当年要治的「祖先盖黑幕」由平台语义直接解决）。
 * - 背景压暗用 ::backdrop（.fs-dim 类触发 transition），不再是 body 根 overlay div。
 *
 * 仍然保留的两块旧资产：
 * - placeholder 占位：top layer 出流后 grid 槽位照样塌，缩窗 FLIP 也要它当落点标尺。
 * - 模块级单会话 active + cancelClipFullscreen：切幕/卸载的中途收尾入口不变。
 *
 * 两种形态：
 * - playClipFullscreen（演出型）：Director mode 1 用——全屏自动播 demo，播完
 *   立即缩回原位，演出链继续走文字。会话期内挂 ResizeObserver + resize 监听
 *   重夹 scale——「fit 视口」是会话不变量而非一次性测量（修：mode 1 在挂载
 *   瞬间展开，漫画图未加载时量到的高度≈0，scale 只按宽度算出超大值，图片
 *   加载完成后内容长高溢出视口）。
 * - openClipLightbox（灯箱型，v11 用户裁定）：SceneClip ⛶ 按钮用——全屏从头
 *   播放后停留不缩回；滚轮缩放（光标锚定）+ 拖动平移。打开时保持自动 refit
 *   （内容可能尚未解码），用户一旦滚轮/拖动即接管、自动 fit 让位；右上角
 *   「✕ 关闭」/ ESC / 点遮罩背景触发缩回原位。灯箱控制条挂在
 *   第二个 <dialog> 里随后 showModal——top layer 内后提升者画在上，且不被
 *   clip 的缩放平移 transform 带走（clip 内容进 top layer 后，页面层的任何
 *   z-index 都画不过它，控制条必须同在 top layer）。
 */
export interface ClipFullscreenOpts {
  clip: HTMLElement
  /** 在全屏态触发并等待 demo 播放完成 */
  play: () => Promise<void> | void
  /** 演出链取消探测（Director cleanup 后不再推进 shrink/收尾动画） */
  isCancelled?: () => boolean
  /** 收集 shrink / settle tween（Director 挂进 tls，skip 能快进它们） */
  registerTl?: (tl: gsap.core.Animation) => void
}

export interface ClipLightboxOpts {
  clip: HTMLElement
  /** 进入灯箱后自动从头播放一次（不等它播完——播完停留全屏，关闭权在用户） */
  play?: () => Promise<void> | void
}

interface ActiveSession {
  clip: HTMLElement
  cancel: () => void
}
let active: ActiveSession | null = null

/** 立即收尾还原进行中的全屏会话（幂等）。传 clip 时只收该 clip 的会话。 */
export function cancelClipFullscreen(clip?: HTMLElement) {
  if (active && (!clip || active.clip === clip)) active.cancel()
}

/* ───────────────────────── 共用 promote/shrink 机制 ───────────────────────── */

interface PromoteCtx {
  clip: HTMLDialogElement
  baseX: number
  baseY: number
  baseScale: number
  /** 立即还原（清 inline 几何 + close 撤 top layer + 撤占位），幂等 */
  restore: () => void
  /** 会话取消路径：标记取消（缩窗尾部的 settle 决策据此跳过）+ restore */
  cancel: () => void
  /** 缩窗动画落回原槽位（含 FLIP 残差补偿），完成后内部调 restore */
  shrinkToHome: (registerTl?: (tl: gsap.core.Animation) => void) => Promise<void>
}

function promoteClip(
  clip: HTMLDialogElement,
  opts: { refit: boolean; refitWhile?: () => boolean },
): PromoteCtx {
  // 量 demo rect（grid 原态，未放大）
  const clipRect = clip.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  // scale：让 demo 在视口里居中铺开（保 aspect，5% 边距）
  const scale = Math.min(vw / clipRect.width, vh / clipRect.height) * 0.95

  const origStyle = clip.getAttribute('style') ?? ''
  const origParent = clip.parentElement!
  // 占位元素：dialog 进 top layer 后出流，grid 槽位会塌——撑住它，缩窗时作落点标尺。
  // margin 一并镜像（flat-post 内联态 clip 有 20px 上下边距），保证落点 = 还原位置。
  const clipCS = getComputedStyle(clip)
  const ph = document.createElement('div')
  ph.className = 'mode1-placeholder'
  ph.style.cssText = `width:${clipRect.width}px;height:${clipRect.height}px;margin:${clipCS.margin};visibility:hidden;pointer-events:none`
  origParent.insertBefore(ph, clip)

  // top layer 提升：不搬 DOM。UA 的 dialog:modal 几何（margin auto / max-width /
  // overflow）由 framework.css 的 dialog.scene-clip:modal 规则撤掉，位置交给
  // inline 几何 + gsap transform。
  clip.showModal()

  /* 全屏几何：宽度冻结为实测值（fixed 出流后 CSS width:100% 会变成视口宽）；
   * 高度留给内容——图片/字体迟到加载会让它长高，由下面的 fitRefit 重夹 scale，
   * 不再假设「测量瞬间布局即终态」（reparent 版溢出 bug 的根源）。 */
  clip.style.width = `${clipRect.width}px`
  clip.style.position = 'fixed'
  clip.style.left = '0'
  clip.style.top = '0'

  let restored = false
  let sessionCancelled = false

  // 第一帧即居中终态——提升 + 几何 + 居中 set 在同一同步任务内完成，无中间帧
  gsap.set(clip, { xPercent: -50, yPercent: -50, x: vw / 2, y: vh / 2, scale })
  // 背景压暗走 ::backdrop：下一帧挂 .fs-dim 触发 transition 渐暗
  // （不支持 ::backdrop 过渡的浏览器直接变暗，可接受退化）
  requestAnimationFrame(() => { if (!restored) clip.classList.add('fs-dim') })

  // UA 语义：modal dialog 上按 ESC 会触发 cancel → 默认关闭。全屏的关闭权
  // 不在裸 ESC——演出型由 Director 编排收尾，灯箱型由 requestClose 统一收口。
  const onCancel = (ev: Event) => ev.preventDefault()
  clip.addEventListener('cancel', onCancel)

  /* fit 不变量：内容盒尺寸变化（图片/字体迟到加载）或窗口 resize 时重夹 scale
   * 并保持居中。offsetWidth/Height 是布局盒，不受 transform 缩放影响，可直接
   * 代入 fit 公式。placeholder 同步内容真实尺寸——槽位全程诚实（重排发生在
   * 不透明幕布之后），缩窗 FLIP 落点才准、restore 不再跳位。
   * refitWhile：灯箱型在用户滚轮/拖动接管后停止自动 refit（缩放权在用户）。 */
  let ro: ResizeObserver | null = null
  const fit = () => {
    if (restored) return
    if (opts.refitWhile && !opts.refitWhile()) return
    const w = clip.offsetWidth
    const h = clip.offsetHeight
    if (!w || !h) return
    ph.style.width = `${w}px`
    ph.style.height = `${h}px`
    gsap.set(clip, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      scale: Math.min(window.innerWidth / w, window.innerHeight / h) * 0.95,
    })
  }
  const stopFit = () => {
    ro?.disconnect()
    ro = null
    window.removeEventListener('resize', fit)
  }
  if (opts.refit && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(fit)
    ro.observe(clip)
    window.addEventListener('resize', fit)
  }

  const restore = () => {
    if (restored) return
    restored = true
    stopFit()
    clip.removeEventListener('cancel', onCancel)
    clip.classList.remove('fs-dim')
    // 先清 inline 几何（含 gsap transform），再撤 top layer——close 后元素回到
    // grid 原槽位（从未搬走，无需插回），占位随后移除
    clip.setAttribute('style', origStyle)
    if (clip.open) clip.close()
    if (ph.isConnected) ph.remove()
    if (active?.clip === clip) active = null
  }

  const shrinkToHome = (registerTl?: (tl: gsap.core.Animation) => void): Promise<void> => {
    // cancel 已收尾（play promise 晚 resolve 等竞态）：不再对已还原的 clip 起动画
    if (restored) return Promise.resolve()
    // 缩窗落点：重量占位 rect（全屏期间页面滚动也能落准 grid 槽位）
    const phRect = ph.getBoundingClientRect()
    // 缩窗动画期间 fit 不得抢写 scale/x/y
    stopFit()
    return new Promise((resolve) => {
      /* 注意：不要 shrink.eventCallback('onComplete', ...) 追加回调——eventCallback 是
       * 替换语义，会顶掉 vars onComplete（2026-08 实锤 bug：clip 永久残留 position:fixed）。 */
      const shrink = gsap.to(clip, {
        xPercent: 0,
        yPercent: 0,
        x: phRect.left,
        y: phRect.top,
        scale: 1,
        duration: 0.6,
        ease: 'power3.inOut',
        onStart: () => { clip.classList.remove('fs-dim') },
        onComplete: () => {
          /* 落点以 close 瞬间的占位实测为准（0.6s 缩窗里列宽/滚动条可能已变，
           * 起点测的 phRect 已过期）。restore() 清 transform + 撤 top layer 回槽位
           * （顺序关键），随后**下一帧**再量 real：close 瞬间列宽处于过渡态
           * （占位↔真实内容高度交叉会让 stage-inner 瞬时变宽/变窄，垂直居中
           * 随之摆动），同帧量到的 real 是瞬态值，会产生假残差 → 收尾滑动
           * （实测 ±19px 抖尾）。延后一帧等布局稳定，残差真存在才补偿。 */
          const target = ph.isConnected ? ph.getBoundingClientRect() : phRect
          restore()
          requestAnimationFrame(() => {
            // 等 rAF 的间隙里被 cancel（切幕/卸载）：会话已取消还原，不得再挂补偿。
            // 注意不能拿 restored 判断——正常完成的 restore 也会置位它。
            if (sessionCancelled) { resolve(); return }
            const real = clip.getBoundingClientRect()
            const dx = target.left - real.left
            const dy = target.top - real.top
            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
              const settle = gsap.fromTo(
                clip,
                { x: dx, y: dy },
                { x: 0, y: 0, duration: 0.18, ease: 'power1.out', clearProps: 'transform' },
              )
              registerTl?.(settle)
              settle.then(() => resolve())
            } else {
              resolve()
            }
          })
        },
      })
      registerTl?.(shrink)
    })
  }

  const cancel = () => {
    sessionCancelled = true
    restore()
  }

  return { clip, baseX: vw / 2, baseY: vh / 2, baseScale: scale, restore, cancel, shrinkToHome }
}

/* ───────────────────────── 形态 1：演出型全屏（Director mode 1） ───────────────────────── */

export async function playClipFullscreen(opts: ClipFullscreenOpts): Promise<void> {
  const { clip, play, isCancelled, registerTl } = opts
  const cancelled = () => isCancelled?.() ?? false
  // 同 clip 会话重入：直接播即可，不重复展开
  if (active) {
    if (active.clip === clip) { await play(); return }
    active.cancel()
  }

  const ctx = promoteClip(clip as HTMLDialogElement, { refit: true })
  active = { clip, cancel: ctx.cancel }

  // demo 在全屏态播放，播完立即缩回
  await play()
  if (cancelled()) return // Director cleanup 已 cancelClipFullscreen 还原，不再 shrink
  await ctx.shrinkToHome(registerTl)
}

/* ───────────────────────── 形态 2：灯箱型全屏（⛶ 手动） ───────────────────────── */

/**
 * 打开 clip 灯箱：全屏自动播放一次后停留；滚轮缩放（光标锚定）、拖动平移；
 * 「✕ 关闭」按钮 / ESC / 点遮罩背景 → 缩窗回到原槽位。
 * 返回的 Promise 在灯箱完全关闭（缩回完成或被 cancel）后 resolve。
 */
export async function openClipLightbox(opts: ClipLightboxOpts): Promise<void> {
  const { clip, play } = opts
  if (active) {
    if (active.clip === clip) return // 已在灯箱中，重入忽略
    active.cancel()
  }

  /* 抓取光标：top layer 之下没有可挂 cursor 的遮罩元素（::backdrop 是伪元素，
   * 点击/指针由 dialog 承接）——光标语义挂 body 类，dialog 全域继承。 */
  document.body.classList.add('clip-lb-live')

  /* 打开瞬间图片可能尚未解码（如 reduced-motion 下无 mode 1 预热、快速切幕），
   * 量到的尺寸会过期——内容就绪前保持自动 refit；用户一旦滚轮/拖动即接管，
   * 自动 fit 永久让位（v11：缩放权在用户）。 */
  let userTookOver = false
  const ctx = promoteClip(clip as HTMLDialogElement, {
    refit: true,
    refitWhile: () => !userTookOver,
  })

  /* 控制条：↻ 重播 + ✕ 关闭 + 底部提示。容器是第二个 <dialog>，在 clip dialog
   * 之后 showModal → 同在 top layer 且画在 clip 之上（页面层任何 z-index 都画
   * 不过 top layer，控制条不能挂 body 裸元素；不能用 popover——实测内嵌引擎
   * 对「dialog 之后提升的 popover」既不绘制框也不参与命中）。容器铺满视口、
   * pointer-events:none——空区域点击穿透到 clip dialog（点遮罩关闭不受影响），
   * 按钮各自 pointer-events:auto。position:fixed 不随 clip 的缩放/平移走。 */
  const ui = document.createElement('dialog')
  ui.className = 'clip-lb-ui'
  const replayBtn = document.createElement('button')
  replayBtn.type = 'button'
  replayBtn.className = 'clip-lb-close clip-lb-replay'
  replayBtn.textContent = '↻ 重播'
  replayBtn.setAttribute('aria-label', '重新播放')
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'clip-lb-close'
  closeBtn.textContent = '✕ 关闭'
  closeBtn.setAttribute('aria-label', '关闭全屏')
  const hint = document.createElement('div')
  hint.className = 'clip-lb-hint'
  hint.textContent = '滚轮缩放 · 拖动平移 · ESC 关闭'
  ui.append(replayBtn, closeBtn, hint)
  document.body.appendChild(ui)
  // ESC 落在最顶层的 ui dialog 上：撤其默认关闭行为，由 requestClose 统一收口
  const onUiCancel = (ev: Event) => ev.preventDefault()
  ui.addEventListener('cancel', onUiCancel)
  ui.showModal()

  /* 缩放/平移状态：gsap transformOrigin 默认元素中心，xPercent/yPercent -50 下
   * 元素中心落在 (px, py)——缩放平移都只改 x/y/scale 三个值。 */
  let px = ctx.baseX
  let py = ctx.baseY
  let s = ctx.baseScale
  const apply = () => gsap.set(clip, { x: px, y: py, scale: s })

  const onWheel = (ev: WheelEvent) => {
    userTookOver = true
    ev.preventDefault()
    const factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15
    const ns = Math.min(5, Math.max(0.5, s * factor))
    if (ns === s) return
    // 光标锚定缩放：光标下的内容点在缩放前后保持不动
    px = ev.clientX - (ev.clientX - px) * (ns / s)
    py = ev.clientY - (ev.clientY - py) * (ns / s)
    s = ns
    apply()
  }

  let dragging = false
  let moved = 0
  let lastX = 0
  let lastY = 0
  /* 拖拽松手后的那一次 click 要吞掉（capture 阶段拦截）——否则 click 会落在
   * demo 内部可点元素上，误触发其 click 行为（如重播） */
  let suppressClick = false
  const onClickCapture = (ev: MouseEvent) => {
    if (!suppressClick) return
    suppressClick = false
    ev.preventDefault()
    ev.stopImmediatePropagation()
  }
  const onPointerDown = (ev: PointerEvent) => {
    // 从按钮上按下（↻ 重看 / ⛶ / ✕）不启动平移
    if ((ev.target as HTMLElement | null)?.closest('button')) return
    userTookOver = true
    dragging = true
    moved = 0
    lastX = ev.clientX
    lastY = ev.clientY
    document.body.classList.add('clip-lb-grabbing')
  }
  const onPointerMove = (ev: PointerEvent) => {
    if (!dragging) return
    const dx = ev.clientX - lastX
    const dy = ev.clientY - lastY
    lastX = ev.clientX
    lastY = ev.clientY
    moved += Math.abs(dx) + Math.abs(dy)
    px += dx
    py += dy
    apply()
  }
  const onPointerUp = (ev: PointerEvent) => {
    if (!dragging) return
    dragging = false
    document.body.classList.remove('clip-lb-grabbing')
    if (moved >= 5) {
      // 是拖拽不是点击：吞掉随之而来的 click
      suppressClick = true
      return
    }
    // 位移 < 5px 视为点击：点在遮罩背景/clip 空白区（非内容元素）→ 关闭灯箱。
    // top layer 下 ::backdrop 的点击以 dialog 元素为 target，判定与旧 overlay 等价。
    if (ev.target === clip) requestClose()
  }
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') requestClose() }

  let resolveDone!: () => void
  const done = new Promise<void>((r) => { resolveDone = r })
  let closing = false

  const teardown = () => {
    document.body.classList.remove('clip-lb-live', 'clip-lb-grabbing')
    window.removeEventListener('wheel', onWheel)
    document.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('click', onClickCapture, true)
    document.removeEventListener('keydown', onKey)
    replayBtn.removeEventListener('click', onReplay)
    closeBtn.removeEventListener('click', requestClose)
    ui.removeEventListener('cancel', onUiCancel)
    ui.close()
    ui.remove()
  }
  const requestClose = () => {
    if (closing) return
    closing = true
    teardown()
    void ctx.shrinkToHome().then(() => resolveDone())
  }
  // 显式重播：从头再播一次（功能与常态 ↻ 重看按钮一致，点击动画本身不重播）
  const onReplay = () => { if (play) void play() }

  replayBtn.addEventListener('click', onReplay)
  closeBtn.addEventListener('click', requestClose)
  window.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('click', onClickCapture, true)
  document.addEventListener('keydown', onKey)

  // cancel 路径（切幕/卸载）：跳过缩窗动画，立即还原
  active = {
    clip,
    cancel: () => {
      teardown()
      ctx.cancel()
      resolveDone()
    },
  }

  // 自动从头播放一次（不 await——播完停留全屏，关闭权交给用户）
  if (play) void play()

  await done
}
