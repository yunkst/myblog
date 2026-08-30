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
  buildArchitecture,
  buildRequestFlow,
  buildTieredFlow,
  buildDevFlowArch,
} from './scene-builds'

export const demos: Record<string, Scene> = {
  // ─── 体验型 1：message-flood ───────────────────────────────────────────
  'message-flood': {
    name: 'message-flood',
    Stage: FloodStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      const incoming = ['#b1', '#b2', '#b3', '#b4', '#b5']
      const mine = ['#b-me1', '#b-me2']
      tl.set(incoming, { opacity: 0, y: 14 })
      tl.set(mine, { opacity: 0, y: 14 })
      tl.set(['#flood-line1', '#flood-line2'], { opacity: 0 })

      // 1) 前 3 条消息逐条弹出（越来越快），第 4、5 条留到"我"回复间隙再涌入
      const firstWave = ['#b1', '#b2', '#b3']
      firstWave.forEach((b, i) => {
        tl.to(b, { opacity: 1, y: 0, duration: 0.3 }, i === 0 ? 0.4 : '>')
        if (i < firstWave.length - 1) tl.to({}, { duration: 0.9 - i * 0.14 })
      })

      // 2) 我的第一条回复（被围困但还在硬撑）
      tl.to('#b-me1', { opacity: 1, y: 0, duration: 0.25 }, '+=0.3')
      // 消息不停，第 4、5 条在我回复间隙继续涌入
      tl.to('#b4', { opacity: 1, y: 0, duration: 0.25 }, '+=0.4')
      tl.to({}, { duration: 0.35 })
      tl.to('#b5', { opacity: 1, y: 0, duration: 0.25 })
      // 3) 我的第二条回复：只剩一个字——越来越忙
      tl.to('#b-me2', { opacity: 1, y: 0, duration: 0.2 }, '+=0.3')

      // 4) 气泡堆整体上移溢出，窗体轻震
      tl.to('.mock-chat-body', { y: -60, duration: 0.8 }, '+=0.2')
      tl.to('.mock-chat-pane', { x: 3, duration: 0.05, repeat: 5, yoyo: true }, '<')

      // 5) 静默 + 点题
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
      const inputText = '请给张三开通 BI 看板权限'
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
      //    ConfirmStage 布局实测推算（ChatPane 420 宽，body padding 14，flex gap 10）：
      //    tc-user(37px) → thinking(37) → ask(37) → card 顶部 y=141；
      //    card 宽 300、padding 12/14、head 18 + row 18+6 + btn(32+10)，card 高 108；
      //    按钮 margin-left:auto → 右缘 x=286、宽约 66 → 中心 (253, 221)（内容盒），
      //    加 body padding 偏移 → padding-box 坐标 (267, 235)。
      //    cursor 是 10x12 右向三角，tip 对准按钮中心 → 终点 (257, 229)。
      tl.to('#tc-cursor', { opacity: 1, duration: 0.2 })
      tl.to('#tc-cursor', { x: 257, y: 229, duration: 0.8, ease: 'power1.inOut' })
      tl.to('#tc-btn', { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 })
      tl.set('#tc-light', { backgroundColor: '#0E6E5C' })

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
  'architecture':  { name: 'architecture',  Stage: ArchitectureStage,  build: buildArchitecture },
  'request-flow':  { name: 'request-flow',  Stage: RequestFlowStage,  build: buildRequestFlow },
  'tiered-flow':   { name: 'tiered-flow',   Stage: TieredFlowStage,   build: buildTieredFlow },
  'dev-flow-arch': { name: 'dev-flow-arch', Stage: DevFlowArchStage, build: buildDevFlowArch },
}
