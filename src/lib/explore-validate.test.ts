import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { validateExplore, setExploreSourceForTest, resetExploreSourceForTest } from './explore'

const FIX = path.join(process.cwd(), 'src/lib/__fixtures__/explore-val')

beforeEach(() => {
  if (!fs.existsSync(FIX)) fs.mkdirSync(FIX, { recursive: true })
  // 清掉旧的 fixture 子目录（保留目录本身）
  for (const d of fs.readdirSync(FIX)) {
    fs.rmSync(path.join(FIX, d), { recursive: true, force: true })
  }
  setExploreSourceForTest(FIX)
})
afterEach(() => { resetExploreSourceForTest() })

function write(slug: string, yaml: string, article: string) {
  const dir = path.join(FIX, slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'explore.yaml'), yaml)
  fs.writeFileSync(path.join(dir, 'article.mdx'), `---
title: ${slug}
date: 2026-08-29
status: published
---
${article}
`)
}

describe('validateExplore 规则', () => {
  it('规则1: YAML 非 placeholder 节点的 id 必须在正文 <Answer id> 里存在', () => {
    write('r1', `title: t\nnodes:\n  - { id: q-missing, label: x }`, '普通正文')
    const r = validateExplore('r1')
    expect(r.errors.some(e => e.includes('q-missing 未在 article.mdx 找到 <Answer'))).toBe(true)
  })

  it('规则2: 正文 <Answer id> 在 YAML 树中未被引用 —— warn 不 fail', () => {
    write('r2', `title: t\nnodes:\n  - { id: q-used, label: x }`,
      '<Answer id="q-used">正文</Answer><Answer id="q-orphan">孤儿</Answer>')
    const r = validateExplore('r2')
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => w.includes('q-orphan 在 YAML 树未被引用'))).toBe(true)
  })

  it('规则3: seek 值必须在 scene timeline labels 存在（无 scene 时跳过）', () => {
    write('r3', `title: t\nnodes:\n  - { id: q-bad-seek, label: x, seek: nonexistent }`,
      '<Answer id="q-bad-seek">a</Answer>')
    // 不提供 scene —— 此规则无法验证，应放过
    const r = validateExplore('r3')
    expect(r.errors.filter(e => e.includes('seek'))).toHaveLength(0)
  })

  it('规则4: cross-link to.post 存在且 to.anchor 是目标文章真实 heading id', () => {
    write('r-target', `title: t\n---\n## 目标锚点\n`, '')
    write('r4',
      `title: t\nnodes:\n  - { id: q, label: l, kind: cross-link, to: { post: r-target, anchor: "#错位置" }, preview: x }`,
      '<Answer id="q">a</Answer>')
    const r = validateExplore('r4')
    expect(r.errors.some(e => e.includes('r-target 找不到 anchor'))).toBe(true)
  })

  it('规则5: <QuestionAnchor> 不能引用 placeholder 节点', () => {
    write('r5',
      `title: t\nnodes:\n  - { id: q-ph, label: x, status: placeholder, detail: "..." }`,
      '<Answer id="q-ph">a</Answer><QuestionAnchor id="q-ph" />')
    // 实现处需要在 validateExplore 内对当前文章扫描 <QuestionAnchor>
    const r = validateExplore('r5')
    expect(r.errors.some(e => e.includes('q-ph 是 placeholder'))).toBe(true)
  })

  it('规则6: SceneClip from 标签必须存在于本文 scene timeline（无 scene 跳过）', () => {
    write('r6',
      `title: t\nnodes:\n  - { id: q, label: x }`,
      '<Answer id="q">a</Answer><SceneClip from="nope" />')
    const r = validateExplore('r6')
    // 没场景不该报错
    expect(r.errors).toHaveLength(0)
  })
})
