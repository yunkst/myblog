// scene.tsx — mybi 探索视图动画舞台
//
// 8 个 demo:
//   bi-overview                      体验型（mode 1，本文件内联 build + Stage）
//   sentence-to-board ... end-to-end 架构图型(ArchDiagram)
import { gsap } from 'gsap'
import type { Scene } from '@/components/explore/SceneController'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import {
  OverviewStage,
  SentenceStage,
  RuntimeStage,
  SchemaStage,
  ErrorsStage,
  SqlStage,
  SemanticStage,
  FlowStage,
} from './scene-stages'

export const demos: Record<string, Scene> = {
  // ─── 体验型 1:bi-overview(用户一句话 → AI 产出看板) ──────────────
  'bi-overview': {
    name: 'bi-overview',
    Stage: OverviewStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

      // 0) 初始隐藏
      tl.set(['#mb-typing', '#mb-typing-cursor'], { opacity: 0 })
      tl.set(['#mb-tool', '#mb-tool2', '#mb-tool3'], { opacity: 0, y: 6 })
      tl.set('#mb-board', { opacity: 0, y: 12, scale: 0.98 })
      tl.set(['#mb-board-h', '#mb-board-chart', '#mb-board-bars', '#mb-board-pub'], { opacity: 0 })
      tl.set('#mb-pub', { opacity: 0 })

      // 1) 用户输入框浮现 + 输入文字(打字机效果)
      tl.to('#mb-typing', { opacity: 1, duration: 0.25 }, 0.2)
      // 模拟逐字出现:分多段 set + to 控制
      tl.to('#mb-typing-cursor', { opacity: 1, duration: 0.01 }, 0.25)
      tl.to('#mb-typing-text-1', { opacity: 1, duration: 0.18 }, 0.35)
      tl.to('#mb-typing-text-2', { opacity: 1, duration: 0.18 }, 0.55)
      tl.to('#mb-typing-text-3', { opacity: 1, duration: 0.18 }, 0.75)
      tl.to('#mb-typing-text-4', { opacity: 1, duration: 0.18 }, 0.95)
      tl.to('#mb-typing-text-5', { opacity: 1, duration: 0.18 }, 1.15)
      tl.to('#mb-typing-cursor', { opacity: 0, duration: 0.01 }, 1.45)

      // 2) AI 思考中...
      tl.to('#mb-thinking', { opacity: 1, duration: 0.2 }, 1.55)
      tl.to('#mb-thinking', { opacity: 0, duration: 0.25 }, '+=1.2')

      // 3) 三个工具卡依次闪烁
      tl.to('#mb-tool', { opacity: 1, y: 0, duration: 0.35 }, '+=0.05')
      tl.to('#mb-tool', { boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.35)', duration: 0.18 }, '+=0.05')
      tl.to('#mb-tool', { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)', duration: 0.4 }, '+=0.05')

      tl.to('#mb-tool2', { opacity: 1, y: 0, duration: 0.35 }, '+=0.1')
      tl.to('#mb-tool2', { boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.35)', duration: 0.18 }, '+=0.05')
      tl.to('#mb-tool2', { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)', duration: 0.4 }, '+=0.05')

      tl.to('#mb-tool3', { opacity: 1, y: 0, duration: 0.35 }, '+=0.1')
      tl.to('#mb-tool3', { boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.45)', duration: 0.18 }, '+=0.05')
      tl.to('#mb-tool3', { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)', duration: 0.4 }, '+=0.05')

      // 4) 看板浮现
      tl.to('#mb-board', { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' }, '+=0.2')
      // 看板头部 → 折线图 → 柱图 → 发布按钮依次显形
      tl.to('#mb-board-h', { opacity: 1, duration: 0.25 }, '+=0.1')
      tl.to('#mb-board-chart', { opacity: 1, duration: 0.4 }, '+=0.15')
      tl.to('#mb-board-bars', { opacity: 1, duration: 0.4 }, '+=0.2')

      // 折线图自身绘图动画:从左到右逐点出现(用 strokeDasharray 简化)
      tl.set('#mb-line-path', { strokeDasharray: 600, strokeDashoffset: 600 }, '+=0.0')
      tl.to('#mb-line-path', { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' }, '<')

      // 柱图从底向上生长
      tl.set(['#mb-bar-1', '#mb-bar-2', '#mb-bar-3', '#mb-bar-4', '#mb-bar-5'], { scaleY: 0, transformOrigin: '50% 100%' }, '+=0.0')
      tl.to(['#mb-bar-1', '#mb-bar-2', '#mb-bar-3', '#mb-bar-4', '#mb-bar-5'], { scaleY: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' }, '<')

      // 5) 发布按钮
      tl.to('#mb-pub', { opacity: 1, duration: 0.3 }, '+=0.4')

      return tl
    },
  },

  // ─── 架构图型(共用 buildArchFade) ────────────────────────────
  'sentence-to-board':{ name: 'sentence-to-board',Stage: SentenceStage,   build: () => buildArchFade('[data-arch="sentence-to-board"]') },
  'spec-render':      { name: 'spec-render',      Stage: RuntimeStage,    build: () => buildArchFade('[data-arch="spec-render"]') },
  'schema-contract':  { name: 'schema-contract',  Stage: SchemaStage,     build: () => buildArchFade('[data-arch="schema-contract"]') },
  'error-loop':       { name: 'error-loop',       Stage: ErrorsStage,     build: () => buildArchFade('[data-arch="error-loop"]') },
  'sql-gate':         { name: 'sql-gate',         Stage: SqlStage,        build: () => buildArchFade('[data-arch="sql-gate"]') },
  'semantic-search':  { name: 'semantic-search',  Stage: SemanticStage,   build: () => buildArchFade('[data-arch="semantic-search"]') },
  'end-to-end':       { name: 'end-to-end',       Stage: FlowStage,       build: () => buildArchFade('[data-arch="end-to-end"]') },
}