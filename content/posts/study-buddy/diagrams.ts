import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

/* 共用 sigil（沿用 ArchDiagram DEMO 已校验的 16x16 SVG path） */
const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 原理图 1：端侧 ReAct Agent 引擎（agent-principle）───────────────── */
export const figSbAgent: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 默认左上角图例撞 bound，挪到左下空区（compact 之下 y>360 无元素） */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 12, y: 380 },
  nodes: [
    { id: 'ui',       x: 40,  y: 150, w: 140, h: 60, kind: 'external', label: '聊天 UI',           sub: '流式渲染 · 选项卡',          sigil: SIGIL_DOC },
    { id: 'loop',     x: 260, y: 150, w: 170, h: 60, kind: 'key',      label: 'AgentLoop',          sub: 'ReAct 轮次 · 事件实时 yield', sigil: SIGIL_ARROWS },
    { id: 'llm',      x: 560, y: 30,  w: 220, h: 60, kind: 'external', label: 'OpenAI 兼容端点',    sub: '用户自备 key · SSE',          sigil: SIGIL_DOC },
    { id: 'tools',    x: 560, y: 150, w: 220, h: 60, kind: 'be',       label: '工具执行',           sub: 'save_topic / search_topics …', sigil: SIGIL_WRITE },
    { id: 'askuser',  x: 560, y: 270, w: 220, h: 60, kind: 'key',      label: 'ask_user 挂起',      sub: '哨兵对象区分取消/作答',       sigil: SIGIL_ARROWS },
    { id: 'compact',  x: 40,  y: 300, w: 170, h: 60, kind: 'be',       label: 'ContextCompactor',   sub: '压缩上下文 · 输出截断落盘',   sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'ui',      to: 'loop',    fromSide: 'right',  toSide: 'left',   label: '用户消息 · 作答回灌', emph: true },
    { id: 'e2', from: 'loop',    to: 'llm',     fromSide: 'right',  toSide: 'left',   label: '流式调用',           emph: true, via: [{ x: 500, y: 180 }, { x: 500, y: 60 }] },
    { id: 'e3', from: 'llm',     to: 'loop',    fromSide: 'bottom', toSide: 'top',    label: 'SSE 增量 · 中断整轮重发', dash: true, via: [{ x: 670, y: 120 }, { x: 345, y: 120 }] },
    { id: 'e4', from: 'loop',    to: 'tools',   fromSide: 'right',  toSide: 'left',   label: '工具调用' },
    { id: 'e5', from: 'tools',   to: 'loop',    fromSide: 'bottom', toSide: 'bottom', label: '观察结果 → 下一轮',  dash: true, via: [{ x: 670, y: 240 }, { x: 345, y: 240 }] },
    { id: 'e6', from: 'loop',    to: 'askuser', fromSide: 'bottom', toSide: 'left',   label: '提问挂起',           via: [{ x: 345, y: 300 }] },
    { id: 'e7', from: 'askuser', to: 'ui',      fromSide: 'left',   toSide: 'bottom', label: '选项卡渲染',         dash: true, via: [{ x: 110, y: 300 }] },
    { id: 'e8', from: 'loop',    to: 'compact', fromSide: 'left',   toSide: 'top',    label: '超长上下文压缩',      via: [{ x: 200, y: 180 }, { x: 200, y: 330 }, { x: 125, y: 330 }] },
  ],
  bounds: [
    { x: 230, y: 10, w: 570, h: 250, label: '端侧 ReAct 循环：调 LLM → 工具 → 观察 → 下一轮' },
  ],
}

/* ───────────────── 原理图 2：FSRS 复习调度器（scheduler-principle）───────────────── */
export const figSbScheduler: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 默认左上角图例撞 bound，挪到左下空带（bound 底 310 之下） */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 12, y: 313 },
  nodes: [
    { id: 'review',    x: 40,  y: 60,  w: 170, h: 60, kind: 'external', label: '复习自评',        sub: '忘了 / 困难 / 良好 / 简单',      sigil: SIGIL_DOC },
    { id: 'scheduler', x: 300, y: 60,  w: 190, h: 60, kind: 'key',      label: 'ReviewScheduler', sub: '更新 S 稳定性 · D 难度',         sigil: SIGIL_ARROWS },
    { id: 'params',    x: 300, y: 220, w: 190, h: 60, kind: 'db',       label: 'params.dart',     sub: '参数常量化 · 调参不改算法',      sigil: SIGIL_DB },
    { id: 'schedule',  x: 580, y: 60,  w: 190, h: 60, kind: 'db',       label: 'topic_schedule',  sub: 'S / D / reps / 下次到期',        sigil: SIGIL_DB },
    { id: 'mastery',   x: 580, y: 220, w: 190, h: 60, kind: 'be',       label: '掌握度派生',      sub: 'S<1 薄弱 · ≥21 已掌握',          sigil: SIGIL_WRITE },
    { id: 'today',     x: 40,  y: 220, w: 170, h: 60, kind: 'external', label: '今日复习队列',    sub: '只排到期的卡',                   sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'review',    to: 'scheduler', fromSide: 'right',  toSide: 'left',  label: '四档评分',    emph: true },
    { id: 'e2', from: 'params',    to: 'scheduler', fromSide: 'top',    toSide: 'bottom', label: '参数注入' },
    { id: 'e3', from: 'scheduler', to: 'schedule',  fromSide: 'right',  toSide: 'left',  label: '算下次到期',  emph: true },
    { id: 'e4', from: 'schedule',  to: 'mastery',   fromSide: 'bottom', toSide: 'top',   label: 'S 派生展示' },
    { id: 'e5', from: 'schedule',  to: 'today',     fromSide: 'bottom', toSide: 'top',   label: '到期筛选',    dash: true, via: [{ x: 675, y: 160 }, { x: 125, y: 160 }] },
  ],
  bounds: [
    { x: 270, y: 30, w: 540, h: 280, label: '调度器核心：参数常量化 · 掌握度由 S 派生' },
  ],
}

/* ───────────────── 原理图 3：本地优先架构（local-first-principle）───────────────── */
export const figSbLocalFirst: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 默认左上角图例撞 bound 贴纸，挪到右侧空区（llm 之下、e4 回廊之下） */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 590, y: 200 },
  nodes: [
    { id: 'ui',     x: 40,  y: 60,  w: 170, h: 60, kind: 'external', label: 'Flutter UI',        sub: 'Riverpod · go_router',        sigil: SIGIL_DOC },
    { id: 'engine', x: 300, y: 60,  w: 200, h: 60, kind: 'key',      label: 'study_engine',      sub: '纯 Dart 包 · 无 Flutter 依赖', sigil: SIGIL_ARROWS },
    { id: 'db',     x: 300, y: 230, w: 200, h: 60, kind: 'db',       label: 'sqflite 本地库',    sub: '12 个 Repository 分层',       sigil: SIGIL_DB },
    { id: 'llm',    x: 590, y: 60,  w: 200, h: 60, kind: 'external', label: 'OpenAI 兼容端点',   sub: 'BYOK · SSE 流式',             sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'ui',     to: 'engine', fromSide: 'right',  toSide: 'left',  label: '调用' },
    { id: 'e2', from: 'engine', to: 'db',     fromSide: 'bottom', toSide: 'top',   label: '读写' },
    { id: 'e3', from: 'engine', to: 'llm',    fromSide: 'right',  toSide: 'left',  label: '直连 · 无自建后端', emph: true },
    { id: 'e4', from: 'llm',    to: 'engine', fromSide: 'bottom', toSide: 'right', label: 'SSE 增量 · 末包 usage', dash: true, via: [{ x: 690, y: 160 }, { x: 540, y: 160 }, { x: 540, y: 90 }] },
  ],
  bounds: [
    { x: 20, y: 30, w: 500, h: 290, label: '全部在手机本地 · 数据不出设备' },
  ],
}
