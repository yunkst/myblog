// scene.tsx — novel-builder 探索视图动画舞台（v2 demos 字典）
//
// 15 个 demo：
//   - add-book-flow, rewrite-flow                体验型（mode 1，build 内联在本文件）
//   - intro-overview, read-clean, ocr-restore,
//     surgical-edit, write-flow, ammo-arsenal     定制概念型（build 在 scene-builds.tsx）
//   - script-gen-principle, extract-principle, ocr-principle,
//     agent-tools-principle, context-principle,
//     tool-map, subagent-principle                架构图/数据流图型（ArchDiagram 容器淡入）
import { gsap } from 'gsap'
import { typeInto } from '@/components/blog-anim/typeInto'
import type { Scene } from '@/components/explore/SceneController'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import {
  IntroStage,
  AddBookStage,
  ReadCleanStage,
  OcrStage,
  RewriteStage,
  SurgicalStage,
  WriteFlowStage,
  AmmoStage,
  ScriptGenStage,
  ExtractStage,
  OcrPrincipleStage,
  AgentToolsStage,
  ContextStage,
  ToolMapStage,
  SubagentStage,
} from './scene-stages'
import {
  buildIntro,
  buildReadClean,
  buildOcr,
  buildSurgical,
  buildWriteFlow,
  buildAmmo,
} from './scene-builds'

export const demos: Record<string, Scene> = {
  // ─── 体验型 1：add-book-flow（加书闭环） ─────────────────────────────
  'add-book-flow': {
    name: 'add-book-flow',
    Stage: AddBookStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.set(['#nb-fab', '#nb-gen', '#nb-preview', '#nb-toast'], { opacity: 0 })
      tl.set('#nb-gen-bar', { width: '0%' })

      // 1) 页面行逐条加载（模拟打开目录页）
      const lines = '.nb-phone-page .nb-page-line'
      tl.set(lines, { opacity: 0, y: 6 })
      tl.to(lines, { opacity: 1, y: 0, duration: 0.25, stagger: 0.12 }, 0.3)

      // 2) FAB 浮出 + 点击
      tl.to('#nb-fab', { opacity: 1, scale: 1, duration: 0.4 }, '+=0.3')
      tl.to('#nb-fab', { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 }, '+=0.4')

      // 3) AI 现场生成脚本：进度条
      tl.to('#nb-gen', { opacity: 1, duration: 0.3 }, '+=0.2')
      tl.to('#nb-gen-bar', { width: '100%', duration: 1.6, ease: 'power1.inOut' })

      // 4) 提取预览确认
      tl.to('#nb-gen', { opacity: 0, duration: 0.25 })
      tl.to('#nb-preview', { opacity: 1, y: 0, duration: 0.4 })

      // 5) 已加入书架
      tl.to('#nb-preview', { opacity: 0, duration: 0.25 }, '+=0.6')
      tl.to('#nb-toast', { opacity: 1, duration: 0.4 })

      return tl
    },
  },

  // ─── 体验型 2：rewrite-flow（AI 改写 + 版本回滚） ─────────────────────
  'rewrite-flow': {
    name: 'rewrite-flow',
    Stage: RewriteStage,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.set(['#rw-thinking', '#rw-ai', '#rw-done'], { opacity: 0 })
      tl.set('#nb-diff', { opacity: 0, y: 10 })
      tl.set('.nb-version', { opacity: 0 })

      // 1) 打字机输入（共享 typeInto helper，见 src/components/blog-anim/typeInto.ts）
      typeInto(tl, 'rw-input', '这章结局太憋屈了，改成开放式，反派别死')

      // 2) AI thinking
      tl.to('#rw-thinking', { opacity: 1, duration: 0.2 })
      tl.to('#rw-thinking', { opacity: 0.4, duration: 0.3, repeat: 3, yoyo: true })
      tl.set('#rw-thinking', { opacity: 0 })

      // 3) AI 回复 + diff 卡
      tl.to('#rw-ai', { opacity: 1, duration: 0.3 })
      tl.to('#nb-diff', { opacity: 1, y: 0, duration: 0.5 }, '+=0.2')
      tl.to('.nb-version', { opacity: 1, duration: 0.3, stagger: 0.2 }, '+=0.2')

      // 4) 可回滚提示
      tl.to('#rw-done', { opacity: 1, duration: 0.4 }, '+=0.3')

      return tl
    },
  },

  // ─── 定制概念型 6 个 ────────────────────────────────────────────────
  'intro-overview': { name: 'intro-overview', Stage: IntroStage, build: buildIntro },
  'read-clean':     { name: 'read-clean',     Stage: ReadCleanStage, build: buildReadClean },
  'ocr-restore':    { name: 'ocr-restore',    Stage: OcrStage, build: buildOcr },
  'surgical-edit':  { name: 'surgical-edit',  Stage: SurgicalStage, build: buildSurgical },
  'write-flow':     { name: 'write-flow',     Stage: WriteFlowStage, build: buildWriteFlow },
  'ammo-arsenal':   { name: 'ammo-arsenal',   Stage: AmmoStage, build: buildAmmo },

  // ─── 架构图型 7 个（mode 2 文字先行 → 容器淡入） ─────────────────────
  'script-gen-principle':   { name: 'script-gen-principle',   Stage: ScriptGenStage, build: () => buildArchFade('[data-arch="script-gen-principle"]') },
  'extract-principle':      { name: 'extract-principle',      Stage: ExtractStage, build: () => buildArchFade('[data-arch="extract-principle"]') },
  'ocr-principle':          { name: 'ocr-principle',          Stage: OcrPrincipleStage, build: () => buildArchFade('[data-arch="ocr-principle"]') },
  'agent-tools-principle':  { name: 'agent-tools-principle',  Stage: AgentToolsStage, build: () => buildArchFade('[data-arch="agent-tools-principle"]') },
  'context-principle':      { name: 'context-principle',      Stage: ContextStage, build: () => buildArchFade('[data-arch="context-principle"]') },
  'tool-map':               { name: 'tool-map',               Stage: ToolMapStage, build: () => buildArchFade('[data-arch="tool-map"]') },
  'subagent-principle':     { name: 'subagent-principle',     Stage: SubagentStage, build: () => buildArchFade('[data-arch="subagent-principle"]') },
}

/* 架构图 demo 演出已收敛到共享实现 src/components/blog-anim/buildArchFade.ts
 * （容器淡入 + 向 ArchDiagram 派发重播事件，灯箱从头播放时图内动画同步重播） */
