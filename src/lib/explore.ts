// src/lib/explore.ts
//
// ⚠️ 安全考量：探索视图把 article.mdx 的 <Answer> 内容以 innerHTML 形式注入
// （ExploreView 的 dangerouslySetInnerHTML）。这些 HTML 来自作者本人编写的 MDX，
// 构建期静态内容，可信；XSS 风险可接受。**但如果未来 MDX 内容来源被撑开
// （评论、用户投稿等 UGC），必须重新评估并引入消毒层。**

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ExploreConfig, ExploreNode } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')

let postsDirOverride: string | null = null
export function setExploreSourceForTest(dir: string) { postsDirOverride = dir }
export function resetExploreSourceForTest() { postsDirOverride = null }
function currentPostsDir() {
  return postsDirOverride || POSTS_DIR
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

const ID_RE = /^[a-z0-9][a-z0-9-]*$/
function validId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

/** 仅做语法解析和最小字段校验。语义校验（交叉引用、anchor 等）在 Task 5。 */
export function parseExploreYaml(raw: string): ParseResult<ExploreConfig> {
  let parsed: any
  try { parsed = yaml.load(raw) } catch (e: any) {
    return { ok: false, error: `YAML 解析失败：${e.message}` }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'YAML 顶层必须是对象' }
  }
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
    return { ok: false, error: 'title 必填且非空' }
  }
  if (!Array.isArray(parsed.nodes)) {
    return { ok: false, error: 'nodes 必须是数组' }
  }
  // 节点递归扁平，只查 id 合法性与不重复
  const seen = new Set<string>()
  const walk = (node: any, where: string): string | null => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return `${where} 不是对象`
    if (!validId(node.id)) return `${where}.id 非法或缺失`
    if (seen.has(node.id)) return `${where}.id 重复：${node.id}`
    seen.add(node.id)
    if (typeof node.label !== 'string') return `${where}.label 缺失`
    if (node.kind && node.kind !== 'local' && node.kind !== 'cross-link') return `${where}.kind 非法`
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        const err = walk(node.children[i], `${where}.children[${i}]`)
        if (err) return err
      }
    }
    return null
  }
  for (let i = 0; i < parsed.nodes.length; i++) {
    const err = walk(parsed.nodes[i], `nodes[${i}]`)
    if (err) return { ok: false, error: err }
  }
  return { ok: true, value: parsed as ExploreConfig }
}

function exploreFile(slug: string) {
  return path.join(currentPostsDir(), slug, 'explore.yaml')
}

export function getExplore(slug: string): ExploreConfig | null {
  const file = exploreFile(slug)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf-8')
  const r = parseExploreYaml(raw)
  if (!r.ok) {
    console.warn(`[explore] ${slug} 配置错误：${r.error}`)
    return null
  }
  return r.value
}

export function listExplorable(): string[] {
  if (!fs.existsSync(currentPostsDir())) return []
  return fs.readdirSync(currentPostsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => fs.existsSync(exploreFile(slug)))
}

/** 简单正则扫描 article.mdx 里的 <Answer id="..."> id 列表（不解析 AST） */
export function getRawAnswerIds(slug: string): string[] {
  const file = path.join(currentPostsDir(), slug, 'article.mdx')
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, 'utf-8')
  const ids: string[] = []
  const re = /<Answer\s+[^>]*\bid="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (validId(m[1])) ids.push(m[1])
  }
  return Array.from(new Set(ids))
}

/** 提取所有 heading 的 id 与文本（简单匹配 # title {#id} 与 ## title） */
export function getHeadingsWithIds(slug: string): Array<{ id: string; text: string }> {
  const file = path.join(currentPostsDir(), slug, 'article.mdx')
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, 'utf-8')
  const out: Array<{ id: string; text: string }> = []
  const re = /^(#{1,6})\s+(.+?)(?:\s+\{#([^}]+)\})?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const text = m[2].trim().replace(/\\([!"#\$%&'\(\)\*\+,\.\/:;<=>\?@\[\]\\^_`\{\|\}~])/g, '$1')
    const id = m[3] || slugifyHeading(text)
    if (id) out.push({ id, text })
  }
  return out
}

export function slugifyHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

export interface ValidateResult {
  ok: boolean
  errors: string[]   // 这些会让 vite build 失败
  warnings: string[] // 这些只在控制台打印
}

/**
 * 6 条规则详见 spec §8。一次只对单篇文章。返回的结果：
 * - errors：构建必须 fail
 * - warnings：构建继续但打印 (例如 <Answer> 在 YAML 树没引用 —— 探索视图用不上)
 */
export function validateExplore(slug: string, sceneLabels: string[] = []): ValidateResult {
  const config = getExplore(slug)
  if (!config) return { ok: true, errors: [], warnings: [] }
  const errors: string[] = []
  const warnings: string[] = []

  const yamlIds = new Set<string>()
  function walk(node: ExploreNode, _where: string) {
    yamlIds.add(node.id)
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], `nodes[${i}]`)
      }
    }
  }
  config.nodes.forEach((n, i) => walk(n, `nodes[${i}]`))

  // 规则1
  const answerIds = new Set(getRawAnswerIds(slug))
  for (const id of yamlIds) {
    const node = findNode(config, id)
    if (!node) continue
    if (node.status === 'placeholder') continue
    // cross-link 节点：自身没有 <Answer>（它的"答案"在另一篇的正文里），
    // 跳转目标由规则 4 (checkCrossLink) 单独校验，不走规则 1。
    if (node.kind === 'cross-link' && node.preview) continue
    if (!answerIds.has(id)) {
      errors.push(`[${slug}] ${id} 未在 article.mdx 找到 <Answer id="${id}">`)
    }
  }

  // 规则2：正文 Answer 在 YAML 树没被引用（warn）
  for (const id of answerIds) {
    if (!yamlIds.has(id)) {
      warnings.push(`[${slug}] ${id} 在 YAML 树未被引用（正文里有 <Answer id="${id}">，但探索视图用不上此段）`)
    }
  }

  // 规则3：seek 值在 scene timeline labels
  if (sceneLabels.length > 0) {
    const labels = new Set(sceneLabels)
    config.nodes.forEach((n, i) => checkSeek(n, labels, slug, errors, `nodes[${i}]`))
  }

  // 规则4：cross-link 目标存在 + anchor 是目标 heading
  config.nodes.forEach((n, i) => checkCrossLink(n, slug, errors, `nodes[${i}]`))

  // 规则5：placeholder 节点不被 <QuestionAnchor> 引用（扫描本文）
  const articleFile = path.join(currentPostsDir(), slug, 'article.mdx')
  if (fs.existsSync(articleFile)) {
    const article = fs.readFileSync(articleFile, 'utf-8')
    const qaRe = /<QuestionAnchor\s+[^>]*\bid="([^"]+)"/g
    let m: RegExpExecArray | null
    const placeholderIds = collectPlaceholderIds(config)
    while ((m = qaRe.exec(article)) !== null) {
      if (placeholderIds.has(m[1])) {
        errors.push(`[${slug}] 正文里 <QuestionAnchor id="${m[1]}"> 引用了 placeholder 节点：${m[1]} 是 placeholder`)
      }
    }

    // 规则6：SceneClip from 标签存在（仅当存在 scene）
    if (sceneLabels.length > 0) {
      const clipRe = /<SceneClip\s+[^>]*\bfrom="([^"]+)"/g
      const labels = new Set(sceneLabels)
      while ((m = clipRe.exec(article)) !== null) {
        if (!labels.has(m[1])) {
          errors.push(`[${slug}] 正文里 <SceneClip from="${m[1]}"> 引用了不存在的 timeline label`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

function findNode(c: ExploreConfig, id: string): ExploreNode | undefined {
  function walk(n: ExploreNode): ExploreNode | undefined {
    if (n.id === id) return n
    if (n.children) for (const ch of n.children) { const r = walk(ch); if (r) return r }
    return undefined
  }
  for (const n of c.nodes) { const r = walk(n); if (r) return r }
  return undefined
}

function checkSeek(n: ExploreNode, labels: Set<string>, slug: string, errors: string[], where: string) {
  if (n.seek && !labels.has(n.seek)) {
    errors.push(`[${slug}] ${where}.seek="${n.seek}" 不在 scene timeline labels 里`)
  }
  if (n.children) n.children.forEach((c, i) => checkSeek(c, labels, slug, errors, `${where}.children[${i}]`))
  // seek_root 单独校验（由 Task 9 调用方在拿到 scene labels 后一并校验）
}

function checkCrossLink(n: ExploreNode, slug: string, errors: string[], where: string) {
  if (n.kind === 'cross-link') {
    if (!n.to || !n.to.post || !n.to.anchor) {
      errors.push(`[${slug}] ${where} 是 cross-link 但缺 to.post 或 to.anchor`)
    } else {
      const targetSlug = n.to.post
      if (!fs.existsSync(path.join(currentPostsDir(), targetSlug))) {
        errors.push(`[${slug}] ${where}.to.post="${targetSlug}" 文章不存在`)
      } else {
        const headings = getHeadingsWithIds(targetSlug)
        const want = n.to.anchor.replace(/^#/, '')
        if (!headings.some(h => h.id === want)) {
          errors.push(`[${slug}] ${where}.to.anchor="${n.to.anchor}" 在 ${targetSlug} 找不到 anchor "${want}" 对应 heading`)
        }
      }
    }
  }
  if (n.children) n.children.forEach((c, i) => checkCrossLink(c, slug, errors, `${where}.children[${i}]`))
}

function collectPlaceholderIds(c: ExploreConfig): Set<string> {
  const out = new Set<string>()
  function walk(n: ExploreNode) {
    if (n.status === 'placeholder') out.add(n.id)
    if (n.children) n.children.forEach(walk)
  }
  c.nodes.forEach(walk)
  return out
}
