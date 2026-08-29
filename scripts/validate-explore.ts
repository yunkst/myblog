// scripts/validate-explore.ts（v2）
import fs from 'node:fs'
import path from 'node:path'
import {
  parseExploreYaml, validateExploreConfig, scanDemoNames, getRawAnswerIds,
} from '../src/lib/explore'
import type { ExploreConfig } from '../src/lib/types'

const POSTS = path.join(process.cwd(), 'content', 'posts')

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
    return null
  }
  return r.value
}

function knownPosts(): string[] {
  return fs.existsSync(POSTS)
    ? fs.readdirSync(POSTS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
}

function main() {
  let failures = 0
  const warnings: string[] = []
  const posts = knownPosts()

  for (const slug of posts) {
    const config = loadConfig(slug)
    if (!config) continue
    const article = readIfExists(path.join(POSTS, slug, 'article.mdx')) ?? ''
    const sceneSrc = readIfExists(path.join(POSTS, slug, 'scene.tsx'))
    const r = validateExploreConfig(slug, config, {
      answerIds: getRawAnswerIds(article),
      demoNames: sceneSrc ? scanDemoNames(sceneSrc) : [],
      sceneFileExists: sceneSrc !== null,
      knownPosts: posts,
      scenesOfPost: (p) => {
        const t = loadConfig(p)
        return t ? t.scenes.map((s) => s.id) : null
      },
    })
    failures += r.errors.length
    r.errors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m ${e}`))
    warnings.push(...r.warnings)
  }

  console.log(`\n[validate-explore] 失败 ${failures}，警告 ${warnings.length}`)
  warnings.forEach((w) => console.warn(`\x1b[33m!\x1b[0m ${w}`))
  if (failures > 0) process.exit(1)
}

main()