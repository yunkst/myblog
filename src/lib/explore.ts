// src/lib/explore.ts
//
// v2：纯函数模块。yaml/scene 源码由调用方读入（构建侧 scripts/validate-explore.ts
// 用 node:fs；浏览器侧 Post.tsx 用 import.meta.glob('?raw')）。build 与浏览器跑同一份代码，
// v1 的 explore.client.ts 双文件模式废除（spec §8.4）。
//
// v5：article.mdx 退出，<Answer> 不再存在。answerIds 在 ValidateCtx 中保留为接口对齐位
// （validate 内部不再消费）；scenes 目录对齐由 T9 的 validateScenesAlignment 承担。
//
// ⚠️ 安全考量：v5 article.mdx 退出后，<Answer> 不再由 MDX 编译产物提供，
// 文本/scene 内容由 scenes/*.tsx 直接产出 ReactNode（避免 innerHTML 注入路径）。
// Answer.tsx 与 SceneRoute 间的 dangerouslySetInnerHTML 路径已删除；XSS 风险随
// 数据来源约束自动收敛，未来若引入 UGC 仍需重新评估。

import yaml from 'js-yaml'
import type { ExploreConfig, ExploreTarget } from './types'

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

const ID_RE = /^[a-z0-9][a-z0-9-]*$/
function validId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

export function parseExploreYaml(raw: string): ParseResult<ExploreConfig> {
  let parsed: any
  try { parsed = yaml.load(raw) } catch (e: any) {
    return { ok: false, error: `YAML 解析失败：${e.message}` }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'YAML 顶层必须是对象' }
  }
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) return { ok: false, error: 'title 必填且非空' }
  if (!validId(parsed.entry)) return { ok: false, error: 'entry 必填且为合法 id（小写字母/数字/连字符）' }
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) return { ok: false, error: 'scenes 必须是非空数组' }
  const seen = new Set<string>()
  for (let i = 0; i < parsed.scenes.length; i++) {
    const s = parsed.scenes[i]
    const where = `scenes[${i}]`
    if (!s || typeof s !== 'object' || Array.isArray(s)) return { ok: false, error: `${where} 不是对象` }
    if (!validId(s.id)) return { ok: false, error: `${where}.id 非法或缺失` }
    if (seen.has(s.id)) return { ok: false, error: `${where}.id 重复：${s.id}` }
    seen.add(s.id)
    if (typeof s.label !== 'string' || !s.label.trim()) return { ok: false, error: `${where}.label 缺失` }
    if (typeof s.demo !== 'string' || !s.demo.trim()) {
      return { ok: false, error: `${where}.demo 必填——无 demo 的场景禁止存在（spec §5.3 placeholder 废除）` }
    }
    if (s.mode !== undefined && ![1, 2, 3].includes(s.mode)) {
      return { ok: false, error: `${where}.mode 必须是 1/2/3 或缺省；收到 ${JSON.stringify(s.mode)}` }
    }
    for (const key of ['features', 'questions'] as const) {
      const list = s[key]
      if (list === undefined) continue
      if (!Array.isArray(list)) return { ok: false, error: `${where}.${key} 必须是数组` }
      for (let j = 0; j < list.length; j++) {
        const e = list[j]
        if (!e || typeof e !== 'object' || typeof e.text !== 'string' || !e.text.trim()) {
          return { ok: false, error: `${where}.${key}[${j}].text 缺失` }
        }
        const to = e.to
        const okStr = validId(to)
        const okObj = !!to && typeof to === 'object' && !Array.isArray(to)
          && typeof to.post === 'string' && to.post.length > 0
          && typeof to.scene === 'string' && (to.scene === 'entry' || validId(to.scene))
        if (!okStr && !okObj) return { ok: false, error: `${where}.${key}[${j}].to 必须是场景 id 或 { post, scene }` }
      }
    }
  }
  return { ok: true, value: parsed as ExploreConfig }
}

export interface ValidateCtx {
  answerIds: string[]
  demoNames: string[]
  sceneFileExists: boolean
  knownPosts: string[]
  /** 返回目标文章的场景 id 全集；目标文章无 explore.yaml 时返回 null */
  scenesOfPost(post: string): string[] | null
}

export function validateExploreConfig(
  slug: string, config: ExploreConfig, ctx: ValidateCtx,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const ids = new Set(config.scenes.map((s) => s.id))

  // 规则1：entry 指向存在的场景
  if (!ids.has(config.entry)) errors.push(`[${slug}] entry="${config.entry}" 不在 scenes 里`)

  // 规则2/3（Answer 存在性 / 未引用 Answer 警告）随 article.mdx 退出而失效；
  // scenes 目录对齐由 validateScenesAlignment 承担（validate-explore.ts 调用）。
  void ctx.answerIds

  // 规则4：demo 存在
  if (!ctx.sceneFileExists) {
    errors.push(`[${slug}] 声明了场景但 scene.tsx 不存在`)
  } else {
    const demos = new Set(ctx.demoNames)
    for (const s of config.scenes) {
      if (!demos.has(s.demo)) errors.push(`[${slug}] 场景 ${s.id} 的 demo="${s.demo}" 不在 scene.tsx 的 demos 导出里`)
    }
  }

  // 规则5：出口目标存在
  for (const s of config.scenes) {
    for (const key of ['features', 'questions'] as const) {
      const list = s[key] ?? []
      list.forEach((e, j) => {
        const where = `${s.id}.${key}[${j}]`
        if (typeof e.to === 'string') {
          if (!ids.has(e.to)) errors.push(`[${slug}] ${where}.to="${e.to}" 不在本文 scenes 里`)
        } else {
          const { post, scene } = e.to
          if (!ctx.knownPosts.includes(post)) {
            errors.push(`[${slug}] ${where}.to.post="${post}" 文章目录不存在`)
            return
          }
          const target = ctx.scenesOfPost(post)
          if (target === null) {
            errors.push(`[${slug}] ${where}.to.post="${post}" 没有 explore.yaml`)
            return
          }
          if (scene === 'entry') return // 保留字：目标 yaml 存在即合法
          if (!target.includes(scene)) errors.push(`[${slug}] ${where}.to 场景 "${scene}" 不在 ${post} 的 scenes 里`)
        }
      })
    }
  }

  return { errors, warnings }
}

/** 出口 → href。本地：#id；跨文章：/blog/<post>/#<scene|entry>（entry 为保留字别名） */
export function resolveExploreHref(to: ExploreTarget, _config: ExploreConfig): string {
  // _config 保留为接口对齐位（Task 5 ExitChips 调用形态所需），当前实现不消费
  if (typeof to === 'string') return `#${to}`
  const sceneId = to.scene === 'entry' ? 'entry' : to.scene
  return `/blog/${to.post}/#${sceneId}`
}

/** 静态扫描 scene.tsx 的 demos 键。书写契约：键在行首缩进≥2，形如 name: { 或 'name': {。 */
export function scanDemoNames(sceneSource: string): string[] {
  const names = new Set<string>()
  const re = /^\s{2,}'?([\w-]+)'?\s*:\s*\{/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(sceneSource)) !== null) {
    if (m[1] !== 'demos') names.add(m[1])
  }
  return [...names]
}

export function slugifyHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

export function getHeadingsWithIds(mdxRaw: string): Array<{ id: string; text: string }> {
  const out: Array<{ id: string; text: string }> = []
  const re = /^(#{1,6})\s+(.+?)(?:\s+\{#([^}]+)\})?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(mdxRaw)) !== null) {
    const text = m[2].trim().replace(/\\([!"#\$%&'\(\)\*\+,\.\/:;<=>\?@\[\]\\^_`\{\|\}~])/g, '$1')
    const id = m[3] || slugifyHeading(text)
    if (id) out.push({ id, text })
  }
  return out
}

/** v3：场景幕序号中文数字（1→一 … 12→十二；>12 按 digit 组合，当前 11 场景够用） */
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
export function toChineseOrdinal(n: number): string {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError(`幕序号必须是正整数: ${n}`)
  if (n < 10) return CN_DIGITS[n]
  if (n === 10) return '十'
  if (n < 20) return `十${CN_DIGITS[n - 10]}`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`
}

/** v5：scenes/<id>.tsx 与 yaml scenes[].id 双向对齐 */
export function validateScenesAlignment(
  slug: string,
  config: ExploreConfig,
  sceneFiles: string[],   // scenes/ 目录下的 .tsx 文件名（含扩展名）
): string[] {
  const errors: string[] = []
  const ids = new Set(config.scenes.map((s) => s.id))
  const files = new Set(sceneFiles.map((f) => f.replace(/\.tsx$/, '')))
  for (const s of config.scenes) if (!files.has(s.id)) errors.push(`[${slug}] 场景 ${s.id} 缺 scenes/${s.id}.tsx`)
  for (const f of files) if (!ids.has(f)) errors.push(`[${slug}] scenes/${f}.tsx 未被 yaml 引用`)
  return errors
}
