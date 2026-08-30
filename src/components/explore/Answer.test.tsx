import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import gsap from 'gsap'
import Answer, { ExploreConfigContext } from './Answer'
import { ExploreRuntimeContext } from './AnswerContext'
import SceneClip, { setCurrentSlug } from './SceneClip'
import { registerSceneClip } from './sceneClipRegistry'
import { parseExploreYaml } from '../../lib/explore'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [{
    id: 'q-a', label: 'A', demo: 'd',
    features: [{ text: '看 B', to: 'q-b' }],
    questions: [{ text: '跨文章', to: { post: 'other', scene: 'entry' } }],
  }, { id: 'q-b', label: 'B', demo: 'd' }],
}

describe('Answer（v5 scene/body props）', () => {
  it('渲染为带 id 的 theater+answer-block 双类名，子内容可见', () => {
    const cfg: ExploreConfig = {
      title: 't', entry: 'q-problem',
      scenes: [{ id: 'q-problem', label: '问题', demo: 'd' }],
    }
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<p>正文段落</p>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const block = document.getElementById('q-problem')
    expect(block).not.toBeNull()
    // 双类名约定：v3 引入 .theater，保留 .answer-block 作过渡别名
    expect(block?.className).toContain('theater')
    expect(block?.className).toContain('answer-block')
    expect(screen.getByText('正文段落')).toBeInTheDocument()
  })

  it('Context 提供 config 时，按 scene 自动渲染 features + questions 两组 chips', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer scene={config.scenes[0]} body={<p>正文</p>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const block = document.getElementById('q-a')
    expect(block?.querySelectorAll('.exit-chips-features .exit-chip')).toHaveLength(1)
    expect(block?.querySelectorAll('.exit-chips-questions .exit-chip')).toHaveLength(1)
    expect(block?.querySelector('.exit-chips-features .exit-chip')?.getAttribute('href')).toBe('#q-b')
  })

  it('Context 无 config：features/questions chips 不渲染（孤儿 body 仍渲染）', () => {
    render(<Answer scene={{ id: "orphan", label: "L", demo: "d" }} body={<p>孤儿段落</p>} />)
    expect(document.querySelector('.exit-chip')).toBeNull()
    // v7 布局显式化：无 SceneClip 的孤儿同样走 theater--solo（无 .stage → 单列）
    const orphan = document.getElementById('orphan')!
    expect(orphan.className).toContain('theater--solo')
    expect(orphan.className).not.toContain('theater--dual')
  })
})

describe('Answer v3 分区渲染', () => {
  const yaml = [
    'title: t',
    'entry: q-a',
    'scenes:',
    '  - id: q-a',
    '    label: 场景A',
    '    demo: demo-a',
    '    questions:',
    '      - { text: 去B, to: q-b }',
    '  - id: q-b',
    '    label: 场景B',
    '    demo: demo-b',
  ].join('\n')

  function makeConfig(raw: string): ExploreConfig {
    const r = parseExploreYaml(raw)
    if (!r.ok) throw new Error(r.error)
    return r.value
  }

  it('有 SceneClip 的场景：渲染 stage/act-no/dialogue/choices 四区', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<>
            <h2>标题</h2>
            <SceneClip demo="demo-a" />
            <p>解说段落</p>
          </>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )

    // .theater#q-a 容器存在
    const theater = container.querySelector('.theater#q-a')
    expect(theater).not.toBeNull()

    // act-head 取了 h2 标题 + act-no = 第一幕
    const actHead = container.querySelector('.act-head')
    expect(actHead).not.toBeNull()
    expect(actHead?.querySelector('.act-no')?.textContent).toBe('第一幕')
    expect(actHead?.querySelector('h2')?.textContent).toBe('标题')

    // stage 区：含 stage-tag/stage-ch/stage-inner，inner 内渲染 SceneClip
    const stage = container.querySelector('.stage')
    expect(stage).not.toBeNull()
    expect(stage?.querySelector('.stage-inner [data-scene-clip-demo="demo-a"]')).not.toBeNull()
    expect(stage?.querySelector('.stage-ch')?.textContent).toBe('CH-01')

    // dialogue 区：p 进 dialogue，且有 dlg-name
    const dialogue = container.querySelector('.dialogue')
    expect(dialogue).not.toBeNull()
    expect(dialogue?.textContent).toContain('解说段落')
    expect(dialogue?.querySelector('.dlg-name')?.textContent).toContain('解 说')

    // choices 区（q-a 有 questions=[去B]，1 个 chip）
    const choices = container.querySelector('.choices')
    expect(choices).not.toBeNull()
    expect(choices?.querySelectorAll('.exit-chip')).toHaveLength(1)
  })

  it('无 SceneClip 的场景：不渲染 .stage，其余三区照常', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[1]} body={<p>纯文字</p>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    expect(container.querySelector('.stage')).toBeNull()
    // q-b 是 yaml 第二幕
    expect(container.querySelector('.act-no')?.textContent).toBe('第二幕')
    // q-b 没有 features/questions → .choices 不渲染
    expect(container.querySelector('.choices')).toBeNull()
  })

  /* v7 布局显式化（三原则 1）：布局由 Answer 的 modifier class 声明——
   * 有 .stage ⇔ theater--dual、无 .stage ⇔ theater--solo，CSS 侧删 :has() 探测。
   * 这两条断言把「modifier ⇔ .stage 子元素存在性」严格钉死，防止二者漂移。 */
  it('v7 布局显式化：有 SceneClip 的场景 section 含 theater--dual（且存在 .stage 子元素）', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<SceneClip demo="demo-a" />} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const theater = container.querySelector('.theater')!
    expect(theater.className).toContain('theater--dual')
    expect(theater.className).not.toContain('theater--solo')
    /* modifier 声明与 DOM 事实一致：此刻必有直接 .stage 子元素（原 :has(> .stage) 等价性） */
    expect(theater.querySelector(':scope > .stage')).not.toBeNull()
  })

  it('v7 布局显式化：无 SceneClip（孤儿）场景 section 含 theater--solo 且不含 theater--dual', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[1]} body={<p>纯文字</p>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const theater = container.querySelector('.theater')!
    expect(theater.className).toContain('theater--solo')
    expect(theater.className).not.toContain('theater--dual')
    expect(theater.querySelector(':scope > .stage')).toBeNull()
  })

  it('heading first-found：遍历遇到的第一个 heading 提取到 act-head，其余 heading 留 dialogue', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<>
            <SceneClip demo="demo-a" />
            <p>先一段</p>
            <h3>小标题</h3>
            <h3>又一个小标题</h3>
          </>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    // first-found heading（小标题）被提取到 act-head
    const actHead = container.querySelector('.act-head')
    expect(actHead?.querySelector('h3')?.textContent).toBe('小标题')
    // 第二个 heading 不被提取，留在 dialogue
    const dialogue = container.querySelector('.dialogue')
    expect(dialogue?.textContent).toContain('先一段')
    expect(dialogue?.querySelector('h3')?.textContent).toBe('又一个小标题')
    // stage-inner 内有 SceneClip + p 不在 stage（只摘 SceneClip）
    expect(container.querySelector('.stage-inner [data-scene-clip-demo="demo-a"]')).not.toBeNull()
  })

  it('body 无 heading 时用 yaml scene.label 兜底 h2', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<>
            <SceneClip demo="demo-a" />
            <p>纯段落无标题</p>
          </>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const actHead = container.querySelector('.act-head')
    expect(actHead).not.toBeNull()
    expect(actHead?.querySelector('h2')?.textContent).toBe('场景A')
  })
})

/* v3 演出（Task 5）：IO 错峰 + 打字机 + 選択肢浮现
 * jsdom 无 matchMedia——用 vi.stubGlobal 桩掉（useTypewriter.test.ts 同款手法）；
 * jsdom 无 IntersectionObserver——Answer 的 useEffect 直接 return，不演出。 */
const mockedReduce = vi.hoisted(() => ({ value: false }))
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q: string) => ({
  matches: mockedReduce.value && q.includes('prefers-reduced-motion'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})))

describe('Answer v3 演出', () => {
  beforeEach(() => { mockedReduce.value = false })
  afterEach(() => { gsap.globalTimeline.clear() })

  it('打字机/reduced-motion：reduce 下不建 timeline、段落直接显示', () => {
    mockedReduce.value = true
    const cfg: ExploreConfig = {
      title: 't', entry: 'q-a',
      scenes: [{ id: 'q-a', label: 'A', demo: 'd' }],
    }
    render(
      <ExploreConfigContext.Provider value={cfg}>
        <Answer scene={cfg.scenes[0]} body={<p>文本</p>} />
      </ExploreConfigContext.Provider>,
    )
    // buildTypewriterTimeline 返回 null → 段落未被清空，原文直出
    const p = screen.getByText('文本')
    expect(p.textContent).toBe('文本')
  })

  it('ExitChips 前缀：features 渲染 ▸、questions 渲染 ？', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer scene={config.scenes[0]} body={<p>正文</p>} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    // features chip：▸ 前缀；questions chip：？ 前缀（aria-hidden 装饰字符）
    const feat = document.querySelector('.exit-chips-features .exit-chip')!
    const ques = document.querySelector('.exit-chips-questions .exit-chip')!
    expect(feat.querySelector('.chip-prefix')?.textContent).toBe('▸')
    expect(feat.querySelector('.chip-prefix')?.getAttribute('aria-hidden')).toBe('true')
    expect(ques.querySelector('.chip-prefix')?.textContent).toBe('？')
    // 前缀在文本之前
    expect(feat.textContent).toContain('▸')
    expect(feat.textContent!.indexOf('▸')).toBeLessThan(feat.textContent!.indexOf('看 B'))
  })
})

/* v7 三原则 2（全屏单点所有权）：Director 经 onFullscreen 回调申请全屏，
 * Answer 单点持有 fullscreen state 落成 section 的 data-fullscreen 属性——
 * CSS（.theater[data-fullscreen] > .stage）只认属性，Director 不碰 DOM class。
 * 演出条件（runtime Provider + 首次激活 + 本幕激活）下：
 * - mode 1 挂载即同步申请 onFullscreen(true) → useLayoutEffect → paint 前属性出现；
 * - 缩窗完成后申请 onFullscreen(false) → 属性消失（vi.waitFor 等演出走完）。
 * SceneClip 无全局注册（jsdom IO 缺失）→ playDemo 走空 demo 短路，演出纯 GSAP 推进。 */
describe('Answer v7 全屏所有权：data-fullscreen 随 Director 回调出现/消失', () => {
  const yamlMode1 = [
    'title: t',
    'entry: q-fs',
    'scenes:',
    '  - id: q-fs',
    '    label: 全屏幕',
    '    demo: demo-fs',
    '    mode: 1',
    '  - id: q-fs-b',
    '    label: 文字幕',
    '    demo: demo-fs-b',
  ].join('\n')

  function makeConfig(raw: string): ExploreConfig {
    const r = parseExploreYaml(raw)
    if (!r.ok) throw new Error(r.error)
    return r.value
  }

  function runtimeProvider(value: {
    activeId: string
    firstActivation: boolean
    onActivate: (id: string, skip: () => void) => void
  }) {
    const runtime = {
      activeId: value.activeId,
      goTo: () => {},
      onActivate: value.onActivate,
      firstActivation: value.firstActivation,
      back: () => {},
      canBack: false,
      panelOpen: false,
      setPanelOpen: () => {},
      onExit: () => {},
      focusedExitIdx: null,
    }
    return runtime
  }

  beforeEach(() => { mockedReduce.value = false })
  afterEach(() => { gsap.globalTimeline.clear() })

  it('mode 1 首次激活：useLayoutEffect 内 data-fullscreen 即出现在 section（paint 前）', () => {
    const cfg = makeConfig(yamlMode1)
    const runtime = runtimeProvider({ activeId: 'q-fs', firstActivation: true, onActivate: () => {} })
    render(
      <ExploreRuntimeContext.Provider value={runtime}>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<SceneClip demo="demo-fs" />} />
        </ExploreConfigContext.Provider>
      </ExploreRuntimeContext.Provider>,
    )
    const theater = document.querySelector('.theater')!
    expect(theater.getAttribute('data-fullscreen')).toBe('')
  })

  it('缩窗完成后 data-fullscreen 消失（vi.waitFor 等演出走完）', async () => {
    const cfg = makeConfig(yamlMode1)
    const runtime = runtimeProvider({ activeId: 'q-fs', firstActivation: true, onActivate: () => {} })
    /* jsdom 无 IntersectionObserver → 真实 SceneClip 的 useEffect 在 IO 检查处早退、
     * 不注册 API。Director.playDemo 的 waitForApi 拿不到 API 会轮询到 2s 兜底——
     * 测试注册一个假 API（v7 Task 3 promise 化：play() 返回 Promise<void>，
     * finished()=true 表示已 finished，Director 立即跳过）+ 预置 data-finished
     * （SceneClip demo onComplete 时 setAttribute 的同一属性），让 playDemo
     * 立即返回，演出纯 GSAP 推进到缩窗完成。 */
    const unregister = registerSceneClip('demo-fs', {
      play: () => Promise.resolve(),
      pause: () => {},
      replay: () => {},
      finished: () => true,
    })
    try {
      const { container } = render(
        <ExploreRuntimeContext.Provider value={runtime}>
          <ExploreConfigContext.Provider value={cfg}>
            <Answer scene={cfg.scenes[0]} body={<SceneClip demo="demo-fs" />} />
          </ExploreConfigContext.Provider>
        </ExploreRuntimeContext.Provider>,
      )
      const theater = document.querySelector('.theater')!
      // 先确认全屏属性确实出现过（mode 1 语义），再等它消失
      expect(theater.getAttribute('data-fullscreen')).toBe('')
      container.querySelector('.scene-clip')?.setAttribute('data-finished', '')
      await vi.waitFor(() => {
        expect(theater.getAttribute('data-fullscreen')).toBeNull()
      }, { timeout: 3000 })
    } finally {
      unregister()
    }
  })

  it('纯文字幕（无 SceneClip）：data-fullscreen 始终不存在（onFullscreen 不传）', () => {
    const cfg = makeConfig(yamlMode1)
    const runtime = runtimeProvider({ activeId: 'q-fs-b', firstActivation: true, onActivate: () => {} })
    render(
      <ExploreRuntimeContext.Provider value={runtime}>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[1]} body={<p>纯文字</p>} />
        </ExploreConfigContext.Provider>
      </ExploreRuntimeContext.Provider>,
    )
    const theater = document.querySelector('.theater')!
    expect(theater.hasAttribute('data-fullscreen')).toBe(false)
  })

  it('回看（firstActivation=false）：不挂 Director，data-fullscreen 不存在', () => {
    const cfg = makeConfig(yamlMode1)
    const runtime = runtimeProvider({ activeId: 'q-fs', firstActivation: false, onActivate: () => {} })
    render(
      <ExploreRuntimeContext.Provider value={runtime}>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<SceneClip demo="demo-fs" />} />
        </ExploreConfigContext.Provider>
      </ExploreRuntimeContext.Provider>,
    )
    const theater = document.querySelector('.theater')!
    expect(theater.hasAttribute('data-fullscreen')).toBe(false)
  })

  it('无路由 runtime（SSG 直出/测试孤儿形态）：data-fullscreen 不存在', () => {
    const cfg = makeConfig(yamlMode1)
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer scene={cfg.scenes[0]} body={<SceneClip demo="demo-fs" />} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const theater = document.querySelector('.theater')!
    expect(theater.hasAttribute('data-fullscreen')).toBe(false)
  })
})

/* v5 终审 fix round：partition 不再直调 hooks 组件。
 * 真实场景组件 q-architecture 的 body 含 ArchDiagram（useRef×3 + useEffect），
 * 把这个 body 喂给 Answer，必须不抛错、直调路径不该把 ArchDiagram 的 hook 寄生到
 * Answer 的 fiber 上。视觉输出（dialogue 含 ArchDiagram figure）不变。
 * jsdom + matchMedia stub（vitest.setup）→ ArchDiagram 走 reduced-motion 路径，jsdom 安全。 */
describe('Answer v5 partition：top-level 函数组件展开，不递归深 hooks 组件', () => {
  const yamlWithArch = [
    'title: t',
    'entry: q-architecture',
    'scenes:',
    '  - id: q-architecture',
    '    label: 整体架构图',
    '    demo: architecture',
  ].join('\n')

  /* 本文件模块级 stubGlobal 把 matchMedia 接到 mockedReduce（默认 false = 播放动画）；
   * ArchDiagram 的 play() 在非 reduced 下要调 SVGPathElement.getTotalLength——
   * jsdom 没有这个 API。置 true 走 reduced-motion 早退分支（vitest.setup 同款语义）。 */
  beforeEach(() => { mockedReduce.value = true })

  it('渲染含 ArchDiagram 的真实场景组件不抛错；ArchDiagram 落在 stage 区（SceneClip 内）', async () => {
    const cfg = parseExploreYaml(yamlWithArch)
    if (!cfg.ok) throw new Error(cfg.error)
    // 动态 import：scenes/q-architecture.tsx 物理上位于 content/posts/...
    // vitest ESM 不会动 Vite 的 glob，所以走真实相对路径导入场景文件。
    const { default: QArchitecture } = await import(
      '../../../content/posts/ai-digital-employee/scenes/q-architecture'
    )
    // v6 单源：SceneClip 经 moduleForSlug(currentSlug) 反查 demos 字典——
    // 不 setCurrentSlug 则反查不到、ArchDiagram 不渲染（与生产 SSG 直出路径不同，
    // 测试需显式注入 slug）。
    setCurrentSlug('ai-digital-employee')
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg.value}>
          <Answer scene={cfg.value.scenes[0]} body={<QArchitecture />} />
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    setCurrentSlug(null)
    // dialogue 区含段落「把刚才的比喻翻译成工程语言」（来自场景组件）
    const dialogue = container.querySelector('.dialogue')
    expect(dialogue).not.toBeNull()
    expect(dialogue?.textContent).toContain('把刚才的比喻翻译成工程语言')
    // 一幕一元素：ArchDiagram 由 SceneClip 内的 architecture demo 渲染，
    // 图（.ba-arch）落在 stage-inner 里的 scene-clip 容器内，不在 dialogue
    expect(container.querySelector('.stage-inner .ba-arch')).not.toBeNull()
    expect(container.querySelector('.dialogue .ba-arch')).toBeNull()
    // SceneClip 仍然进 stage 区
    expect(container.querySelector('.stage-inner [data-scene-clip-demo="architecture"]')).not.toBeNull()
    // 无 hook 寄生报警：React 渲染期非法 hook 调用会抛 "Invalid hook call"，渲染能走到断言即安全
  })
})
