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

/** v7 三原则 2：onFullscreen mock（供断言 mode 1 申请全屏 / 退出全屏的时序） */
function makeFullscreenMock() {
  return vi.fn<(on: boolean) => void>()
}

beforeEach(() => { mockedReduce.value = false })
afterEach(() => { gsap.globalTimeline.clear() })

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

  /* v7 三原则 2：全屏申请改走 onFullscreen 回调（Answer 落 data-fullscreen 属性），
   * mode 1 挂载即同步调 onFullscreen(true)。 */
  it('mode 1：挂载即调 onFullscreen(true)，建出缩窗 timeline（scale 1.4 → 1）', () => {
    // mode 1 需要 demo API（scene.demo='message-flood' 注册过）——这里走最简：让 getSceneClipApi 返回 undefined
    // → playDemo 立即 resolve；缩窗 tween 应仍被建出。
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()

    const scene: DirectorScene = { id: 'q-m1', mode: 1, demo: 'demo-not-registered' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onFullscreen={onFullscreen}>
        <span>x</span>
      </Director>,
    )
    // 挂载即申请全屏（layout 阶段同步——React paint 前 flush，首帧即全屏）
    expect(onFullscreen.mock.calls).toEqual([[true]])
    // mode 1 应至少建出 timeline（缩窗 / act-head / dialogue / choices 任一进 globalTimeline）
    expect(gsap.globalTimeline.getChildren(true, true, true).length).toBeGreaterThan(0)
  })

  /* v7 三原则 2：mode 3 纯文字，从不申请全屏（onFullscreen 从不调用）。 */
  it('mode 3 不申请全屏（onFullscreen 从不调用，直走文字演出）', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()

    const scene: DirectorScene = { id: 'q-m3', mode: 3, demo: '' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onFullscreen={onFullscreen}>
        <span>x</span>
      </Director>,
    )
    expect(onFullscreen).not.toHaveBeenCalled()
  })

  /* v6 review fix：mode 1 + demo 为空（纯文字全屏幕，理论上由 mode 3 承载，
   * 但防御性地保证 mode 1 不因空 demo 卡在 waitForApi 轮询）——
   * 演出应正常走缩窗，不额外等待 demo（globalTimeline 有缩窗 tween，不长期挂起）。 */
  /* v6 review fix：缩窗时序（方案 A）——全程 fixed，缩到 1 后回调退出全屏 + 清 transform。
   * v7 三原则 2：全屏状态机改走 onFullscreen 回调（真 → false 结束）。 */
  it('mode 1 缩窗完成后调 onFullscreen(false) 并清内联 transform', async () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()
    // demo 空：playDemo 立即 resolve（v6 空 demo 短路），缩窗 tween 照常建
    const scene: DirectorScene = { id: 'q-m1-shrink', mode: 1, demo: '' }
    const { unmount } = render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onFullscreen={onFullscreen}>
        <span>x</span>
      </Director>,
    )
    // 挂载即全屏（mode 1 语义）
    expect(onFullscreen.mock.calls).toEqual([[true]])
    // 等演出推进（缩窗 tween 完成 + 回调退出全屏 + 清 transform）
    await vi.waitFor(() => {
      expect(onFullscreen.mock.calls).toEqual([[true], [false]])
    })
    // 内联 transform 已清（clearProps 后 style.transform 应为空）
    const stageEl = stage.current!
    expect(stageEl.style.transform).toBe('')
    expect(stageEl.style.transformOrigin).toBe('')
    unmount()
  })

  /* v7 三原则 2：空 demo 短路下 onFullscreen(true) 仍照常申请（mode 1 语义不变）。 */
  it('mode 1 + 空 demo：直接缩窗，不卡 demo 等待（waitForApi 短路）', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()

    const scene: DirectorScene = { id: 'q-m1-empty', mode: 1, demo: '' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage} onFullscreen={onFullscreen}>
        <span>x</span>
      </Director>,
    )
    // 挂载即申请全屏（mode 1 语义照常）
    expect(onFullscreen.mock.calls).toEqual([[true]])
    // 演出正常推进：缩窗 tween 应被建出（playDemo 因空 demo 立即 resolve，
    // 不等 15s 超时）——全局 timeline 有子节点即证明演出没被空转卡住
    expect(gsap.globalTimeline.getChildren(true, true, true).length).toBeGreaterThan(0)
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

    // skip 不应炸（mode 2 未申请过全屏，onFullscreen 未提供 → no-op）
    expect(() => api.skip()).not.toThrow()

    // unmount 后所有 timeline 应被 kill（globalTimeline.getChildren 应减少或清空）
    const before = gsap.globalTimeline.getChildren(true, true, true).length
    unmount()
    const after = gsap.globalTimeline.getChildren(true, true, true).length
    expect(after).toBeLessThanOrEqual(before)
  })

  /* v7 三原则 2：skip 经 onFullscreen(false) 申请退出全屏。 */
  it('skip 调 onFullscreen(false) 退出全屏', async () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()

    const scene: DirectorScene = { id: 'q-skip', mode: 1, demo: 'demo-not-registered' }
    const onReady = vi.fn()
    render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
        onFullscreen={onFullscreen}
        onReady={onReady}
      >
        <span>x</span>
      </Director>,
    )
    // 挂载即申请全屏
    expect(onFullscreen.mock.calls).toEqual([[true]])
    const api = onReady.mock.calls[0][0] as { skip(): void }
    api.skip()
    expect(onFullscreen.mock.calls).toEqual([[true], [false]])
  })

  /* v7 三原则 2：unmount cleanup 同样经 onFullscreen(false) 申请退出——
   * 快速切幕时不能把 data-fullscreen 状态留在 Answer 的 section 上。 */
  it('unmount cleanup 调 onFullscreen(false)（快速切幕不残留全屏）', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()

    const scene: DirectorScene = { id: 'q-unmount-full', mode: 1, demo: '' }
    const { unmount } = render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
        onFullscreen={onFullscreen}
      >
        <span>x</span>
      </Director>,
    )
    expect(onFullscreen.mock.calls).toEqual([[true]])
    unmount()
    expect(onFullscreen.mock.calls).toEqual([[true], [false]])
  })

  /* v7 三原则 2：reduced-motion 早 return，从不申请全屏。 */
  it('reduced-motion 下 onFullscreen 从不调用', () => {
    mockedReduce.value = true
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    const onFullscreen = makeFullscreenMock()

    const scene: DirectorScene = { id: 'q-reduced-fs', mode: 1, demo: 'demo-not-registered' }
    render(
      <Director
        scene={scene}
        headRef={head}
        dlgRef={dlg}
        choicesRef={choices}
        stageRef={stage}
        onFullscreen={onFullscreen}
      >
        <span>x</span>
      </Director>,
    )
    expect(onFullscreen).not.toHaveBeenCalled()
  })

  /* C2+I1 fix round：
   * - 演出开始前 SSR 直出的「终态」按「揭示单元」粒度隐藏（gsap.set opacity 0），
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
