// scripts/validate-explore.ts
//
// 构建期校验脚本：跑 6 条语义规则 + seek_root 兜底。
// 失败即 process.exit(1)，由 package.json 的 prebuild/predev/preview 钩住，
// 让 npm/pnpm 生命周期中断后续阶段。
//
// 实现取舍（参见 controller 裁决）：
//  - loadSceneLabels 总是返回 []：node 侧 require .tsx 不现实（tsx 仅 vite/webpack 默认有）。
//    真实 timeline 由 vite build 阶段 + Explore.tsx 内轻量校验兜底（见 explore.ts 注释）。
//  - 静态扫 .addLabel('xxx') 字面量作为最终输入。
//  - 已知不强保证：作者用变量计算的 label（tl.addLabel(getLabelByState())）脚本认不出来。

import fs from 'node:fs'
import path from 'node:path'
import { listExplorable, getExplore, validateExplore, getRawAnswerIds } from '../src/lib/explore'

const POSTS = path.join(process.cwd(), 'content', 'posts')

/** 静态扫 scene.tsx 中的 .addLabel('xxx') 字面量。
 *  不动态 require .tsx（node 侧无 tsx-loader）。 */
function getTimelineLabelsFromSource(slug: string): string[] {
  const sceneFile = path.join(POSTS, slug, 'scene.tsx')
  if (!fs.existsSync(sceneFile)) return []
  const src = fs.readFileSync(sceneFile, 'utf-8')
  const re = /\.addLabel\(['"`]([^'"`]+)['"`]\)/g
  const labels = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) labels.add(m[1])
  return [...labels]
}

async function main() {
  let failures = 0
  const warnings: string[] = []
  const slugs = listExplorable()
  for (const slug of slugs) {
    const config = getExplore(slug)
    if (!config) continue
    const labels = getTimelineLabelsFromSource(slug)
    const r = validateExplore(slug, labels)
    if (r.errors.length) {
      failures += r.errors.length
      r.errors.forEach((e) => console.error(`\x1b[31m✗\x1b[0m ${e}`))
    }
    if (r.warnings.length) warnings.push(...r.warnings)
    // seek_root 额外校验：seek_root 必须落在 scene labels 里（仅当存在 scene）
    if (config.seek_root && labels.length > 0 && !labels.includes(config.seek_root)) {
      console.error(`\x1b[31m✗\x1b[0m [${slug}] seek_root="${config.seek_root}" 不在 scene timeline labels 里`)
      failures++
    }
    // 软提醒：正文 Answer 数
    const answers = new Set(getRawAnswerIds(slug))
    if (answers.size > 0) warnings.push(`[${slug}] 正文有 ${answers.size} 个 <Answer>，建议确认它们都在 YAML 树里`)
  }
  console.log(`\n[validate-explore] 失败 ${failures}，警告 ${warnings.length}`)
  if (warnings.length) warnings.forEach((w) => console.warn(`\x1b[33m!\x1b[0m ${w}`))
  process.exit(failures > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
