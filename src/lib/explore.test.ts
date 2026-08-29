import { describe, it, expect } from 'vitest'
import { parseExploreYaml, resolveExploreHref, scanDemoNames, toChineseOrdinal } from './explore'

const good = `
title: 一个 AI 数字员工平台
entry: q-problem
scenes:
  - id: q-problem
    label: 公司的技术问题，都是谁在解决？
    demo: message-flood
    features:
      - { text: 看方案, to: q-badge-metaphor }
    questions:
      - { text: 去别的文章, to: { post: other-post, scene: entry } }
  - id: q-badge-metaphor
    label: 把工牌借给 AI
    demo: badge-metaphor
`

describe('parseExploreYaml v2', () => {
  it('合法配置解析成功', () => {
    const r = parseExploreYaml(good)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.entry).toBe('q-problem')
      expect(r.value.scenes).toHaveLength(2)
      expect(r.value.scenes[0].features?.[0].to).toBe('q-badge-metaphor')
    }
  })
  it('非对象顶层报错', () => {
    const r = parseExploreYaml('- a\n- b\n')
    expect(r.ok).toBe(false)
  })
  it('title 缺失报错', () => {
    const r = parseExploreYaml('entry: a\nscenes:\n  - { id: a, label: x, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('title')
  })
  it('entry 缺失报错', () => {
    const r = parseExploreYaml('title: t\nscenes:\n  - { id: a, label: x, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('entry')
  })
  it('scenes 空数组报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes: []\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('scenes')
  })
  it('scene.id 非法报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - { id: "A!", label: x, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('id')
  })
  it('scene.id 重复报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - { id: a, label: x, demo: d }\n  - { id: a, label: y, demo: d }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('重复')
  })
  it('demo 缺失报错（placeholder 废除，spec §5.3）', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - { id: a, label: x }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('demo')
  })
  it('exit.to 非法形态报错', () => {
    const r = parseExploreYaml('title: t\nentry: a\nscenes:\n  - id: a\n    label: x\n    demo: d\n    features:\n      - { text: t, to: { post: p } }\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('to')
  })
})

describe('resolveExploreHref', () => {
  const config = parseExploreYaml(good)
  it('本地目标 → #id', () => {
    expect(config.ok && resolveExploreHref('q-badge-metaphor', config.value)).toBe('#q-badge-metaphor')
  })
  it('跨文章 entry → /blog/<post>/#entry（保留字别名）', () => {
    expect(config.ok && resolveExploreHref({ post: 'other-post', scene: 'entry' }, config.value))
      .toBe('/blog/other-post/#entry')
  })
  it('跨文章具体场景 → /blog/<post>/#<scene-id>', () => {
    expect(config.ok && resolveExploreHref({ post: 'p2', scene: 'q-x' }, config.value))
      .toBe('/blog/p2/#q-x')
  })
})

describe('scanDemoNames（demo 键书写契约：缩进≥2 的 name: { 形式）', () => {
  it('扫出字面量键', () => {
    const src = `export const demos: Record<string, Scene> = {
  'message-flood': {
    name: 'message-flood',
    Stage: FloodStage,
    build() { return gsap.timeline() },
  },
  badge: { name: 'badge', Stage: B, build: () => gsap.timeline() },
}`
    expect(scanDemoNames(src).sort()).toEqual(['badge', 'message-flood'])
  })
  it('无 demos 导出返回空数组', () => {
    expect(scanDemoNames('export default {}')).toEqual([])
  })
})

describe('toChineseOrdinal（v3 幕序号）', () => {
  it('1-12 正确转换', () => {
    const expectArr = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
    expectArr.forEach((c, i) => expect(toChineseOrdinal(i + 1)).toBe(c))
  })
  it('非正整数抛 RangeError', () => {
    expect(() => toChineseOrdinal(0)).toThrow(RangeError)
    expect(() => toChineseOrdinal(-1)).toThrow(RangeError)
    expect(() => toChineseOrdinal(1.5)).toThrow(RangeError)
  })
})
