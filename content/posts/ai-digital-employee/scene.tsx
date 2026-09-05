// scene.tsx — ai-digital-employee 探索视图动画舞台（v2 demos 字典）
//
// 11 个 demo：
//   - message-flood, tiered-confirm           体验型（build 内联在本文件）
//   - 其余 9 个                                概念型（build 在 scene-builds.tsx）
//     其中 badge-metaphor / unified-identity / tiered-execution / dev-flow
//     的 Stage 内嵌架构图，build 末尾由 appendArchFade 淡入收尾
import { gsap } from 'gsap'
import type { Scene } from '@/components/explore/SceneController'
import {
  FloodStage,
  ConfirmStage,
  OpenclawPitfallsStage,
  FourPrerequisitesStage,
  BadgeMetaphorStage,
  ProtocolRepoStage,
  UnifiedIdentityStage,
  TieredExecutionStage,
  DevFlowStage,
  ToolSearchStage,
  AuditTrailStage,
} from './scene-stages'
import { typeInto } from '@/components/blog-anim/typeInto'
import {
  buildOpenclawPitfalls,
  buildFourPrerequisites,
  buildBadgeMetaphor,
  buildProtocolRepo,
  buildUnifiedIdentity,
  buildTieredExecution,
  buildDevFlow,
  buildToolSearch,
  buildAuditTrail,
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

      // 5) 气泡堆整体上移溢出，窗体轻震——动画到此结束（2026-09-03 用户裁定：
      //    底部点题句没有必要，震完即终态）
      tl.to('.mock-chat-body', { y: -70, duration: 0.8 }, '+=0.3')
      tl.to('.mock-chat-pane', { x: 3, duration: 0.05, repeat: 5, yoyo: true }, '<')

      return tl
    },
  },

  // ─── 体验型 2：tiered-confirm ───────────────────────────────────────────
  'tiered-confirm': {
    name: 'tiered-confirm',
    Stage: ConfirmStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.set('#tc-user', { opacity: 0, y: 8 })
      tl.set(['#tc-ai-thinking', '#tc-done'], { opacity: 0 })
      tl.set('#tc-card', { opacity: 0, scale: 0.9 })
      // 鼠标从右下角外侧入场（坐标相对 .mock-chat-body padding-box，见 aic-* 样式）
      tl.set('#tc-cursor', { x: 300, y: 200, opacity: 0 })

      // 1) 输入栏打字（与 Stage 的 #tc-user 气泡文案一致：清除订单绑定关联）
      //    共享 typeInto helper（stepSec=0.06），见 src/components/blog-anim/typeInto.ts
      typeInto(tl, 'tc-input', '清除订单 A123456 的绑定关联', 0.06)

      // 2) 发送：输入栏清空，用户气泡出现
      tl.call(() => {
        const el = document.getElementById('tc-input')
        if (el) el.textContent = ''
      })
      tl.to('#tc-user', { opacity: 1, y: 0, duration: 0.3 })

      // 3) AI thinking（三点闪烁 yoyo）
      tl.to('#tc-ai-thinking', { opacity: 1, duration: 0.2 })
      tl.to('#tc-ai-thinking', { opacity: 0.4, duration: 0.3, repeat: 3, yoyo: true })

      // 4) AI 弹回确认卡
      tl.set('#tc-ai-thinking', { opacity: 0 })
      tl.to('#tc-card', { opacity: 1, scale: 1, duration: 0.4 })

      // 5) 模拟鼠标移到确认键 + 点击
      //    终点运行时实测：量 #tc-btn 中心相对 .mock-chat-body padding-box 的偏移，
      //    再减去光标 CSS 布局偏移（top/left:14px）和 SVG 箭头尖端在光标盒内的位置
      //    （尖端在 (2,1)，见 MockCursor）。
      //    getBoundingClientRect 会带上 mode 1 全屏时祖先的 scale，需除回去——
      //    GSAP x/y 是元素本地坐标系的 transform，不受祖先 scale 影响。
      const cursorTarget = (): { x: number; y: number } => {
        const btn = document.getElementById('tc-btn')
        const body = btn?.closest<HTMLElement>('.mock-chat-body')
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
      // 卡片状态翻转为「已确认」
      tl.call(() => {
        const b = document.getElementById('tc-btn')
        if (b) { b.textContent = '已确认 ✓'; b.style.opacity = '0.55' }
      })

      // 6) 完成
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
  'dev-flow':           { name: 'dev-flow',           Stage: DevFlowStage,           build: buildDevFlow },
  'tool-search':        { name: 'tool-search',        Stage: ToolSearchStage,        build: buildToolSearch },
  'audit-trail':        { name: 'audit-trail',        Stage: AuditTrailStage,        build: buildAuditTrail },
}

/* 架构图不再单独成 demo——4 张图内嵌在对应概念 Stage 里（.stage-arch），
 * 由各自 build 末尾的 appendArchFade 淡入；图内揭示动画的重播仍走
 * ARCH_REPLAY_EVENT（见 scene-builds.tsx），灯箱「从头播放」时同步重播。 */
