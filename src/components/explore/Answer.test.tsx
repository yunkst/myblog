import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import gsap from 'gsap'
import Answer, { ExploreConfigContext } from './Answer'
import SceneClip from './SceneClip'
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

describe('Answer（v2 原位渲染）', () => {
  it('渲染为带 id 的 theater+answer-block 双类名，子内容可见', () => {
    render(<Answer id="q-problem"><p>正文段落</p></Answer>)
    const block = document.getElementById('q-problem')
    expect(block).not.toBeNull()
    // 双类名约定：v3 引入 .theater，保留 .answer-block 作过渡别名
    expect(block?.className).toContain('theater')
    expect(block?.className).toContain('answer-block')
    expect(screen.getByText('正文段落')).toBeInTheDocument()
  })

  it('Context 提供 config 时，按 id 自动渲染 features + questions 两组 chips', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer id="q-a"><p>正文</p></Answer>
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const block = document.getElementById('q-a')
    expect(block?.querySelectorAll('.exit-chips-features .exit-chip')).toHaveLength(1)
    expect(block?.querySelectorAll('.exit-chips-questions .exit-chip')).toHaveLength(1)
    expect(block?.querySelector('.exit-chips-features .exit-chip')?.getAttribute('href')).toBe('#q-b')
  })

  it('yaml 找不到对应 id 的场景时，只渲染 children，无 chips', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer id="not-a-scene"><p>孤儿段落</p></Answer>
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    expect(document.querySelector('.exit-chip')).toBeNull()
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
          <Answer id="q-a">
            <h2>标题</h2>
            <SceneClip demo="demo-a" />
            <p>解说段落</p>
          </Answer>
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
          <Answer id="q-b"><p>纯文字</p></Answer>
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    expect(container.querySelector('.stage')).toBeNull()
    // q-b 是 yaml 第二幕
    expect(container.querySelector('.act-no')?.textContent).toBe('第二幕')
    // q-b 没有 features/questions → .choices 不渲染
    expect(container.querySelector('.choices')).toBeNull()
  })

  it('heading first-found：遍历遇到的第一个 heading 提取到 act-head，其余 heading 留 dialogue', () => {
    const cfg = makeConfig(yaml)
    const { container } = render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={cfg}>
          <Answer id="q-a">
            <SceneClip demo="demo-a" />
            <p>先一段</p>
            <h3>小标题</h3>
            <h3>又一个小标题</h3>
          </Answer>
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
    render(<Answer id="q-a"><p>文本</p></Answer>)
    // buildTypewriterTimeline 返回 null → 段落未被清空，原文直出
    const p = screen.getByText('文本')
    expect(p.textContent).toBe('文本')
  })

  it('ExitChips 前缀：features 渲染 ▸、questions 渲染 ？', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer id="q-a"><p>正文</p></Answer>
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
