// scene.tsx — ai-era-interview demos 字典（键名 = explore.yaml 的 scenes[].demo）
import type { Scene } from '@/components/explore/SceneController'
import { gsap } from 'gsap'
import {
  HorseComicStage, ReverseFilterStage, Route1Stage,
  OpenAiStage, QuestionDesignStage, ObserveFourStage, ObjectionsStage,
} from './scene-stages'

/** 概念型模板：逐条 stagger 浮现（与兄弟文章同一套节奏） */
function buildConcept(concept: string) {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const items = `[data-concept="${concept}"] .concept-item`
  const nos = `[data-concept="${concept}"] .concept-no`
  tl.set(items, { opacity: 0, y: 12 })
  tl.set(nos, { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' })
  tl.to(items, { opacity: 1, y: 0, duration: 0.45, stagger: 0.55 })
  tl.to(nos, { backgroundColor: '#0E6E5C', color: '#FFFFFF', duration: 0.3, stagger: 0.55 }, '<')
  return tl
}

/** horse-comic（mode 1）：两格分镜按比方节奏逐格揭示——先考场骑马，后考场外的汽车 */
function buildHorseComic() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set(['#hc-1', '#hc-2'], { opacity: 0, y: 18 })
  tl.to('#hc-1', { opacity: 1, y: 0, duration: 0.7 })
  tl.to({}, { duration: 0.6 })
  tl.to('#hc-2', { opacity: 1, y: 0, duration: 0.7 })
  return tl
}

/** reverse-filter：单格淡入 */
function buildReverseFilter() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#rf-1', { opacity: 0, y: 18 })
  tl.to('#rf-1', { opacity: 1, y: 0, duration: 0.8 })
  return tl
}

export const demos: Record<string, Scene> = {
  'horse-comic':     { name: 'horse-comic',     Stage: HorseComicStage,     build: buildHorseComic },
  'route-1-fails':   { name: 'route-1-fails',   Stage: Route1Stage,         build: () => buildConcept('route-1-fails') },
  'reverse-filter':  { name: 'reverse-filter',  Stage: ReverseFilterStage,  build: buildReverseFilter },
  'open-ai':         { name: 'open-ai',         Stage: OpenAiStage,         build: () => buildConcept('open-ai') },
  'question-design': { name: 'question-design', Stage: QuestionDesignStage, build: () => buildConcept('question-design') },
  'observe-four':    { name: 'observe-four',    Stage: ObserveFourStage,    build: () => buildConcept('observe-four') },
  'objections':      { name: 'objections',      Stage: ObjectionsStage,     build: () => buildConcept('objections') },
}
