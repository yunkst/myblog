// scene.tsx — study-buddy 探索视图动画舞台（v2 demos 字典）
//
// 10 个 demo：
//   - snapshot-flow, why-teach                     体验型（mode 1，build 内联在本文件）
//   - intro-overview, knowledge-graph, fsrs-review,
//     plan-flow, focus-report                      定制概念型（build 在 scene-builds.tsx）
//   - agent-principle, scheduler-principle,
//     local-first-principle                        架构图型（ArchDiagram 容器淡入）
import { gsap } from 'gsap'
import type { Scene } from '@/components/explore/SceneController'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import {
  IntroStage,
  SnapshotStage,
  WhyTeachStage,
  KnowledgeStage,
  ReviewStage,
  PlanStage,
  FocusStage,
  AgentStage,
  SchedulerStage,
  LocalFirstStage,
} from './scene-stages'
import {
  buildIntro,
  buildKnowledge,
  buildReview,
  buildPlan,
  buildFocus,
} from './scene-builds'

export const demos: Record<string, Scene> = {
  // ─── 体验型 1：snapshot-flow（拍题问 AI） ────────────────────────────
  'snapshot-flow': {
    name: 'snapshot-flow',
    Stage: SnapshotStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.set(['#sb-parse', '#sb-answer', '#sb-toast'], { opacity: 0 })
      tl.set('#sb-parse-bar', { width: '0%' })
      tl.set('#sb-ask-btn', { opacity: 0, scale: 0.9 })

      // 1) 照片示意行加载
      tl.set('#sb-photo .sb-photo-line, #sb-photo .sb-photo-formula', { opacity: 0, y: 6 })
      tl.to('#sb-photo .sb-photo-line, #sb-photo .sb-photo-formula', { opacity: 1, y: 0, duration: 0.25, stagger: 0.12 }, 0.3)

      // 2) 问 AI 按钮浮出 + 点击
      tl.to('#sb-ask-btn', { opacity: 1, scale: 1, duration: 0.4 }, '+=0.2')
      tl.to('#sb-ask-btn', { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 }, '+=0.4')

      // 3) 解析进度条
      tl.to('#sb-parse', { opacity: 1, duration: 0.3 }, '+=0.2')
      tl.to('#sb-parse-bar', { width: '100%', duration: 1.5, ease: 'power1.inOut' })

      // 4) 解析结果
      tl.to('#sb-parse', { opacity: 0, duration: 0.25 })
      tl.to('#sb-answer', { opacity: 1, duration: 0.4 })

      // 5) 知识点入库
      tl.to('#sb-toast', { opacity: 1, duration: 0.4 }, '+=0.5')
      return tl
    },
  },

  // ─── 体验型 2：why-teach（苏格拉底式反问教学） ──────────────────────
  'why-teach': {
    name: 'why-teach',
    Stage: WhyTeachStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.set(['#wy-q1', '#wy-a1', '#wy-q2', '#wy-aha'], { opacity: 0, y: 8 })
      tl.set('#wy-opts .sb-ask-opt', { opacity: 0, y: 8 })
      tl.set('#wy-save', { opacity: 0 })

      // 1) AI 抛出场景反问（不给答案）
      tl.to('#wy-q1', { opacity: 1, y: 0, duration: 0.4 }, 0.3)
      // 2) ask_user 选项卡
      tl.to('#wy-opts .sb-ask-opt', { opacity: 1, y: 0, duration: 0.3, stagger: 0.15 }, '+=0.5')
      // 3) 用户选「往前倒」
      tl.to('#wy-opts .sb-ask-opt[data-opt="a"]', { borderColor: 'var(--accent)', color: 'var(--accent)', duration: 0.25 }, '+=0.7')
      tl.to('#wy-a1', { opacity: 1, y: 0, duration: 0.3 }, '+=0.2')
      // 4) AI 顺着回答追问
      tl.to('#wy-q2', { opacity: 1, y: 0, duration: 0.4 }, '+=0.6')
      // 5) 用户自己推出答案（啊哈时刻）
      tl.to('#wy-aha', { opacity: 1, y: 0, duration: 0.4 }, '+=0.6')
      // 6) 讲透的内容写回知识点
      tl.to('#wy-save', { opacity: 1, duration: 0.4 }, '+=0.3')
      return tl
    },
  },

  // ─── 定制概念型 5 个 ────────────────────────────────────────────────
  'intro-overview':  { name: 'intro-overview',  Stage: IntroStage,     build: buildIntro },
  'knowledge-graph': { name: 'knowledge-graph', Stage: KnowledgeStage, build: buildKnowledge },
  'fsrs-review':     { name: 'fsrs-review',     Stage: ReviewStage,    build: buildReview },
  'plan-flow':       { name: 'plan-flow',       Stage: PlanStage,      build: buildPlan },
  'focus-report':    { name: 'focus-report',    Stage: FocusStage,     build: buildFocus },

  // ─── 架构图型 3 个（mode 2 文字先行 → 容器淡入） ─────────────────────
  'agent-principle':       { name: 'agent-principle',       Stage: AgentStage,       build: () => buildArchFade('[data-arch="agent-principle"]') },
  'scheduler-principle':   { name: 'scheduler-principle',   Stage: SchedulerStage,   build: () => buildArchFade('[data-arch="scheduler-principle"]') },
  'local-first-principle': { name: 'local-first-principle', Stage: LocalFirstStage,  build: () => buildArchFade('[data-arch="local-first-principle"]') },
}

/* 架构图 demo 演出已收敛到共享实现 src/components/blog-anim/buildArchFade.ts */
