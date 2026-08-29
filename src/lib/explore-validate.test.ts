import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { validateExplore, setExploreSourceForTest, resetExploreSourceForTest } from './explore'

// 集中定义所有 6 个 case 的 fixture —— 每次测试运行时重建，
// 完整目录被 git 跟踪，便于审阅者直接看到所有测试输入。
const FIXTURES: Array<{ slug: string; yaml: string; article: string }> = [
  { slug: 'r1', yaml: `title: t\nnodes:\n  - { id: q-missing, label: x }`, article: '普通正文' },
  { slug: 'r2', yaml: `title: t\nnodes:\n  - { id: q-used, label: x }`,
    article: '<Answer id="q-used">正文</Answer><Answer id="q-orphan">孤儿</Answer>' },
  { slug: 'r3', yaml: `title: t\nnodes:\n  - { id: q-bad-seek, label: x, seek: nonexistent }`,
    article: '<Answer id="q-bad-seek">a</Answer>' },
  { slug: 'r-target', yaml: `title: t\n---\n## 目标锚点\n`, article: '' },
  { slug: 'r4',
    yaml: `title: t\nnodes:\n  - { id: q, label: l, kind: cross-link, to: { post: r-target, anchor: "#错位置" }, preview: x }`,
    article: '<Answer id="q">a</Answer>' },
  { slug: 'r5',
    yaml: `title: t\nnodes:\n  - { id: q-ph, label: x, status: placeholder, detail: "..." }`,
    article: '<Answer id="q-ph">a</Answer><QuestionAnchor id="q-ph" />' },
  { slug: 'r6',
    yaml: `title: t\nnodes:\n  - { id: q, label: x }`,
    article: '<Answer id="q">a</Answer><SceneClip from="nope" />' },
  // 正向触发 fixture：传入 sceneLabels 但引用了不在集合里的值
  { slug: 'r3p',
    yaml: `title: t\nnodes:\n  - { id: q-bad-seek, label: x, seek: nonexistent }`,
    article: '<Answer id="q-bad-seek">a</Answer>' },
  { slug: 'r6p',
    yaml: `title: t\nnodes:\n  - { id: q, label: x }`,
    article: '<Answer id="q">a</Answer><SceneClip from="missing" />' },
]

const FIX = path.join(process.cwd(), 'src/lib/__fixtures__/explore-val')

beforeEach(() => {
  if (!fs.existsSync(FIX)) fs.mkdirSync(FIX, { recursive: true })
  // 清掉旧的 fixture 子目录（保留目录本身），然后重建所有 6 个输入
  for (const d of fs.readdirSync(FIX)) {
    fs.rmSync(path.join(FIX, d), { recursive: true, force: true })
  }
  for (const fx of FIXTURES) write(fx.slug, fx.yaml, fx.article)
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
    const r = validateExplore('r1')
    expect(r.errors.some(e => e.includes('q-missing 未在 article.mdx 找到 <Answer'))).toBe(true)
  })

  it('规则2: 正文 <Answer id> 在 YAML 树中未被引用 —— warn 不 fail', () => {
    const r = validateExplore('r2')
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => w.includes('q-orphan 在 YAML 树未被引用'))).toBe(true)
  })

  it('规则3: seek 值必须在 scene timeline labels 存在（无 scene 时跳过）', () => {
    // 不提供 scene —— 此规则无法验证，应放过
    const r = validateExplore('r3')
    expect(r.errors.filter(e => e.includes('seek'))).toHaveLength(0)
  })

  it('规则4: cross-link to.post 存在且 to.anchor 是目标文章真实 heading id', () => {
    const r = validateExplore('r4')
    expect(r.errors.some(e => e.includes('r-target 找不到 anchor'))).toBe(true)
  })

  it('规则5: <QuestionAnchor> 不能引用 placeholder 节点', () => {
    const r = validateExplore('r5')
    expect(r.errors.some(e => e.includes('q-ph 是 placeholder'))).toBe(true)
  })

  it('规则6: SceneClip from 标签必须存在于本文 scene timeline（无 scene 跳过）', () => {
    const r = validateExplore('r6')
    // 没场景不该报错
    expect(r.errors).toHaveLength(0)
  })

  // ===== 正向触发路径（rule 3 / rule 6）=====
  // 传入 sceneLabels 但节点 seek/SceneClip from 不在集合里 —— 应当报错

  it('规则3 正向: 传入 sceneLabels 但节点 seek 不在集合里时报错', () => {
    const r = validateExplore('r3p', ['good-label'])
    // 错误文案用节点路径（nodes[0].seek="..."），不是 id
    expect(r.errors.some(e => e.includes('seek="nonexistent"'))).toBe(true)
  })

  it('规则6 正向: 传入 sceneLabels 但 SceneClip from 不在集合里时报错', () => {
    const r = validateExplore('r6p', ['good-label'])
    expect(r.errors.some(e => e.includes('SceneClip') && e.includes('missing'))).toBe(true)
  })
})
