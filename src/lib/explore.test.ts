import { describe, it, expect } from 'vitest'
import { getExplore, parseExploreYaml, getRawAnswerIds } from './explore'

describe('explore config', () => {
  it('parseExploreYaml 解析合法 YAML', () => {
    const yaml = `
title: 测试
seek_root: intro
nodes:
  - id: q-foo
    label: 问题
    seek: q-foo
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('测试')
      expect(r.value.nodes[0].id).toBe('q-foo')
    }
  })

  it('parseExploreYaml 失败时返回明确错误', () => {
    const r = parseExploreYaml('not: a: valid: yaml:')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('YAML')
  })

  it('parseExploreYaml 节点 id 重复报错', () => {
    const yaml = `
title: t
nodes:
  - id: q-a
    label: A
  - id: q-a
    label: A2
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('重复')
  })

  it('parseExploreYaml 子节点递归校验', () => {
    const yaml = `
title: t
nodes:
  - id: q-parent
    label: P
    children:
      - id: q-child
        label: C
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(true)
  })

  it('parseExploreYaml kind 非法值报错', () => {
    const yaml = `
title: t
nodes:
  - id: q-bad
    label: B
    kind: weird
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('kind')
  })

  it('parseExploreYaml 顶层不是对象报错', () => {
    const r = parseExploreYaml('- a\n- b')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('对象')
  })

  it('parseExploreYaml 缺 title 报错', () => {
    const yaml = `
nodes:
  - id: q-x
    label: X
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('title')
  })

  it('parseExploreYaml nodes 非数组报错', () => {
    const yaml = `
title: t
nodes: not-array
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('nodes')
  })

  it('parseExploreYaml id 非法字符报错', () => {
    const yaml = `
title: t
nodes:
  - id: Bad Id!
    label: X
`
    const r = parseExploreYaml(yaml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('id')
  })

  it('getExplore 对不存在的 slug 返回 null', () => {
    expect(getExplore('__nope__')).toBeNull()
  })

  it('getRawAnswerIds 对不存在的 article.mdx 返回 []', () => {
    expect(getRawAnswerIds('__nope__')).toEqual([])
  })
})
