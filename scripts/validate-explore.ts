// scripts/validate-explore.ts
//
// 构建期校验脚本：跑 6 条语义规则 + seek_root 兜底。
// 失败即 process.exit(1)，由 package.json 的 prebuild/predev/prepreview 钩住，
// 让 npm/pnpm 生命周期中断后续阶段。
//
// 实现取舍（参见 controller 裁决）：
//  - loadSceneLabels 总是返回 []：node 侧 require .tsx 不现实（tsx 仅 vite/webpack 默认有）。
//  - 运行时现状：SceneClip/SceneController 用真实 GSAP tl.labels 做 seek/截断，
//    seek 到不存在 label 时走 reduced/静默分支——**运行时没有二次语义校验**。
//  - 因此本脚本是唯一防线，挂在 prebuild/predev/prepreview 三个生命周期各跑一次；
//    静态扫漏报即漏报，无后续兜底。发现报错必须当场修，不能指望下游拦截。
//  - 静态扫 .addLabel('xxx') 字面量作为最终输入。
//  - 已知不强保证：作者用变量计算的 label（tl.addLabel(getLabelByState())）脚本认不出来。

import fs from 'node:fs'
import path from 'node:path'
import { listExplorable, getExplore, validateExplore, getRawAnswerIds } from '../src/lib/explore'

const POSTS = path.join(process.cwd(), 'content', 'posts')

/** 静态扫 scene.tsx 中的 .addLabel('xxx') 字面量。
 *  支持 GSAP 标准签名 addLabel(name, position?)：name 用同引号包裹，
 *  position 任意字面量（数字、字符串、变量调用、模板字符串都放过）。
 *  不动态 require .tsx（node 侧无 tsx-loader）。
 *
 *  已知不强保证：作者用变量计算的 label 名（tl.addLabel(getLabelByState())）
 *  静态扫认不出来——这是字符串拼接的本质局限，不在正则精度范围内。
 */
function getTimelineLabelsFromSource(slug: string): string[] {
  const sceneFile = path.join(POSTS, slug, 'scene.tsx')
  if (!fs.existsSync(sceneFile)) return []
  const src = fs.readFileSync(sceneFile, 'utf-8')
  // 匹配 .addLabel('name') / .addLabel("name", 0.5) / .addLabel(`name`, i*2)
  // 第一组捕获引号字符；第二组捕获 label 名；可选第三组吞掉剩余参数。
  const re = /\.addLabel\(\s*(['"`])([^'"`]+)\1\s*(?:,[^)]*)?\)/g
  const labels = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) labels.add(m[2])
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
