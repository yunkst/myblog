// scripts/validate-explore.ts（v5 Task 9：scenes 双向对齐 + meta 必填校验）
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import {
  parseExploreYaml, validateExploreConfig,
  validateScenesAlignment,
} from '../src/lib/explore'
import type { ExploreConfig } from '../src/lib/types'

const POSTS = path.join(process.cwd(), 'content', 'posts')

/** meta.yaml 形状（宽松）：仅校验 title/date 两个必填键，其余键不关心。 */
type MetaYaml = { title?: unknown; date?: unknown } & Record<string, unknown>

/** yaml date 是 string（"2026-08-29"）或 Date（无引号日期字面量经 js-yaml 解析）——
 * content.ts 同款归一化：取 ISO 前 10 位，两种来源产出一致的 YYYY-MM-DD。 */
function normalizeDate(d: unknown): string | null {
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  if (typeof d === 'string' && d.trim()) return d.slice(0, 10)
  return null
}

function readIfExists(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null
}

function loadConfig(slug: string): ExploreConfig | null {
  const raw = readIfExists(path.join(POSTS, slug, 'explore.yaml'))
  if (raw === null) return null
  const r = parseExploreYaml(raw)
  if (!r.ok) {
    console.error(`\x1b[31m✗\x1b[0m [${slug}] ${r.error}`)
    process.exitCode = 1
  }
  return r.ok ? r.value : null
}

function knownPosts(): string[] {
  return fs.existsSync(POSTS)
    ? fs.readdirSync(POSTS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
}

function listSceneFiles(slug: string): string[] {
  const dir = path.join(POSTS, slug, 'scenes')
  if (!fs.existsSync(dir)) return []
  /* *.test.tsx 与 *.test.ts 都是测试工件——与 SceneRoute.tsx 的 import.meta.glob
   * 负向 pattern 完全对齐,避免 validate 把测试文件当场景的规则漂移。 */
  return fs.readdirSync(dir).filter((f) => f.endsWith('.tsx')
    && !f.endsWith('.test.tsx') && !f.endsWith('.test.ts'))
}

function main() {
  let failures = 0
  const warnings: string[] = []
  const posts = knownPosts()

  for (const slug of posts) {
    // meta.yaml 必填校验（title + date）
    const metaRaw = readIfExists(path.join(POSTS, slug, 'meta.yaml'))
    if (metaRaw === null) {
      console.error(`\x1b[31m✗\x1b[0m [${slug}] 缺 meta.yaml`)
      failures++
    } else {
      let metaOk = true
      let meta: MetaYaml = {}
      try {
        const parsed = yaml.load(metaRaw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml 顶层必须是对象`)
          failures++
          metaOk = false
        }
        meta = parsed as MetaYaml
      } catch (e: any) {
        console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml 解析失败：${e.message}`)
        failures++
        metaOk = false
      }
      if (metaOk) {
        if (typeof meta.title !== 'string' || !meta.title.trim()) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml 缺 title`)
          failures++
        }
        const date = normalizeDate(meta.date)
        if (!date) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml 缺 date（必须是 string 或 Date）`)
          failures++
        }
        /* yaml 声明 slug 时必须与目录名一致——运行时以目录名为准(content.ts),
         * 漂移会导致 SSG 路径与 scenes glob key 失配。 */
        if (meta.slug !== undefined && String(meta.slug) !== slug) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml slug="${String(meta.slug)}" 与目录名不一致(运行时以目录名为准)`)
          failures++
        }
      }
    }

    const config = loadConfig(slug)
    if (!config) continue
    const r = validateExploreConfig(slug, config, {
      knownPosts: posts,
      scenesOfPost: (p) => {
        const t = loadConfig(p)
        return t ? t.scenes.map((s) => s.id) : null
      },
    })

    // scenes/ 双向对齐（替换 T7 跳过的规则 2/3）
    const sceneFileErrors = validateScenesAlignment(slug, config, listSceneFiles(slug))

    failures += r.errors.length + sceneFileErrors.length
    r.errors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m ${e}`))
    sceneFileErrors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m ${e}`))
    warnings.push(...r.warnings)
  }

  // faqs.yaml 一致性:跨文章 target 的 slug 必须真实存在(MDX 退役删文后,这里是死链防线)
  const faqsPath = path.join(process.cwd(), 'content', 'faqs.yaml')
  if (fs.existsSync(faqsPath)) {
    const faqs = yaml.load(fs.readFileSync(faqsPath, 'utf-8')) as
      | { id?: unknown; target?: unknown }[]
      | null
    if (Array.isArray(faqs)) {
      for (const f of faqs) {
        if (typeof f?.target !== 'string') continue
        const m = f.target.match(/^\/blog\/([^/#]+)\/#/)
        if (!m) continue
        if (!posts.includes(m[1])) {
          console.error(`\x1b[31m✗\x1b[0m [faqs] ${String(f.id ?? '?')} 的 target 指向不存在的文章目录: ${m[1]}`)
          failures++
        }
      }
    }
  }

  console.log(`\n[validate-explore] 失败 ${failures}，警告 ${warnings.length}`)
  warnings.forEach((w) => console.warn(`\x1b[33m!\x1b[0m ${w}`))
  if (failures > 0) process.exit(1)
}

main()
