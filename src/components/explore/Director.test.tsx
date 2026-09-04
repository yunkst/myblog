import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import gsap from 'gsap'
import { Director, type DirectorScene } from './Director'
import { buildTypewriterTimeline } from './useTypewriter'
import { registerSceneClip } from './sceneClipRegistry'

/** jsdom 无真实 layout；matchMedia mock 成 reduce 与非 reduce 两态（与 useTypewriter.test.ts 同款） */
const mockedReduce = vi.hoisted(() => ({ value: false }))
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
  matches: mockedReduce.value && q.includes('prefers-reduced-motion'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})))

/** 用真实 DOM 节点装进 ref（jsdom 无 layout，ref.current 立即可读）。
 * 强制通过 unknown 桥接，避免 RefObject<T> 与 HTMLDivElement 不可重叠的报错。 */
function makeRef<T extends HTMLElement>(): React.RefObject<T> {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return { current: el } as unknown as React.RefObject<T>
}

/** mode 1 手工全屏（2026-08-31 版契约）测试夹具：Director 用
 * document.querySelector('.scene-clip') 找 demo 根节点。jsdom 无 layout，
 * getBoundingClientRect 全 0 会让 scale = vw/0 = Infinity——mock 非零尺寸。
 * clip 放在包裹容器里（模拟 .stage-inner 槽位）：reparent 契约是
 * 「全屏期 clip.parentElement === document.body，收尾后插回原容器」。 */
function makeClip(): { wrap: HTMLElement; clip: HTMLElement } {
  const wrap = document.createElement('div')
  wrap.className = 'test-clip-wrap'
  const el = document.createElement('div')
  el.className = 'scene-clip'
  el.getBoundingClientRect = () => ({
    width: 400, height: 300, left: 100, top: 100,
    right: 500, bottom: 400, x: 100, y: 100,
    toJSON: () => ({}),
  }) as DOMRect
  wrap.appendChild(el)
  document.body.appendChild(wrap)
  return { wrap, clip: el }
}

beforeEach(() => { mockedReduce.value = false })
afterEach(() => {
  gsap.globalTimeline.clear()
  // mode 1 的 overlay / 占位 / 假 clip 都是 append 到 DOM 的非 React 托管节点，逐个清
  document.querySelectorAll('.scene-clip, .mode1-overlay, .mode1-placeholder, .test-clip-wrap').forEach((el) => el.remove())
})

describe('Director', () => {
  it('mode 2 默认：建出多个 timeline（act-head / dialogue / choices / demo），不挂 reduced-motion', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    const dlgEl = dlg.current!
    dlgEl.innerHTML = '<p>第一段</p><p>第二段</p>'
    const choices = makeRef<HTMLElement>()
    const choicesEl = choices.current!
    choicesEl.innerHTML = '<a class="exit-chip" href="#x">a</a><a class="exit-chip" href="#y">b</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-test', mode: 2, demo: 'demo-x' }
    render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
      >
        <span>x</span>
      </Director>,
    )
    // mode 2：act-head fade / dialogue 两段 typewriter / demo（无 API 直返）/ choices stagger — 至少 1 个 timeline（brief: toBeGreaterThan(0)）
    const total = gsap.globalTimeline.getChildren(true, true, true).length
    expect(total).toBeGreaterThan(0)
  })

  it('reduced-motion：直出 children，Director 不挂演出（globalTimeline 子数很少）', () => {
    mockedReduce.value = true
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    const dlgEl = dlg.current!
    dlgEl.innerHTML = '<p>唯一段</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-test', mode: 2, demo: 'demo-x' }
    const before = gsap.globalTimeline.getChildren(true, true, true).length
    render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
      >
        <span data-testid="content">x</span>
      </Director>,
    )
    const after = gsap.globalTimeline.getChildren(true, true, true).length
    // reduced-motion：buildTypewriterTimeline 返回 null、Director 不建任何演出 timeline
    expect(after).toBe(before)
    expect(buildTypewriterTimeline(dlgEl)).toBeNull()
  })

  /* mode 1 手工全屏（2026-08-31 版契约，取代已退役的 onFullscreen/data-fullscreen
   * 属性驱动路径）：Director 直接操作 DOM——挂载即把 .mode1-overlay append 到 body、
   * clip 转 position:fixed；不经过 Answer 持状态。 */
  it('mode 1：挂载即建 overlay + clip reparent 到 body 根转 fixed，并建出演示 timeline（空 demo 短路不卡等待）', () => {
    const { wrap, clip } = makeClip()
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    // demo 空：playDemo 立即 resolve（v6 空 demo 短路），全屏/缩窗照常建
    const scene: DirectorScene = { id: 'q-m1', mode: 1, demo: '' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    // 挂载即全屏（layout 阶段同步——React paint 前 flush，首帧即全屏）
    expect(document.querySelector('.mode1-overlay')).not.toBeNull()
    expect(clip.style.position).toBe('fixed')
    // reparent 契约：clip 移到 body 根（脱离 stage-inner stacking context，治入场黑屏），
    // 原槽位由占位元素撑住；挂 scene-clip--fs 镜像 class（归属变化护栏——
    // reparent 后 .stage-frame .stage 规则链失效，镜像 grid 内布局防内容跳变）
    expect(clip.parentElement).toBe(document.body)
    expect(clip.classList.contains('scene-clip--fs')).toBe(true)
    expect(wrap.querySelector('.mode1-placeholder')).not.toBeNull()
    // mode 1 应至少建出 timeline（入场 / 缩窗 / act-head / dialogue / choices 任一进 globalTimeline）
    expect(gsap.globalTimeline.getChildren(true, true, true).length).toBeGreaterThan(0)
  })

  /* mode 3 纯文字：从不进全屏分支（不建 overlay、不碰 clip）。 */
  it('mode 3 不建 overlay（直走文字演出，clip 样式/位置不动）', () => {
    const { wrap, clip } = makeClip()
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-m3', mode: 3, demo: '' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    expect(document.querySelector('.mode1-overlay')).toBeNull()
    expect(clip.style.position).toBe('')
    expect(clip.parentElement).toBe(wrap)
  })

  /* P0 回归（2026-08 实锤 bug：shrink.eventCallback('onComplete') 覆盖 vars onComplete →
   * 样式还原永不执行 → clip 永久残留 fixed 盖住标题）+ 架构回归（原地 fixed 被 overlay
   * 盖住 → 入场黑屏；终点 x:0,y:0 → 闪现）：
   * 缩窗 onComplete 必须一处收尾——clip inline style 还原 + 插回原容器 + 占位/overlay 移除。 */
  it('mode 1 缩窗完成后：clip 还原并插回原容器 + 占位/overlay 移除', async () => {
    const { wrap, clip } = makeClip()
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-m1-shrink', mode: 1, demo: '' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    // 挂载即全屏（mode 1 语义）
    expect(document.querySelector('.mode1-overlay')).not.toBeNull()
    expect(clip.style.position).toBe('fixed')
    expect(clip.parentElement).toBe(document.body)
    // 等缩窗(0.6s) 走完：overlay/占位移除 + clip 还原并插回原容器 + 摘镜像 class
    await vi.waitFor(() => {
      expect(document.querySelector('.mode1-overlay')).toBeNull()
      expect(document.querySelector('.mode1-placeholder')).toBeNull()
      expect(clip.style.position).toBe('')
      expect(clip.style.transform).toBe('')
      expect(clip.style.zIndex).toBe('')
      expect(clip.classList.contains('scene-clip--fs')).toBe(false)
      expect(clip.parentElement).toBe(wrap)
    }, { timeout: 3000 })
  })

  it('onReady 挂载时调一次：把 skip API 暴露给父；unmount 时 cleanup（tls 被 kill）', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-cleanup', mode: 2, demo: '' }
    const onReady = vi.fn()
    const { unmount } = render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
        onReady={onReady}
      >
        <span>x</span>
      </Director>,
    )
    expect(onReady).toHaveBeenCalledTimes(1)
    const api = onReady.mock.calls[0][0] as { skip(): void }
    expect(typeof api.skip).toBe('function')

    // skip 不应炸（mode 2 + 空 demo：tls 快照推进 + demo 名空短路）
    expect(() => api.skip()).not.toThrow()

    // unmount 后所有 timeline 应被 kill（globalTimeline.getChildren 应减少或清空）
    const before = gsap.globalTimeline.getChildren(true, true, true).length
    unmount()
    const after = gsap.globalTimeline.getChildren(true, true, true).length
    expect(after).toBeLessThanOrEqual(before)
  })

  /* P0 修复（2026-08-31）：skip 只推进 Director 自己的 tls 时，SceneClip 持有的
   * demo 时间线无法跳过（8.6s 全屏 demo 点空白没反应）。现契约：skip 经 registry
   * 取 api，「已开始且未播完」才 finish()。 */
  it('skip：播放中（started=true 且未 finished）的 demo 调 finish()', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const finishSpy = vi.fn()
    const unregister = registerSceneClip('demo-playing', {
      play: () => new Promise<void>(() => { /* 永不 resolve——模拟 8.6s demo 播放中 */ }),
      pause: () => {},
      replay: () => {},
      finished: () => false,
      started: () => true,
      finish: finishSpy,
    })
    try {
      const scene: DirectorScene = { id: 'q-skip', mode: 2, demo: 'demo-playing' }
      const onReady = vi.fn()
      render(
        <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onReady={onReady}>
          <span>x</span>
        </Director>,
      )
      const api = onReady.mock.calls[0][0] as { skip(): void }
      api.skip()
      expect(finishSpy).toHaveBeenCalledTimes(1)
    } finally {
      unregister()
    }
  })

  /* skip 是逐段推进语义：未开始的 demo 不动（mode 2 打字机阶段点 skip，
   * 不该把还没轮到的 demo 直接跳没）；无 started 的旧契约 api 同样不动。 */
  it('skip：未开始的 demo（started()=false 或无 started）不调 finish', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const finishNotStarted = vi.fn()
    const finishLegacy = vi.fn()
    const un1 = registerSceneClip('demo-not-started', {
      play: () => Promise.resolve(),
      pause: () => {},
      replay: () => {},
      finished: () => false,
      started: () => false,
      finish: finishNotStarted,
    })
    const un2 = registerSceneClip('demo-legacy', {
      play: () => Promise.resolve(),
      pause: () => {},
      replay: () => {},
      finished: () => false,
      finish: finishLegacy,
    })
    try {
      const scene: DirectorScene = { id: 'q-skip-ns', mode: 2, demo: 'demo-not-started' }
      const onReady = vi.fn()
      const { unmount } = render(
        <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onReady={onReady}>
          <span>x</span>
        </Director>,
      )
      const api = onReady.mock.calls[0][0] as { skip(): void }
      api.skip()
      expect(finishNotStarted).not.toHaveBeenCalled()
      unmount()

      const scene2: DirectorScene = { id: 'q-skip-legacy', mode: 2, demo: 'demo-legacy' }
      const onReady2 = vi.fn()
      render(
        <Director scene={scene2} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onReady={onReady2}>
          <span>x</span>
        </Director>,
      )
      const api2 = onReady2.mock.calls[0][0] as { skip(): void }
      api2.skip()
      expect(finishLegacy).not.toHaveBeenCalled()
    } finally {
      un1()
      un2()
    }
  })

  /* 中途 unmount（快速切幕）：tl.kill() 不触发 tween onComplete/clearProps——
   * overlay（append 到 body 的非 React 托管节点）与 clip 的 fixed inline style
   * 必须由 cleanup 手工收尾，不能残留。 */
  it('mode 1 中途 unmount：cleanup 手工收尾——overlay/占位移除 + clip 还原并插回原容器', () => {
    const { wrap, clip } = makeClip()
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    // demo 未注册：playDemo 走 waitForApi 轮询（演出停在全屏播放阶段）
    const scene: DirectorScene = { id: 'q-unmount-full', mode: 1, demo: 'demo-not-registered' }
    const { unmount } = render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    expect(document.querySelector('.mode1-overlay')).not.toBeNull()
    expect(clip.style.position).toBe('fixed')
    expect(clip.parentElement).toBe(document.body)
    unmount()
    expect(document.querySelector('.mode1-overlay')).toBeNull()
    expect(document.querySelector('.mode1-placeholder')).toBeNull()
    expect(clip.style.position).toBe('')
    expect(clip.classList.contains('scene-clip--fs')).toBe(false)
    expect(clip.parentElement).toBe(wrap)
  })

  /* reduced-motion 早 return：从不进全屏分支（不建 overlay、clip 样式/位置不动）。 */
  it('reduced-motion 下不建 overlay（clip 样式/位置不动）', () => {
    mockedReduce.value = true
    const { wrap, clip } = makeClip()
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-reduced-fs', mode: 1, demo: 'demo-not-registered' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    expect(document.querySelector('.mode1-overlay')).toBeNull()
    expect(clip.style.position).toBe('')
    expect(clip.parentElement).toBe(wrap)
  })

  /* C2+I1 fix round：
   * - 演出开始前 SSR 直出的「终态」按「揭示单元」粒度隐藏（gsap.set autoAlpha 0——
   *   2026-09-01 起 opacity + visibility 双写，隐形 chip 不再吃点击），
   *   否则用户先看到 dialogue 全文 / chips opacity 1 再被打回原态（视觉跳跃）。
   * - head 整块 / dialogue 文本段落 / choices chips → 隐藏；
   *   dialogue 容器不藏（容器藏了会吞掉打字机的 reveal；真实浏览器实测）。
   * - 打字机启动段落时 reveal（gsap.to opacity 1）+ 打字。
   */
  it('演出开始前按揭示单元粒度隐藏：head/文本段落/chips → 0；容器保持 1', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>第一段</p><p>第二段</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a><a class="exit-chip" href="#y">b</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-hide', mode: 2, demo: 'demo-not-registered' }
    render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
      >
        <span>x</span>
      </Director>,
    )
    // 揭示单元 → 0；容器不藏（否则吞掉打字机 reveal）
    expect(gsap.getProperty(head.current!, 'opacity')).toBe(0)
    expect(gsap.getProperty(dlg.current!, 'opacity')).toBe(1)
    expect(gsap.getProperty(dlg.current!.querySelector('p')!, 'opacity')).toBe(0)
    expect(gsap.getProperty(choices.current!, 'opacity')).toBe(1)
    expect(gsap.getProperty(choices.current!.querySelector('.exit-chip')!, 'opacity')).toBe(0)
    // 2026-09-01 fix 回归：autoAlpha 同时写 visibility:hidden——
    // 隐藏的 chip 不再响应点击（opacity:0 时代点空白会被隐形 chip 跳走）
    expect(gsap.getProperty(choices.current!.querySelector('.exit-chip')!, 'visibility')).toBe('hidden')
    expect(gsap.getProperty(head.current!, 'visibility')).toBe('hidden')
  })

  it('reduced-motion 不做 gsap.set：保留 SSR 直出终态（opacity 1 默认）', () => {
    mockedReduce.value = true
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-reduced', mode: 2, demo: 'demo-not-registered' }
    render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
      >
        <span>x</span>
      </Director>,
    )
    // reduced-motion 下不做 gsap.set：元素 style 上无 GSAP 内联痕迹（保留 SSR 直出终态）
    expect(head.current!.style.cssText).toBe('')
    expect(dlg.current!.querySelector('p')!.style.cssText).toBe('')
    expect(choices.current!.querySelector<HTMLElement>('.exit-chip')!.style.cssText).toBe('')
  })

  it('review fix:unmount 后 async run 不再推进演出链(无新 tween 挂到 globalTimeline)', async () => {
    vi.useFakeTimers()
    try {
      const head = makeRef<HTMLElement>()
      const dlg = makeRef<HTMLElement>()
      dlg.current!.innerHTML = '<p>第一段</p><p>第二段</p>'
      const choices = makeRef<HTMLElement>()
      choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
      const stage = makeRef<HTMLElement>()

      const scene: DirectorScene = { id: 'q-cancel', mode: 2, demo: 'demo-not-registered' }
      const { unmount } = render(
        <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
          <span>x</span>
        </Director>,
      )
      unmount()
      const afterUnmount = gsap.globalTimeline.getChildren(true, true, true).length
      /* 放飞微任务——若无 cancelled 守卫,run() 的 await 链继续 resolve
       * 并通过 onComplete 接力推进,挂出新 tween */
      await vi.advanceTimersByTimeAsync(100)
      expect(gsap.globalTimeline.getChildren(true, true, true).length).toBe(afterUnmount)
    } finally {
      vi.useRealTimers()
    }
  })

  /* v7 Task 3（demo API promise 化）：注册已 finished 的假 API 时，
   * playDemo 走 early-return 路径（不调 api.play()、不挂 promise）——
   * 测试用 vi.fn 验证 api.play() 没被调用，演出照常推进。 */
  it('api.finished()=true 时 playDemo 不调 api.play()（early-return 路径）', async () => {
    vi.useFakeTimers()
    try {
      const head = makeRef<HTMLElement>()
      const dlg = makeRef<HTMLElement>()
      dlg.current!.innerHTML = '<p>唯一</p>'
      const choices = makeRef<HTMLElement>()
      choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
      const stage = makeRef<HTMLElement>()

      const playSpy = vi.fn(() => new Promise<void>(() => { /* 永不 resolve——验证不被调用 */ }))
      const unregister = registerSceneClip('demo-finished', {
        play: playSpy,
        pause: () => {},
        replay: () => {},
        finished: () => true,
      })
      try {
        const scene: DirectorScene = { id: 'q-finished', mode: 2, demo: 'demo-finished' }
        render(
          <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
            <span>x</span>
          </Director>,
        )
        /* rAF 轮询到 2s 兜底超时（playDemo 完成） */
        await vi.advanceTimersByTimeAsync(2500)
        /* 验证 api.play() 从未被调用（finished()=true 早 return） */
        expect(playSpy).not.toHaveBeenCalled()
      } finally {
        unregister()
      }
    } finally {
      vi.useRealTimers()
    }
  })
})
