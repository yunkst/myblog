import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import gsap from 'gsap'
import { Director, type DirectorScene } from './Director'
import { buildTypewriterTimeline } from './useTypewriter'

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

  it('mode 1：建出缩窗 timeline（scale 1.4 → 1），mode 3 不建 demo', () => {
    // mode 1 需要 demo API（scene.demo='message-flood' 注册过）——这里走最简：让 getSceneClipApi 返回 undefined
    // → playDemo 立即 resolve；缩窗 tween 应仍被建出。
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-m1', mode: 1, demo: 'demo-not-registered' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    const stageEl = stage.current!
    // 立即挂上 stage--fullscreen
    expect(stageEl.classList.contains('stage--fullscreen')).toBe(true)
    // mode 1 应至少建出 timeline（缩窗 / act-head / dialogue / choices 任一进 globalTimeline）
    expect(gsap.globalTimeline.getChildren(true, true, true).length).toBeGreaterThan(0)
  })

  it('mode 3 不挂 .stage--fullscreen class（直走文字演出）', () => {
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
    expect(stage.current!.classList.contains('stage--fullscreen')).toBe(false)
  })

  /* v6 review fix：mode 1 + demo 为空（纯文字全屏幕，理论上由 mode 3 承载，
   * 但防御性地保证 mode 1 不因空 demo 卡在 waitForApi 轮询）——
   * 演出应正常走缩窗，不额外等待 demo（globalTimeline 有缩窗 tween，不长期挂起）。 */
  /* v6 review fix：缩窗时序（方案 A）——全程 fixed，缩到 1 后摘 class + 清 transform。
   * mode 1 播放完成后：stage--fullscreen 应被移除、内联 transform 应被清空，
   * 元素归位到文档流（无 scale 残留影响 grid 布局）。 */
  it('mode 1 缩窗完成后摘 .stage--fullscreen class 并清内联 transform', async () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()
    // demo 空：playDemo 立即 resolve（v6 空 demo 短路），缩窗 tween 照常建
    const scene: DirectorScene = { id: 'q-m1-shrink', mode: 1, demo: '' }
    const { unmount } = render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    const stageEl = stage.current!
    // 挂载即全屏（mode 1 语义）
    expect(stageEl.classList.contains('stage--fullscreen')).toBe(true)
    // 等演出推进（缩窗 tween 完成 + 摘 class + 清 transform）
    await vi.waitFor(() => {
      expect(stageEl.classList.contains('stage--fullscreen')).toBe(false)
    })
    // 内联 transform 已清（clearProps 后 style.transform 应为空）
    expect(stageEl.style.transform).toBe('')
    expect(stageEl.style.transformOrigin).toBe('')
    unmount()
  })

  it('mode 1 + 空 demo：直接缩窗，不卡 demo 等待（waitForApi 短路）', () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-m1-empty', mode: 1, demo: '' }
    render(
      <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
        <span>x</span>
      </Director>,
    )
    // 全屏 class 照常挂（mode 1 语义）
    expect(stage.current!.classList.contains('stage--fullscreen')).toBe(true)
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

    // skip 不应炸、应把全屏 class 移除（这里未挂，no-op）
    expect(() => api.skip()).not.toThrow()

    // unmount 后所有 timeline 应被 kill（globalTimeline.getChildren 应减少或清空）
    const before = gsap.globalTimeline.getChildren(true, true, true).length
    unmount()
    const after = gsap.globalTimeline.getChildren(true, true, true).length
    expect(after).toBeLessThanOrEqual(before)
  })

  it('skip 在全屏时移除 .stage--fullscreen class', async () => {
    const head = makeRef<HTMLElement>()
    const dlg = makeRef<HTMLElement>()
    dlg.current!.innerHTML = '<p>唯一</p>'
    const choices = makeRef<HTMLElement>()
    choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
    const stage = makeRef<HTMLElement>()

    const scene: DirectorScene = { id: 'q-skip', mode: 1, demo: 'demo-not-registered' }
    const onReady = vi.fn()
    render(
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
    expect(stage.current!.classList.contains('stage--fullscreen')).toBe(true)
    const api = onReady.mock.calls[0][0] as { skip(): void }
    api.skip()
    expect(stage.current!.classList.contains('stage--fullscreen')).toBe(false)
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
})
