// src/lib/explore.ts
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ExploreConfig } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')

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
  return path.join(POSTS_DIR, slug, 'explore.yaml')
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
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => fs.existsSync(exploreFile(slug)))
}

/** 简单正则扫描 article.mdx 里的 <Answer id="..."> id 列表（不解析 AST） */
export function getRawAnswerIds(slug: string): string[] {
  const file = path.join(POSTS_DIR, slug, 'article.mdx')
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
  const file = path.join(POSTS_DIR, slug, 'article.mdx')
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

function slugifyHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}
