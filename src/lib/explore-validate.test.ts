import { describe, it, expect } from 'vitest'
import { parseExploreYaml, validateExploreConfig, type ValidateCtx } from './explore'

function makeConfig(yaml: string) {
  const r = parseExploreYaml(yaml)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const baseYaml = `
title: t
entry: q-a
scenes:
  - id: q-a
    label: A
    demo: demo-a
    questions:
      - { text: 去那篇, to: { post: other, scene: entry } }
  - id: q-b
    label: B
    demo: demo-b
`

const baseCtx: ValidateCtx = {
  knownPosts: ['self', 'other'],
  scenesOfPost: (p) => (p === 'other' ? ['q-o1'] : null),
}

describe('validateExploreConfig v2', () => {
  it('合法配置零错误', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), baseCtx)
    expect(r.errors).toEqual([])
  })
  it('规则1 entry 不在 scenes 报错', () => {
    const c = makeConfig(baseYaml)
    c.entry = 'q-nope'
    const r = validateExploreConfig('self', c, baseCtx)
    expect(r.errors.some((e) => e.includes('entry'))).toBe(true)
  })
  it('规则5 本地 to 指向不存在场景报错', () => {
    const y = baseYaml.replace('- { text: 去那篇, to: { post: other, scene: entry } }', '- { text: 去不存在, to: q-nope }')
    const r = validateExploreConfig('self', makeConfig(y), baseCtx)
    expect(r.errors.some((e) => e.includes('q-nope'))).toBe(true)
  })
  it('规则5b 跨文章 post 不存在报错', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, knownPosts: ['self'] })
    expect(r.errors.some((e) => e.includes('other'))).toBe(true)
  })
  it('规则5c 跨文章目标场景不存在报错', () => {
    const y = baseYaml.replace("scene: entry }", "scene: q-nope }")
    const r = validateExploreConfig('self', makeConfig(y), baseCtx)
    expect(r.errors.some((e) => e.includes('q-nope'))).toBe(true)
  })
  it('规则5d 跨文章 scene: entry 且目标无 yaml 报错', () => {
    const r = validateExploreConfig('self', makeConfig(baseYaml), { ...baseCtx, scenesOfPost: () => null })
    expect(r.errors.some((e) => e.includes('other'))).toBe(true)
  })
})
