// scene.tsx — myblog demos 字典（键名 = explore.yaml 的 scenes[].demo）
import type { Scene } from '@/components/explore/SceneController'
import { gsap } from 'gsap'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import { OverviewStage, EngineStage, DiagramStage, ContentStage, VisionStage } from './scene-stages'

/** vision-chain：四步推理逐条浮现，最后一条（结论）加粗 */
function buildVision() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const items = '[data-concept="vision-chain"] .concept-item'
  const nos = '[data-concept="vision-chain"] .concept-no'
  tl.set(items, { opacity: 0, y: 12 })
  tl.set(nos, { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' })
  tl.to(items, { opacity: 1, y: 0, duration: 0.45, stagger: 0.6 })
  tl.to(nos, { backgroundColor: '#0E6E5C', color: '#FFFFFF', duration: 0.3, stagger: 0.6 }, '<')
  tl.call(() => {
    const last = document.querySelector<HTMLElement>(
      '[data-concept="vision-chain"] .concept-item[data-idx="3"] .concept-text',
    )
    if (last) last.style.fontWeight = '700'
  }, [], '+=0.2')
  return tl
}

export const demos: Record<string, Scene> = {
  'vision-chain':     { name: 'vision-chain',     Stage: VisionStage,   build: buildVision },
  'blog-overview':    { name: 'blog-overview',    Stage: OverviewStage, build: () => buildArchFade('[data-arch="blog-overview"]') },
  'scene-engine':     { name: 'scene-engine',     Stage: EngineStage,   build: () => buildArchFade('[data-arch="scene-engine"]') },
  'arch-engine':      { name: 'arch-engine',      Stage: DiagramStage,  build: () => buildArchFade('[data-arch="arch-engine"]') },
  'content-as-data':  { name: 'content-as-data',  Stage: ContentStage,  build: () => buildArchFade('[data-arch="content-as-data"]') },
}
