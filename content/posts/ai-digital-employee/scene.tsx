// scene.tsx — ai-digital-employee 探索视图动画舞台（v2 demos 字典）
//
// 11 个 demo：
//   - message-flood    体验型：群消息洪水 + 点题字幕
//   - tiered-confirm   体验型：一次"安全写"确认卡流程
//   - 其余 9 个        stub：Task 7 替换为真实可视化
import { gsap } from 'gsap'
import type { Scene } from '../../../src/components/explore/SceneController'
import { FloodStage, ConfirmStage } from './scene-stages'

/** 概念型 demo 占位 Stage（Task 7 替换为真实可视化） */
function stubStage(label: string) {
  return function Stub() {
    return <div className="demo-stub" data-demo-stub={label}>{label}</div>
  }
}

/** stub 用 build：0.1s 静默 timeline（满足 validator 规则 4 + smoke 测试 duration > 0） */
function stubBuild(): gsap.core.Timeline {
  return gsap.timeline().to({}, { duration: 0.1 })
}

export const demos: Record<string, Scene> = {
  // ─── 体验型 1：message-flood ────────────────────────────────────────────
  'message-flood': {
    name: 'message-flood',
    Stage: FloodStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      const bubbles = ['#b1', '#b2', '#b3', '#b4', '#b5']
      tl.set(bubbles, { opacity: 0, y: 14 })
      tl.set(['#flood-line1', '#flood-line2'], { opacity: 0 })

      // 1) 消息逐条弹出，越来越快（0.9 → 0.35 间隔）
      bubbles.forEach((b, i) => {
        tl.to(b, { opacity: 1, y: 0, duration: 0.3 }, i === 0 ? 0.4 : '>')
        if (i < bubbles.length - 1) tl.to({}, { duration: 0.9 - i * 0.14 })
      })

      // 2) 气泡堆整体上移溢出，窗体轻震
      tl.to('.mock-chat-body', { y: -60, duration: 0.8 }, '+=0.2')
      tl.to('.mock-chat-pane', { x: 3, duration: 0.05, repeat: 5, yoyo: true }, '<')

      // 3) 静默 + 点题
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

  // ─── 9 个 stub（Task 7 替换） ──────────────────────────────────────────
  'openclaw-pitfalls':  { name: 'openclaw-pitfalls',  Stage: stubStage('openclaw-pitfalls'),  build: stubBuild },
  'four-prerequisites':  { name: 'four-prerequisites',  Stage: stubStage('four-prerequisites'),  build: stubBuild },
  'badge-metaphor':     { name: 'badge-metaphor',     Stage: stubStage('badge-metaphor'),     build: stubBuild },
  'protocol-repo':      { name: 'protocol-repo',      Stage: stubStage('protocol-repo'),      build: stubBuild },
  'unified-identity':   { name: 'unified-identity',   Stage: stubStage('unified-identity'),   build: stubBuild },
  'tiered-execution':   { name: 'tiered-execution',   Stage: stubStage('tiered-execution'),   build: stubBuild },
  'threat-model':       { name: 'threat-model',       Stage: stubStage('threat-model'),       build: stubBuild },
  'limits':             { name: 'limits',             Stage: stubStage('limits'),             build: stubBuild },
  'dev-flow':           { name: 'dev-flow',           Stage: stubStage('dev-flow'),           build: stubBuild },
}
