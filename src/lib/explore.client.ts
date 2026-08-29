// src/lib/explore.client.ts
//
// 客户端版本（不带 node:fs）。SSG/SSR 阶段使用 lib/explore.ts，客户端 hydrate 时
// 由 vite.config.ts 的 alias 切到这里，避免 node:fs 打进浏览器 bundle。
//
// 数据来源：构建期通过 import.meta.glob 把所有 explore.yaml 预加载为 raw 字符串。
import yaml from 'js-yaml'
import type { ExploreConfig } from './types'

const ID_RE = /^[a-z0-9][a-z0-9-]*$/
function validId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

/* Eager 收集所有 explore.yaml 作为 raw 字符串。
 * `as: 'raw'` 让 Vite 把 yaml 当文本加载（而不是尝试解析为 JS），
 * 避免 vitest/SSR 转换对 yaml 内容的语法解析失败。 */
const exploreRawModules = import.meta.glob<string>(
  '/content/posts/*/explore.yaml',
  { eager: true, query: '?raw', import: 'default' },
)

/* slug → 路径段 → 解析后的 ExploreConfig。失败的 cfg 视为 null（warn 由 SSR 侧负责）。 */
function parse(raw: string): ExploreConfig | null {
  let parsed: any
  try { parsed = yaml.load(raw) } catch { return null }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) return null
  if (!Array.isArray(parsed.nodes)) return null
  const seen = new Set<string>()
  const walk = (node: any): boolean => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false
    if (!validId(node.id)) return false
    if (seen.has(node.id)) return false
    seen.add(node.id)
    if (typeof node.label !== 'string') return false
    if (node.kind && node.kind !== 'local' && node.kind !== 'cross-link') return false
    if (Array.isArray(node.children)) {
      for (const c of node.children) if (!walk(c)) return false
    }
    return true
  }
  for (const n of parsed.nodes) if (!walk(n)) return null
  return parsed as ExploreConfig
}

const cache: Record<string, ExploreConfig | null> = {}
const slugIndex: string[] = (() => {
  const out: string[] = []
  for (const k of Object.keys(exploreRawModules)) {
    const parts = k.split('/')
    const slug = parts[parts.length - 2]
    if (!slug) continue
    cache[slug] = parse(exploreRawModules[k] || '')
    if (cache[slug]) out.push(slug)
  }
  return out
})()

export function getExplore(slug: string): ExploreConfig | null {
  return cache[slug] ?? null
}

export function listExplorable(): string[] {
  return slugIndex.slice()
}