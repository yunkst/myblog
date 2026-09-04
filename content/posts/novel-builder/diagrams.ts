import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

/* 共用 sigil（沿用 ArchDiagram DEMO 已校验的 16x16 SVG path） */
const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 原理图 1：AI 现场生成提取脚本（决策流）───────────────── */
export const figNbScriptGen: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'webview', x: 40,  y: 150, w: 150, h: 60, kind: 'external', label: '内置浏览器',       sub: '打开目录页 · FAB 浮出',           sigil: SIGIL_DOC },
    { id: 'q1',      x: 250, y: 150, w: 160, h: 60, kind: 'key',      label: '该域名有脚本？',   sub: 'site_scripts 查库',               sigil: SIGIL_ARROWS },
    { id: 'direct',  x: 490, y: 40,  w: 190, h: 60, kind: 'be',       label: '直接执行脚本',     sub: '0 token · 无模型不确定性',        sigil: SIGIL_WRITE },
    { id: 'agent',   x: 490, y: 150, w: 190, h: 60, kind: 'key',      label: 'webview_extract Agent', sub: '观察页面 · 现场生成',         sigil: SIGIL_ARROWS },
    { id: 'llm',     x: 750, y: 150, w: 170, h: 60, kind: 'external', label: 'OpenAI 兼容 LLM',  sub: '生成提取脚本',                    sigil: SIGIL_DOC },
    { id: 'save',    x: 750, y: 280, w: 170, h: 60, kind: 'db',       label: 'site_scripts 表',  sub: 'save_script 落库',                sigil: SIGIL_DB },
    { id: 'extract', x: 490, y: 280, w: 190, h: 60, kind: 'be',       label: '正文提取',         sub: 'Headless WebView 执行脚本',       sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'webview', to: 'q1',      fromSide: 'right',  toSide: 'left',   label: '访问站点',      emph: true },
    { id: 'e2', from: 'q1',      to: 'direct',  fromSide: 'right',  toSide: 'left',   label: '有 · 直接跑',   emph: true, via: [{ x: 450, y: 180 }, { x: 450, y: 70 }] },
    { id: 'e3', from: 'q1',      to: 'agent',   fromSide: 'right',  toSide: 'left',   label: '无 · 首次访问', emph: true },
    { id: 'e4', from: 'agent',   to: 'llm',     fromSide: 'right',  toSide: 'left',   label: '请求生成' },
    { id: 'e5', from: 'llm',     to: 'save',    fromSide: 'bottom', toSide: 'top',    label: '脚本落库' },
    { id: 'e6', from: 'agent',   to: 'extract', fromSide: 'bottom', toSide: 'top',    label: '预览确认后执行' },
    { id: 'e7', from: 'direct',  to: 'extract', fromSide: 'left',   toSide: 'top',    label: '执行',          dash: true, via: [{ x: 458, y: 70 }, { x: 458, y: 280 }] },
    { id: 'e8', from: 'save',    to: 'q1',      fromSide: 'left',   toSide: 'bottom', label: '下次同站命中',  dash: true, via: [{ x: 750, y: 370 }, { x: 450, y: 370 }, { x: 450, y: 240 }, { x: 330, y: 240 }] },
  ],
  bounds: [
    { x: 470, y: 130, w: 470, h: 230, label: 'AI 只负责「第一次」——生成物是确定性脚本，之后零 token' },
  ],
}

/* ───────────────── 原理图 2：正文提取与预加载调度 ───────────────── */
export const figNbExtract: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 默认左上角图例会撞「调度层」bound 贴纸，挪到底部走廊（全图 y>300 无元素） */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 12, y: 306 },
  nodes: [
    { id: 'reader', x: 40,  y: 60,  w: 140, h: 60, kind: 'external', label: '读者翻章',         sub: '前台阅读',                           sigil: SIGIL_DOC },
    { id: 'high',   x: 250, y: 60,  w: 190, h: 60, kind: 'key',      label: 'high 优先级',      sub: '可抢占后台预加载',                   sigil: SIGIL_ARROWS },
    { id: 'fifo',   x: 250, y: 220, w: 190, h: 60, kind: 'mq',       label: 'PreloadService',   sub: 'FIFO · 30s/任务限速 · 命中缓存重置', sigil: SIGIL_ARROWS },
    { id: 'hwv',    x: 520, y: 140, w: 190, h: 60, kind: 'be',       label: 'Headless WebView', sub: '单例 + 互斥锁执行站点脚本',          sigil: SIGIL_WRITE },
    { id: 'cache',  x: 780, y: 140, w: 160, h: 60, kind: 'db',       label: 'chapter_cache',    sub: '用户章节不被覆盖',                   sigil: SIGIL_DB },
    { id: 'next',   x: 40,  y: 220, w: 140, h: 60, kind: 'be',       label: '后续章节入队',     sub: '当前章渲染后触发',                   sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'reader', to: 'high',   fromSide: 'right',  toSide: 'left',   label: '阅读请求',      emph: true },
    { id: 'e2', from: 'high',   to: 'hwv',    fromSide: 'right',  toSide: 'left',   label: '抢占执行',      emph: true, via: [{ x: 480, y: 90 }, { x: 480, y: 155 }] },
    { id: 'e3', from: 'next',   to: 'fifo',   fromSide: 'right',  toSide: 'left',   label: '入队' },
    { id: 'e4', from: 'fifo',   to: 'hwv',    fromSide: 'right',  toSide: 'left',   label: 'low 优先级·限速', via: [{ x: 480, y: 250 }, { x: 480, y: 185 }] },
    { id: 'e5', from: 'hwv',    to: 'cache',  fromSide: 'right',  toSide: 'left',   label: '正文入缓存' },
    { id: 'e6', from: 'cache',  to: 'reader', fromSide: 'top',    toSide: 'bottom', label: '断网可读',      dash: true, via: [{ x: 860, y: 40 }, { x: 110, y: 40 }] },
  ],
  bounds: [
    { x: 230, y: 40, w: 230, h: 260, label: '调度层' },
  ],
}

/* ───────────────── 原理图 3：端侧 OCR 还原管线 ───────────────── */
export const figNbOcr: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'page',   x: 30,  y: 100, w: 150, h: 60, kind: 'external', label: '正文页',       sub: '自定义字体反爬',             sigil: SIGIL_DOC },
    { id: 'pua',    x: 230, y: 100, w: 160, h: 60, kind: 'key',      label: 'PUA 码点文本', sub: '文本层全是乱码',             sigil: SIGIL_ARROWS },
    { id: 'render', x: 440, y: 100, w: 150, h: 60, kind: 'be',       label: '渲染成图',     sub: '乱码 → 字形图片',            sigil: SIGIL_WRITE },
    { id: 'ocr',    x: 640, y: 100, w: 150, h: 60, kind: 'key',      label: 'PP-OCRv6',     sub: 'onnxruntime · 端侧',         sigil: SIGIL_ARROWS },
    { id: 'clean',  x: 830, y: 100, w: 140, h: 60, kind: 'be',       label: '正常汉字',     sub: '入缓存 · 可阅读',            sigil: SIGIL_WRITE },
    { id: 'flag',   x: 230, y: 240, w: 160, h: 60, kind: 'db',       label: '站点脚本标记', sub: 'chapter_content_ocr = true', sigil: SIGIL_DB },
  ],
  edges: [
    { id: 'e1', from: 'page',   to: 'pua',    fromSide: 'right', toSide: 'left',   label: '抓取',           emph: true },
    { id: 'e2', from: 'pua',    to: 'render', fromSide: 'right', toSide: 'left',   label: '识别挪到渲染之后', emph: true },
    { id: 'e3', from: 'render', to: 'ocr',    fromSide: 'right', toSide: 'left',   label: '逐字识别' },
    { id: 'e4', from: 'ocr',    to: 'clean',  fromSide: 'right', toSide: 'left',   label: '替换还原' },
    { id: 'e5', from: 'flag',   to: 'pua',    fromSide: 'top',   toSide: 'bottom', label: '该站启用 OCR',   dash: true },
  ],
  bounds: [
    { x: 210, y: 80, w: 780, h: 240, label: '全程在用户设备上完成：不联网 · 不上云 · 离线可用' },
  ],
}

/* ───────────────── 原理图 4：Agent 工具分工 ───────────────── */
export const figNbAgentTools: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'chat',    x: 40,  y: 150, w: 150, h: 60, kind: 'external', label: 'Agent Chat',              sub: '用户的修改指令',                 sigil: SIGIL_DOC },
    { id: 'judge',   x: 250, y: 150, w: 160, h: 60, kind: 'key',      label: '改动幅度？',              sub: '工具即产品逻辑',                 sigil: SIGIL_ARROWS },
    { id: 'rewrite', x: 490, y: 30,  w: 200, h: 60, kind: 'be',       label: 'rewrite_chapter',         sub: '整章重写 · 人物卡+标签注入',     sigil: SIGIL_WRITE },
    { id: 'create',  x: 490, y: 150, w: 200, h: 60, kind: 'be',       label: 'create_chapter',          sub: '任意位置插章 · 补细节/续写',     sigil: SIGIL_WRITE },
    { id: 'update',  x: 490, y: 270, w: 200, h: 60, kind: 'be',       label: 'update_chapter_content',  sub: '精确替换 · 不再二次调 LLM',     sigil: SIGIL_WRITE },
    { id: 'version', x: 760, y: 90,  w: 180, h: 60, kind: 'db',       label: 'chapter_versions',        sub: '每次重写留档 · 可回滚',          sigil: SIGIL_DB },
    { id: 'guard',   x: 760, y: 270, w: 180, h: 60, kind: 'key',      label: 'ambiguous_match',         sub: '多处匹配拒绝执行',               sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'chat',    to: 'judge',   fromSide: 'right', toSide: 'left', label: '指令',        emph: true },
    { id: 'e2', from: 'judge',   to: 'rewrite', fromSide: 'right', toSide: 'left', label: '大改/改设定', emph: true, via: [{ x: 450, y: 180 }, { x: 450, y: 60 }] },
    { id: 'e3', from: 'judge',   to: 'create',  fromSide: 'right', toSide: 'left', label: '插入新内容',  emph: true },
    { id: 'e4', from: 'judge',   to: 'update',  fromSide: 'right', toSide: 'left', label: '小修小补',    emph: true, via: [{ x: 450, y: 180 }, { x: 450, y: 300 }] },
    { id: 'e5', from: 'rewrite', to: 'version', fromSide: 'right', toSide: 'left', label: '留档' },
    { id: 'e6', from: 'create',  to: 'version', fromSide: 'right', toSide: 'left', label: '留档',        via: [{ x: 720, y: 180 }, { x: 720, y: 120 }] },
    { id: 'e7', from: 'update',  to: 'guard',   fromSide: 'right', toSide: 'left', label: '精确性校验',  dash: true },
  ],
  bounds: [],
}

/* ───────────────── 原理图 5：上下文工程六件套（汇聚图）───────────────── */
export const figNbContext: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 默认左上角图例会撞「人物卡」节点，挪到右上空区（x>260 的 y<100 无元素） */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 780, y: 12 },
  nodes: [
    { id: 'chars',   x: 40,  y: 30,  w: 190, h: 56, kind: 'db',       label: '人物卡',      sub: '按出场角色精确注入',         sigil: SIGIL_DB },
    { id: 'outline', x: 40,  y: 106, w: 190, h: 56, kind: 'db',       label: '大纲细纲',    sub: 'AI 主动 get_outline 拉取',   sigil: SIGIL_DB },
    { id: 'tags',    x: 40,  y: 182, w: 190, h: 56, kind: 'db',       label: '风格标签',    sub: '同名变体随机抽一条',         sigil: SIGIL_DB },
    { id: 'writer',  x: 40,  y: 258, w: 190, h: 56, kind: 'db',       label: 'AI 作家设定', sub: 'system prompt 头部每章套用', sigil: SIGIL_DB },
    { id: 'memory',  x: 40,  y: 334, w: 190, h: 56, kind: 'db',       label: '经验记忆',    sub: 'patch_memory · 跨书跨会话',  sigil: SIGIL_DB },
    { id: 'prev',    x: 40,  y: 410, w: 190, h: 56, kind: 'db',       label: '前一章正文',  sub: '衔接上下文',                 sigil: SIGIL_DB },
    { id: 'asm',     x: 330, y: 210, w: 170, h: 60, kind: 'key',      label: '上下文装配',  sub: '六件套拼入一次调用',         sigil: SIGIL_ARROWS },
    { id: 'llm',     x: 580, y: 210, w: 170, h: 60, kind: 'external', label: '写章节 LLM',  sub: 'OpenAI 兼容接口',            sigil: SIGIL_DOC },
    { id: 'chapter', x: 810, y: 210, w: 150, h: 60, kind: 'be',       label: '新章节正文',  sub: '连贯 · 人设不漂',            sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'chars',   to: 'asm',     fromSide: 'right', toSide: 'left', via: [{ x: 280, y: 58 },  { x: 280, y: 222 }] },
    { id: 'e2', from: 'outline', to: 'asm',     fromSide: 'right', toSide: 'left', via: [{ x: 280, y: 134 }, { x: 280, y: 232 }] },
    { id: 'e3', from: 'tags',    to: 'asm',     fromSide: 'right', toSide: 'left', via: [{ x: 280, y: 210 }, { x: 280, y: 240 }] },
    { id: 'e4', from: 'writer',  to: 'asm',     fromSide: 'right', toSide: 'left', via: [{ x: 280, y: 286 }, { x: 280, y: 250 }] },
    { id: 'e5', from: 'memory',  to: 'asm',     fromSide: 'right', toSide: 'left', via: [{ x: 280, y: 362 }, { x: 280, y: 258 }] },
    { id: 'e6', from: 'prev',    to: 'asm',     fromSide: 'right', toSide: 'left', via: [{ x: 280, y: 438 }, { x: 280, y: 265 }] },
    { id: 'e7', from: 'asm',     to: 'llm',     fromSide: 'right', toSide: 'left', label: '一次生成调用', emph: true },
    { id: 'e8', from: 'llm',     to: 'chapter', fromSide: 'right', toSide: 'left', label: '输出',         emph: true },
  ],
  bounds: [
    { x: 20, y: 10, w: 230, h: 480, label: '素材全部来自本地 SQLite——没有跨书自动学习' },
  ],
}

/* ───────────────── 原理图 6：29 个工具的全景分工（总线型汇聚）─────────────────
 * 布局：主 Agent 居顶，8 个领域组 2×4 居下；row2 的边走列间竖向通道
 * （x=277/532/787 是列间隙），避免边线穿过 row1 节点。 */
export const figNbToolMap: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'agent',    x: 400, y: 30,  w: 240, h: 60, kind: 'key',      label: 'AgentLoop · 主 Agent', sub: '29 个工具 · 读-写分离纪律',     sigil: SIGIL_ARROWS },
    { id: 'nav',      x: 30,  y: 150, w: 240, h: 64, kind: 'be',       label: '小说导航',              sub: 'list · select · create_novel',  sigil: SIGIL_DOC },
    { id: 'read',     x: 285, y: 150, w: 240, h: 64, kind: 'be',       label: '章节读取',              sub: 'read · list · search_in_chapters', sigil: SIGIL_DOC },
    { id: 'write',    x: 540, y: 150, w: 240, h: 64, kind: 'key',      label: '章节写入（三档分流）',  sub: 'create · rewrite · update · delete', sigil: SIGIL_WRITE },
    { id: 'chars',    x: 795, y: 150, w: 240, h: 64, kind: 'be',       label: '角色卡',                sub: 'list · create · update · delete', sigil: SIGIL_DB },
    { id: 'material', x: 30,  y: 300, w: 240, h: 64, kind: 'db',       label: '设定 · 大纲 · 记忆',    sub: 'bg_setting · outline · patch_memory', sigil: SIGIL_DB },
    { id: 'tags',     x: 285, y: 300, w: 240, h: 64, kind: 'db',       label: '风格标签',              sub: 'list · get · save · delete_tag', sigil: SIGIL_DB },
    { id: 'cover',    x: 540, y: 300, w: 240, h: 64, kind: 'be',       label: '封面与配图',            sub: 'set_cover · create_images · img2video', sigil: SIGIL_WRITE },
    { id: 'subagent', x: 795, y: 300, w: 240, h: 64, kind: 'key',      label: '子 Agent',              sub: 'dispatch_subagent',              sigil: SIGIL_ARROWS },
  ],
  edges: [
    /* row1：顶部直接下挂（通道 y=120 在 row1 之上，不穿节点） */
    { id: 'e1', from: 'agent', to: 'nav',   fromSide: 'bottom', toSide: 'top', via: [{ x: 150, y: 120 }] },
    { id: 'e2', from: 'agent', to: 'read',  fromSide: 'bottom', toSide: 'top', via: [{ x: 405, y: 120 }] },
    { id: 'e3', from: 'agent', to: 'write', fromSide: 'bottom', toSide: 'top', label: '三档分流·详见工具设计幕', emph: true, via: [{ x: 660, y: 120 }] },
    { id: 'e4', from: 'agent', to: 'chars', fromSide: 'bottom', toSide: 'top', via: [{ x: 915, y: 120 }] },
    /* row2：竖向走列间隙通道（x=277 / 532 / 787），绕过 row1 */
    { id: 'e5', from: 'agent', to: 'material', fromSide: 'bottom', toSide: 'top', via: [{ x: 277, y: 120 }, { x: 277, y: 285 }] },
    { id: 'e6', from: 'agent', to: 'tags',     fromSide: 'bottom', toSide: 'top', via: [{ x: 532, y: 120 }, { x: 532, y: 285 }] },
    { id: 'e7', from: 'agent', to: 'cover',    fromSide: 'bottom', toSide: 'top', via: [{ x: 532, y: 120 }, { x: 532, y: 285 }] },
    { id: 'e8', from: 'agent', to: 'subagent', fromSide: 'bottom', toSide: 'top', label: '复杂任务委派·下一幕', emph: true, via: [{ x: 787, y: 120 }, { x: 787, y: 285 }] },
  ],
  bounds: [],
}

/* ───────────────── 原理图 7：子 Agent——上下文隔离与并行调度 ─────────────────
 * 回传边（e7）走顶部通道 y=20，不与下行派遣边交叉。 */
export const figNbSubagent: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'main',     x: 40,  y: 140, w: 170, h: 64, kind: 'external', label: '主 Agent',           sub: 'WritingScenario · 全量工具',   sigil: SIGIL_DOC },
    { id: 'dispatch', x: 270, y: 140, w: 180, h: 64, kind: 'key',      label: 'dispatch_subagent',  sub: 'task + allowed_tools 白名单',  sigil: SIGIL_ARROWS },
    { id: 'runner',   x: 510, y: 140, w: 190, h: 64, kind: 'mq',       label: 'SubagentRunner',     sub: '4 并发 · 30 FIFO 排队',        sigil: SIGIL_ARROWS },
    { id: 'sub1',     x: 770, y: 60,  w: 200, h: 56, kind: 'be',       label: '子 Agent #1',        sub: '独立上下文 · running',         sigil: SIGIL_WRITE },
    { id: 'sub2',     x: 770, y: 140, w: 200, h: 56, kind: 'be',       label: '子 Agent #2',        sub: '独立上下文 · running',         sigil: SIGIL_WRITE },
    { id: 'sub3',     x: 770, y: 220, w: 200, h: 56, kind: 'be',       label: '子 Agent #3',        sub: 'pending · 排队中',             sigil: SIGIL_WRITE },
    { id: 'llm',      x: 510, y: 300, w: 190, h: 56, kind: 'external', label: 'LLM',                sub: '子 Agent 独立调用',            sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'main',     to: 'dispatch', fromSide: 'right',  toSide: 'left',  label: '可拆分任务',              emph: true },
    { id: 'e2', from: 'dispatch', to: 'runner',   fromSide: 'right',  toSide: 'left',  label: '派遣',                    emph: true },
    { id: 'e3', from: 'runner',   to: 'sub1',     fromSide: 'right',  toSide: 'left',  label: '立即启动',                via: [{ x: 735, y: 172 }, { x: 735, y: 88 }] },
    { id: 'e4', from: 'runner',   to: 'sub2',     fromSide: 'right',  toSide: 'left',  label: '立即启动' },
    { id: 'e5', from: 'runner',   to: 'sub3',     fromSide: 'right',  toSide: 'left',  label: 'FIFO 排队',               dash: true, via: [{ x: 735, y: 172 }, { x: 735, y: 248 }] },
    /* sub2 正下方就是 sub3，bottom 直出必穿 sub3——改 right 出，走 bound 右侧 x995 竖向通道 */
    { id: 'e6', from: 'sub2',     to: 'llm',      fromSide: 'right',  toSide: 'right', label: '独立 LLM 调用',           via: [{ x: 995, y: 168 }, { x: 995, y: 328 }] },
    /* 回传：只把结论带回主对话（顶部通道 y=20，避免与派遣边交叉） */
    { id: 'e7', from: 'sub1',     to: 'main',     fromSide: 'top',    toSide: 'top',   label: '结构化 Markdown 总结（过程不进主上下文）', emph: true, via: [{ x: 870, y: 20 }, { x: 125, y: 20 }] },
  ],
  bounds: [
    { x: 752, y: 42, w: 236, h: 252, label: '单层：子 Agent 不能再派子 Agent' },
  ],
}
