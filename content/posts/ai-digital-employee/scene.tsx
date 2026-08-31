// scene.tsx — ai-digital-employee 探索视图动画舞台（v2 demos 字典）
//
// 15 个 demo：
//   - message-flood, tiered-confirm           体验型（build 内联在本文件）
//   - 其余 9 个                                概念型（build 在 scene-builds.tsx）
//   - architecture, request-flow, tiered-flow, dev-flow-arch
//                                             架构图型（build 在 scene-builds.tsx）
import { gsap } from 'gsap'
import type { Scene } from '../../../src/components/explore/SceneController'
import {
  FloodStage,
  ConfirmStage,
  OpenclawPitfallsStage,
  FourPrerequisitesStage,
  BadgeMetaphorStage,
  ArchitectureStage,
  ProtocolRepoStage,
  UnifiedIdentityStage,
  RequestFlowStage,
  TieredExecutionStage,
  TieredFlowStage,
  ThreatModelStage,
  LimitsStage,
  DevFlowStage,
  DevFlowArchStage,
} from './scene-stages'
import {
  buildOpenclawPitfalls,
  buildFourPrerequisites,
  buildBadgeMetaphor,
  buildProtocolRepo,
  buildUnifiedIdentity,
  buildTieredExecution,
  buildThreatModel,
  buildLimits,
  buildDevFlow,
} from './scene-builds'

export const demos: Record<string, Scene> = {
  // ─── 体验型 1：message-flood ───────────────────────────────────────────
  'message-flood': {
    name: 'message-flood',
    Stage: FloodStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      // DOM 顺序 = 消息到达顺序；opacity 预留槽位（高度在 mount 时已稳定，
      // mode 1 全屏的 scale 按 mount 时的完整高度量，不会随播放溢出）
      const all = ['#b1', '#b2', '#b3', '#b-me1', '#b4', '#b5', '#b6', '#b-me2']
      tl.set(all, { opacity: 0, y: 12 })
      tl.set(['#flood-line1', '#flood-line2'], { opacity: 0 })

      const arrive = (id: string, at: number | string) => {
        tl.to(id, { opacity: 1, y: 0, duration: 0.28 }, at)
      }

      // 1) 前三条自然间隔到达（0.8 / 0.6s——真实群聊的呼吸感）
      arrive('#b1', 0.4)
      arrive('#b2', '+=0.8')
      arrive('#b3', '+=0.6')

      // 2) 我的第一条回复（被围困但还在硬撑）
      arrive('#b-me1', '+=0.9')

      // 3) 我回复的间隙，消息加速涌入（0.35 / 0.3 / 0.25s——失控感）
      arrive('#b4', '+=0.35')
      arrive('#b5', '+=0.3')
      arrive('#b6', '+=0.25')

      // 4) 我的第二条回复：只剩一个字——越来越忙
      arrive('#b-me2', '+=0.5')

      // 5) 气泡堆整体上移溢出，窗体轻震
      tl.to('.mock-chat-body', { y: -70, duration: 0.8 }, '+=0.3')
      tl.to('.mock-chat-pane', { x: 3, duration: 0.05, repeat: 5, yoyo: true }, '<')

      // 6) 静默 + 点题
      tl.to(['.mock-chat-body', '.mock-chat-head'], { opacity: 0.25, duration: 0.6 }, '+=0.4')
      tl.to('#flood-line1', { opacity: 1, duration: 0.8 }, '<+0.3')
      tl.to('#flood-line2', { opacity: 1, duration: 0.8 }, '+=0.9')

      return tl
    },
  },

  // ─── 体验型 2：tiered-confirm ───────────────────────────────────────────
  'tiered-confirm': {
    name: 'tiered-confirm',
    Stage: ConfirmStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.set(['#tc-ai-thinking', '#tc-ai-ask', '#tc-done'], { opacity: 0 })
      tl.set('#tc-card', { opacity: 0, scale: 0.9 })
      // 鼠标从右下角外侧入场（坐标相对 .mock-chat-body padding-box，见 confirm-stage 样式）
      tl.set('#tc-cursor', { x: 300, y: 200, opacity: 0 })

      // 1) 打字机输入
      const inputText = '把《AI 数字员工实践》定时到明早 9 点发布'
      for (let i = 1; i <= inputText.length; i++) {
        tl.call(() => {
          const el = document.getElementById('tc-input')
          if (el) el.textContent = inputText.slice(0, i)
        })
        tl.to({}, { duration: 0.06 })
      }

      // 2) AI thinking（三点闪烁 yoyo）
      tl.to('#tc-ai-thinking', { opacity: 1, duration: 0.2 })
      tl.to('#tc-ai-thinking', { opacity: 0.4, duration: 0.3, repeat: 3, yoyo: true })

      // 3) AI 弹回确认卡
      tl.set('#tc-ai-thinking', { opacity: 0 })
      tl.to('#tc-ai-ask', { opacity: 1, duration: 0.3 })
      tl.to('#tc-card', { opacity: 1, scale: 1, duration: 0.4 })

      // 4) 模拟鼠标移到确认键 + 点击
      //    终点运行时实测（2026-08-31 修复，取代写死的魔法坐标 (257,229)）：
      //    量 #tc-btn 中心相对 .mock-chat-body padding-box 的偏移，再减去
      //    光标 CSS 布局偏移（top/left:14px）和 SVG 箭头尖端在光标盒内的位置
      //    （尖端在 (2,1)，见 MockCursor）。
      //    getBoundingClientRect 会带上 mode 1 全屏时祖先的 scale，需除回去——
      //    GSAP x/y 是元素本地坐标系的 transform，不受祖先 scale 影响。
      const cursorTarget = (): { x: number; y: number } => {
        const btn = document.getElementById('tc-btn')
        const body = btn?.closest('.mock-chat-body')
        const b = btn?.getBoundingClientRect()
        const p = body?.getBoundingClientRect()
        if (!btn || !body || !b || !p || b.width === 0) return { x: 250, y: 220 } // 兜底：粗估值
        const scale = body.offsetWidth > 0 ? p.width / body.offsetWidth : 1
        return {
          x: (b.left - p.left + b.width / 2) / scale - 14 - 2,
          y: (b.top - p.top + b.height / 2) / scale - 14 - 1,
        }
      }
      tl.to('#tc-cursor', { opacity: 1, duration: 0.2 })
      tl.to('#tc-cursor', {
        x: () => cursorTarget().x,
        y: () => cursorTarget().y,
        duration: 0.8,
        ease: 'power1.inOut',
      })
      tl.to('#tc-btn', { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 })
      tl.set('#tc-light', { backgroundColor: '#07C160' })
      // 卡片状态翻转为「已确认」
      tl.call(() => {
        const b = document.getElementById('tc-btn')
        if (b) { b.textContent = '已确认 ✓'; b.style.color = '#9A9A9A' }
      })

      // 5) 完成
      tl.to('#tc-done', { opacity: 1, duration: 0.4 })
      tl.to('#tc-cursor', { opacity: 0, duration: 0.3 }, '<')

      return tl
    },
  },

  // ─── 概念型 9 个（Stage 见 scene-stages.tsx，build 见 scene-builds.tsx） ──
  'openclaw-pitfalls':  { name: 'openclaw-pitfalls',  Stage: OpenclawPitfallsStage,  build: buildOpenclawPitfalls },
  'four-prerequisites': { name: 'four-prerequisites', Stage: FourPrerequisitesStage, build: buildFourPrerequisites },
  'badge-metaphor':     { name: 'badge-metaphor',     Stage: BadgeMetaphorStage,     build: buildBadgeMetaphor },
  'protocol-repo':      { name: 'protocol-repo',      Stage: ProtocolRepoStage,      build: buildProtocolRepo },
  'unified-identity':   { name: 'unified-identity',   Stage: UnifiedIdentityStage,   build: buildUnifiedIdentity },
  'tiered-execution':   { name: 'tiered-execution',   Stage: TieredExecutionStage,   build: buildTieredExecution },
  'threat-model':       { name: 'threat-model',       Stage: ThreatModelStage,       build: buildThreatModel },
  'limits':             { name: 'limits',             Stage: LimitsStage,            build: buildLimits },
  'dev-flow':           { name: 'dev-flow',           Stage: DevFlowStage,           build: buildDevFlow },

  // ─── 架构图型 4 个（从原幕拆出；mode 2 文字先行 → 容器淡入） ──
  'architecture':  { name: 'architecture',  Stage: ArchitectureStage,  build: () => buildArchFade('[data-arch="architecture"]') },
  'request-flow':  { name: 'request-flow',  Stage: RequestFlowStage,  build: () => buildArchFade('[data-arch="request-flow"]') },
  'tiered-flow':   { name: 'tiered-flow',   Stage: TieredFlowStage,   build: () => buildArchFade('[data-arch="tiered-flow"]') },
  'dev-flow-arch': { name: 'dev-flow-arch', Stage: DevFlowArchStage, build: () => buildArchFade('[data-arch="dev-flow-arch"]') },
}

/** 架构图 demo 统一演出：stage 容器淡入 + 轻微上移（mode 2 的 demo 段）。
 * 4 个架构图 build 结构完全相同，收敛到这里——selector 为 stage 根元素选择器。 */
function buildArchFade(rootSel: string) {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set(rootSel, { opacity: 0, y: 16 })
  tl.to(rootSel, { opacity: 1, y: 0, duration: 0.7 })
  return tl
}
