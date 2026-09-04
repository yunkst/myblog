import gsap from 'gsap'

/**
 * clip 全屏机制（v10 抽离 / v11 拆两种形态）。
 *
 * 两种形态共用同一套 expand/shrink 机制（2026-08-31 reparent + placeholder 方案：
 * 量 rect → 插占位 → clip reparent 到 body 根 → fixed 居中 set 第一帧即终态；
 * 缩回时重量占位 rect 落点 → 还原 style/槽位 → FLIP 残差补偿滑零）：
 *
 * - playClipFullscreen（演出型）：Director mode 1 用——全屏自动播 demo，播完
 *   立即缩回原位，演出链继续走文字。
 * - openClipLightbox（灯箱型，v11 用户裁定）：SceneClip ⛶ 按钮用——全屏从头
 *   播放后**停留不缩回**；滚轮缩放（光标锚定）+ 拖动平移；右上角「✕ 关闭」/
 *   ESC / 点遮罩背景触发缩回原位。
 *
 * 会话管理：模块级单会话。cancelClipFullscreen 供外部路径调用——
 * - Director 的 effect cleanup（切幕/卸载中途收尾）
 * - SceneClip 卸载（灯箱打开中组件被 React 移除前还原 DOM，保证 removeChild 能找到节点）
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

/* ───────────────────────── 共用 expand/shrink 机制 ───────────────────────── */

interface ExpandCtx {
  clip: HTMLElement
  overlay: HTMLDivElement
  baseX: number
  baseY: number
  baseScale: number
  /** 立即还原（摘镜像 class + 还原 style + 插回占位 + 撤遮罩），幂等 */
  restore: () => void
  /** 缩窗动画落回原槽位（含 FLIP 残差补偿），完成后内部调 restore */
  shrinkToHome: (registerTl?: (tl: gsap.core.Animation) => void) => Promise<void>
}

const OVERLAY_BASE_CSS =
  'position:fixed;inset:0;background:var(--panel, #101010);z-index:5000;opacity:0;transition:opacity 0.3s ease;'

function expandClip(clip: HTMLElement, overlayExtraCss: string): ExpandCtx {
  // 量 demo rect（grid 原态，未放大）
  const clipRect = clip.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  // scale：让 demo 在视口里居中铺开（保 aspect，5% 边距）
  const scale = Math.min(vw / clipRect.width, vh / clipRect.height) * 0.95

  const origStyle = clip.getAttribute('style') ?? ''
  const origParent = clip.parentElement!
  // 占位元素：撑住 grid 槽位（clip 脱离后容器不塌），缩窗时作落点标尺
  const ph = document.createElement('div')
  ph.className = 'mode1-placeholder'
  ph.style.cssText = `width:${clipRect.width}px;height:${clipRect.height}px;visibility:hidden;pointer-events:none`
  origParent.insertBefore(ph, clip)

  // 覆盖层 + clip 都挂到 body 根（reparent 是治「祖先 stacking context 盖黑幕」的关键）
  const overlay = document.createElement('div')
  overlay.className = 'mode1-overlay'
  overlay.style.cssText = OVERLAY_BASE_CSS + overlayExtraCss
  document.body.appendChild(overlay)
  document.body.appendChild(clip)
  /* 归属变化护栏：reparent 后 .stage-frame .stage .scene-clip 选择器不再匹配，
   * clip 会回落到 v2 基线样式——挂镜像 class + 内联宽度，让全屏期渲染与还原后一致。 */
  clip.classList.add('scene-clip--fs')
  clip.style.width = `${clipRect.width}px`
  clip.style.position = 'fixed'
  clip.style.left = '0'
  clip.style.top = '0'
  clip.style.zIndex = '5001'

  // 第一帧即居中终态——reparent + fixed + 居中 set 在同一同步任务内完成，无中间帧
  gsap.set(clip, { xPercent: -50, yPercent: -50, x: vw / 2, y: vh / 2, scale })
  overlay.style.opacity = '1'

  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    clip.classList.remove('scene-clip--fs')
    clip.setAttribute('style', origStyle)
    if (ph.isConnected) origParent.insertBefore(clip, ph)
    ph.remove()
    overlay.remove()
    if (active?.clip === clip) active = null
  }

  const shrinkToHome = (registerTl?: (tl: gsap.core.Animation) => void): Promise<void> => {
    // 缩窗落点：重量占位 rect（全屏期间页面滚动也能落准 grid 槽位）
    const phRect = ph.getBoundingClientRect()
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
        onStart: () => { overlay.style.opacity = '0' },
        onComplete: () => {
          /* FLIP 收尾补偿：先 restore 再量真实静态 rect（顺序关键），残差用
           * 同帧反向 transform 对齐 + 0.18s 滑零——「跳变」变「滑入」。 */
          restore()
          const real = clip.getBoundingClientRect()
          const dx = phRect.left - real.left
          const dy = phRect.top - real.top
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            const settle = gsap.fromTo(
              clip,
              { x: dx, y: dy },
              { x: 0, y: 0, duration: 0.18, ease: 'power1.out', clearProps: 'transform' },
            )
            registerTl?.(settle)
          }
          resolve()
        },
      })
      registerTl?.(shrink)
    })
  }

  return { clip, overlay, baseX: vw / 2, baseY: vh / 2, baseScale: scale, restore, shrinkToHome }
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

  const ctx = expandClip(clip, 'pointer-events:none;')
  active = { clip, cancel: ctx.restore }

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

  const ctx = expandClip(clip, 'pointer-events:auto;cursor:grab;')

  /* 右上角控制条：↻ 重播 + ✕ 关闭（body 子级，z-index 高于 clip 的 5001，
   * 不随 clip 缩放——clip 内的 ⛶/↻ 按钮在全屏态经 CSS 隐藏，避免被放大后
   * 盖住画面、拖拽松手的 click 误触重播） */
  const replayBtn = document.createElement('button')
  replayBtn.type = 'button'
  replayBtn.className = 'clip-lb-close clip-lb-replay'
  replayBtn.textContent = '↻ 重播'
  replayBtn.setAttribute('aria-label', '重新播放')
  document.body.appendChild(replayBtn)
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'clip-lb-close'
  closeBtn.textContent = '✕ 关闭'
  closeBtn.setAttribute('aria-label', '关闭全屏')
  document.body.appendChild(closeBtn)
  const hint = document.createElement('div')
  hint.className = 'clip-lb-hint'
  hint.textContent = '滚轮缩放 · 拖动平移 · ESC 关闭'
  document.body.appendChild(hint)

  /* 缩放/平移状态：gsap transformOrigin 默认元素中心，xPercent/yPercent -50 下
   * 元素中心落在 (px, py)——缩放平移都只改 x/y/scale 三个值。 */
  let px = ctx.baseX
  let py = ctx.baseY
  let s = ctx.baseScale
  const apply = () => gsap.set(clip, { x: px, y: py, scale: s })

  const onWheel = (ev: WheelEvent) => {
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
    dragging = true
    moved = 0
    lastX = ev.clientX
    lastY = ev.clientY
    ctx.overlay.style.cursor = 'grabbing'
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
    ctx.overlay.style.cursor = 'grab'
    if (moved >= 5) {
      // 是拖拽不是点击：吞掉随之而来的 click
      suppressClick = true
      return
    }
    // 位移 < 5px 视为点击：点在遮罩背景上（非 clip 内容）→ 关闭灯箱
    if (ev.target === ctx.overlay) requestClose()
  }
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') requestClose() }

  let resolveDone!: () => void
  const done = new Promise<void>((r) => { resolveDone = r })
  let closing = false

  const teardown = () => {
    window.removeEventListener('wheel', onWheel)
    document.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('click', onClickCapture, true)
    document.removeEventListener('keydown', onKey)
    replayBtn.removeEventListener('click', onReplay)
    replayBtn.remove()
    closeBtn.removeEventListener('click', requestClose)
    closeBtn.remove()
    hint.remove()
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
      ctx.restore()
      resolveDone()
    },
  }

  // 自动从头播放一次（不 await——播完停留全屏，关闭权交给用户）
  if (play) void play()

  await done
}
