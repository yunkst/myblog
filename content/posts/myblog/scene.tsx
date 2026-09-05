// scene.tsx — myblog demos 字典（键名 = explore.yaml 的 scenes[].demo）
import type { Scene } from '@/components/explore/SceneController'
import { gsap } from 'gsap'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import { typeInto } from '@/components/blog-anim/typeInto'
import { OverviewStage, EngineStage, DiagramStage, ContentStage, VisionStage } from './scene-stages'

/**
 * vision-chain（mode 1）：CLI 打字需求 → agent 步骤逐行打勾 → CLI 收缩、
 * 网页区生长（URL → 标题 → 正文打字 → 演示区点亮）→ 收尾字幕。
 * 打字节奏与 tiered-confirm 同一套（tl.call 逐字写 textContent）。
 */
function buildVision() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const steps = '.vs-step'
  tl.set(steps, { opacity: 0, x: -8 })
  tl.set('#vs-page', { opacity: 0, y: 20, scale: 0.96, transformOrigin: 'top center' })
  tl.set(['#vs-url', '#vs-scene-title'], { opacity: 0 })
  tl.set('#vs-caption', { opacity: 0 })

  // 1) CLI 需求逐字打出（共享 helper，与 tiered-confirm / rewrite-flow 同节奏）
  typeInto(tl, 'vs-prompt', '给这篇文章加一个开头，解释为什么博客不该只是长文')

  // 2) agent 工作流：步骤逐行出现（末行是测试通过——护栏）
  tl.to(steps, { opacity: 1, x: 0, duration: 0.35, stagger: 0.5 }, '+=0.2')

  // 3) CLI 收缩退场，网页区生长
  tl.to('#vs-cli', { scale: 0.88, opacity: 0.3, duration: 0.6 }, '+=0.4')
  tl.to('#vs-page', { opacity: 1, y: 0, scale: 1, duration: 0.6 }, '<+0.1')
  tl.to('#vs-url', { opacity: 1, duration: 0.3 })
  tl.to('#vs-scene-title', { opacity: 1, duration: 0.4 })

  // 4) 新场景内容组装：正文打字 → 演示区点亮（文本 = 本幕正文第一句）
  typeInto(tl, 'vs-scene-text', '个人博客是高度定制化的东西……')
  tl.call(() => { document.getElementById('vs-scene-demo')?.classList.add('is-lit') })
  tl.to({}, { duration: 0.4 })

  // 5) 收尾字幕：把论点钉死
  tl.to('#vs-caption', { opacity: 1, duration: 0.6 })
  return tl
}

export const demos: Record<string, Scene> = {
  'vision-chain':     { name: 'vision-chain',     Stage: VisionStage,   build: buildVision },
  'blog-overview':    { name: 'blog-overview',    Stage: OverviewStage, build: () => buildArchFade('[data-arch="blog-overview"]') },
  'scene-engine':     { name: 'scene-engine',     Stage: EngineStage,   build: () => buildArchFade('[data-arch="scene-engine"]') },
  'arch-engine':      { name: 'arch-engine',      Stage: DiagramStage,  build: () => buildArchFade('[data-arch="arch-engine"]') },
  'content-as-data':  { name: 'content-as-data',  Stage: ContentStage,  build: () => buildArchFade('[data-arch="content-as-data"]') },
}
