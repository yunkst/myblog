import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

/* 共用 sigil(沿用 ArchDiagram DEMO 已校验的 16x16 SVG path) */
const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v4c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 图 1:ReAct + 验证门(sentence-to-board)───────────────── */
export const figSentenceToBoard: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'user',   x: 40,  y: 140, w: 160, h: 60, kind: 'external', label: '用户',          sub: '一句话指令',              sigil: SIGIL_DOC },
    { id: 'react',  x: 270, y: 140, w: 200, h: 70, kind: 'key',      label: '主 ReAct 循环', sub: 'token 上限替代轮数上限',  sigil: SIGIL_ARROWS },
    { id: 'sem',    x: 270, y: 300, w: 200, h: 60, kind: 'db',       label: '语义检索工具',  sub: 'pgvector + 真源表',       sigil: SIGIL_DB },
    { id: 'write',  x: 550, y: 60,  w: 210, h: 60, kind: 'key',      label: 'write_document',sub: '只收语义树 · compile 推导', sigil: SIGIL_WRITE },
    { id: 'draft',  x: 550, y: 160, w: 210, h: 60, kind: 'db',       label: 'DB 草稿',       sub: 'drafts 表',               sigil: SIGIL_DB },
    { id: 'gate',   x: 550, y: 270, w: 210, h: 60, kind: 'key',      label: '验证门',        sub: 'Clean/Unavailable/HasErrors', sigil: SIGIL_WRITE },
    { id: 'pub',    x: 840, y: 160, w: 170, h: 60, kind: 'be',       label: '预览 → 发布',   sub: '人拍板',                  sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'user',  to: 'react', fromSide: 'right',  toSide: 'left',  label: '对话', emph: true },
    { id: 'e2', from: 'sem',   to: 'react', fromSide: 'top',    toSide: 'bottom',label: '工具结果', dash: true },
    { id: 'e3', from: 'react', to: 'write', fromSide: 'right',  toSide: 'left',  label: '语义树', emph: true },
    { id: 'e4', from: 'write', to: 'draft', fromSide: 'bottom', toSide: 'top',   label: 'document 落库', emph: true },
    { id: 'e5', from: 'draft', to: 'gate',  fromSide: 'bottom', toSide: 'top',   label: 'POST /check_document', emph: true },
    { id: 'e6', from: 'gate',  to: 'react', fromSide: 'left',   toSide: 'bottom',label: '错误回填 messages(≤2 轮)', emph: true, via: [{ x: 440, y: 300 }, { x: 440, y: 240 }] },
    { id: 'e7', from: 'gate',  to: 'pub',   fromSide: 'right',  toSide: 'left',  label: 'Clean 才可见', emph: true },
  ],
  bounds: [
    /* 标签收敛到「内外双循环」：原文案贴纸右缘撞 write 节点（校验实锤） */
    { x: 250, y: 120, w: 530, h: 230, label: '内外双循环:错误是消息,不是异常' },
  ],
}

/* ───────────────── 图 3:看板运行时(spec-render)───────────────── */
export const figSpecRender: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'doc',    x: 40,  y: 60,  w: 210, h: 70, kind: 'db',  label: 'JSON document', sub: '{meta, queries, params, spec}', sigil: SIGIL_DB },
    { id: 'view',   x: 320, y: 60,  w: 220, h: 70, kind: 'key', label: 'SpecView',      sub: 'Boundary→Picker→Provider→Renderer', sigil: SIGIL_DOC },
    { id: 'catalog',x: 610, y: 60,  w: 210, h: 70, kind: 'key', label: 'catalog(zod)',  sub: '白名单 = props 类型 = prompt 文档', sigil: SIGIL_WRITE },
    { id: 'bdl',    x: 320, y: 210, w: 220, h: 70, kind: 'be',  label: 'BoardDataLayer',sub: '订阅 /params/* → 取数 → /queries/<id>', sigil: SIGIL_ARROWS },
    { id: 'comp',   x: 610, y: 210, w: 210, h: 70, kind: 'be',  label: '图表组件',      sub: '只订阅 rows,不取数不缓存', sigil: SIGIL_WRITE },
    { id: 'dl',     x: 610, y: 350, w: 210, h: 60, kind: 'key', label: 'bi-data-layer', sub: '唯一取数通道',     sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'doc',    to: 'view',    fromSide: 'right',  toSide: 'left',  label: '拉 document', emph: true },
    { id: 'e2', from: 'view',   to: 'catalog', fromSide: 'right',  toSide: 'left',  label: '元素树按 key 选组件' },
    { id: 'e3', from: 'view',   to: 'bdl',     fromSide: 'bottom', toSide: 'top',   label: '每个 query 一个', emph: true },
    { id: 'e4', from: 'bdl',    to: 'comp',    fromSide: 'right',  toSide: 'left',  label: '回写 rows', emph: true },
    { id: 'e5', from: 'bdl',    to: 'dl',      fromSide: 'bottom', toSide: 'top',   label: 'useQueryResult', emph: true },
  ],
  bounds: [
    { x: 300, y: 40, w: 540, h: 260, label: 'Provider 顺序不得颠倒;初始 state 预置 idle,消费侧读不到 undefined' },
  ],
}

/* ───────────────── 图 4:语义树契约(schema-contract)───────────────── */
export const figSchemaContract: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'llm',    x: 40,  y: 140, w: 190, h: 70, kind: 'external', label: 'LLM',          sub: '只写 4 节语义树',        sigil: SIGIL_DOC },
    { id: 'zod',    x: 300, y: 140, w: 200, h: 70, kind: 'key',      label: 'zod schema',   sub: 'meta/filters/queries/layout', sigil: SIGIL_WRITE },
    { id: 'compile',x: 570, y: 140, w: 210, h: 70, kind: 'key',      label: 'compile',      sub: '推导一切易错物理形态',   sigil: SIGIL_ARROWS },
    { id: 'flat',   x: 850, y: 60,  w: 200, h: 60, kind: 'be',       label: 'flat 树落库',  sub: 'element key 自动填',     sigil: SIGIL_DB },
    { id: 'err',    x: 850, y: 220, w: 200, h: 60, kind: 'be',       label: '结构化报错',   sub: 'errors[].path + hint',   sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'llm',     to: 'zod',    fromSide: 'right', toSide: 'left',  label: '语义树', emph: true },
    { id: 'e2', from: 'zod',     to: 'compile',fromSide: 'right', toSide: 'left',  label: '校验通过', emph: true },
    { id: 'e3', from: 'compile', to: 'flat',   fromSide: 'right', toSide: 'top',   label: '双参数展开 · key 生成 · children 归位', emph: true },
    { id: 'e4', from: 'compile', to: 'err',    fromSide: 'right', toSide: 'bottom',label: 'p_ 前缀等违规直接拒', emph: true },
  ],
  bounds: [
    { x: 280, y: 120, w: 520, h: 110, label: '写侧硬切单形态;读侧才保留 decompile 降级' },
  ],
}

/* ───────────────── 图 5:错误回流(error-loop)───────────────── */
export const figErrorLoop: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'llm',    x: 60,  y: 140, w: 190, h: 70, kind: 'external', label: 'LLM',           sub: '读错误 · 修到过',      sigil: SIGIL_ARROWS },
    { id: 'msg',    x: 330, y: 140, w: 200, h: 70, kind: 'key',      label: 'messages',      sub: '错误 = user 消息回填', sigil: SIGIL_DOC },
    { id: 'class',  x: 610, y: 60,  w: 220, h: 60, kind: 'key',      label: '错误分类',      sub: 'SqlErrorKind + hint',  sigil: SIGIL_WRITE },
    { id: 'ext',    x: 610, y: 140, w: 220, h: 60, kind: 'be',       label: '占位符现提取',  sub: '不信任 caller params', sigil: SIGIL_ARROWS },
    { id: 'retry',  x: 610, y: 220, w: 220, h: 60, kind: 'be',       label: '重试边界',      sub: '响应头前才重试(408/429/5xx)', sigil: SIGIL_ARROWS },
    { id: 'stop',   x: 900, y: 140, w: 170, h: 60, kind: 'key',      label: '停机条件',      sub: 'token 上限 · 修复 2 轮', sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'llm',   to: 'msg',   fromSide: 'right', toSide: 'left',  label: '产生错误', emph: true },
    { id: 'e2', from: 'class', to: 'msg',   fromSide: 'left',  toSide: 'right', label: '{error, kind, hint, raw}', emph: true, via: [{ x: 560, y: 90 }, { x: 560, y: 175 }] },
    /* e3/e4 走底部走廊（y305/320）：此前 e4 直线横穿 ext 节点（「边从节点下面过」实锤），
     * e3 标签在 ext↔msg 间 80px 缝隙里放不下——绕底部分别进 msg/stop 的 bottom */
    { id: 'e3', from: 'ext',   to: 'msg',   fromSide: 'left',  toSide: 'bottom', label: 'params 真相来自 SQL', dash: true, via: [{ x: 570, y: 170 }, { x: 570, y: 305 }, { x: 430, y: 305 }] },
    { id: 'e4', from: 'msg',   to: 'stop',  fromSide: 'right', toSide: 'bottom', label: '超限 → 如实告知用户', emph: true, via: [{ x: 545, y: 175 }, { x: 545, y: 320 }, { x: 980, y: 320 }] },
  ],
  bounds: [
    { x: 590, y: 40, w: 260, h: 260, label: '错误是接口契约,不是日志' },
  ],
}

/* ───────────────── 图 6:SQL 安全代理(sql-gate)───────────────── */
export const figSqlGate: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'in',    x: 40,  y: 150, w: 180, h: 60, kind: 'external', label: '看板查询',      sub: 'SQL + params',            sigil: SIGIL_DOC },
    { id: 'ast',   x: 290, y: 150, w: 220, h: 70, kind: 'key',      label: 'AST 校验',      sub: '禁 DML · 禁 SELECT * · 强制 limit', sigil: SIGIL_WRITE },
    { id: 'rls',   x: 290, y: 280, w: 220, h: 70, kind: 'key',      label: 'RLS 织入',      sub: '子查询/CTE/ANY/ALL 同面遍历', sigil: SIGIL_WRITE },
    { id: 'bind',  x: 590, y: 150, w: 210, h: 70, kind: 'be',       label: 'bind_params',   sub: '引号 + 反斜杠双写',       sigil: SIGIL_ARROWS },
    { id: 'exec',  x: 590, y: 280, w: 210, h: 70, kind: 'be',       label: '执行',          sub: 'SET SESSION query_timeout', sigil: SIGIL_ARROWS },
    { id: 'doris', x: 870, y: 210, w: 180, h: 70, kind: 'db',       label: 'Doris',         sub: '权威取消 · 504',          sigil: SIGIL_DB },
  ],
  edges: [
    { id: 'e1', from: 'in',   to: 'ast',  fromSide: 'right', toSide: 'left',  label: '', emph: true },
    { id: 'e2', from: 'ast',  to: 'bind', fromSide: 'right', toSide: 'left',  label: '白名单通过', emph: true },
    { id: 'e3', from: 'rls',  to: 'bind', fromSide: 'right', toSide: 'top',   label: '织入谓词', emph: true, via: [{ x: 540, y: 315 }, { x: 540, y: 230 }] },
    { id: 'e4', from: 'bind', to: 'exec', fromSide: 'bottom',toSide: 'top',   label: '' },
    { id: 'e5', from: 'exec', to: 'doris',fromSide: 'right', toSide: 'left',  label: 'MySQL 协议', emph: true },
    { id: 'e6', from: 'ast',  to: 'rls',  fromSide: 'bottom',toSide: 'top',   label: '校验面 ≡ 织入面(mirror 测试)', emph: true },
  ],
  bounds: [
    { x: 270, y: 130, w: 550, h: 240, label: '每个「能装子查询的容器」两边成对出现' },
  ],
}

/* ───────────────── 图 7:语义层(semantic-search)───────────────── */
export const figSemanticSearch: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]; legendAt?: { x: number; y: number } } = {
  nodes: [
    { id: 'yaml',   x: 40,  y: 60,  w: 200, h: 60, kind: 'external', label: 'fs yaml(冻结)', sub: '种子 · 离线工具',        sigil: SIGIL_DOC },
    { id: 'db',     x: 40,  y: 160, w: 200, h: 60, kind: 'db',       label: 'DB 真源表',      sub: 'semantic_sources 等',    sigil: SIGIL_DB },
    { id: 'eq',     x: 310, y: 110, w: 210, h: 60, kind: 'key',      label: '等价测试',       sub: '同 fixture 双路径比对',  sigil: SIGIL_WRITE },
    { id: 'embed',  x: 310, y: 230, w: 210, h: 60, kind: 'be',       label: '字段级 embedding',sub: 'doc_hash 掺模型版本',    sigil: SIGIL_ARROWS },
    { id: 'vec',    x: 590, y: 230, w: 200, h: 60, kind: 'db',       label: 'pgvector',       sub: '字段分聚合表分',         sigil: SIGIL_DB },
    { id: 'rrf',    x: 590, y: 110, w: 200, h: 60, kind: 'key',      label: 'RRF 融合',       sub: '词法 + 向量',            sigil: SIGIL_ARROWS },
    { id: 'agent',  x: 860, y: 170, w: 180, h: 60, kind: 'key',      label: 'agent',          sub: '选表 · 对齐口径',        sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'yaml',  to: 'eq',    fromSide: 'right', toSide: 'left',  label: '种子路径', dash: true },
    { id: 'e2', from: 'db',    to: 'eq',    fromSide: 'right', toSide: 'left',  label: '运行时路径', emph: true },
    { id: 'e3', from: 'db',    to: 'embed', fromSide: 'bottom',toSide: 'top',   label: '变更触发增量 sync' },
    { id: 'e4', from: 'embed', to: 'vec',   fromSide: 'right', toSide: 'left',  label: '写入向量', emph: true },
    { id: 'e5', from: 'vec',   to: 'rrf',   fromSide: 'top',   toSide: 'bottom',label: '向量路' },
    { id: 'e6', from: 'rrf',   to: 'agent', fromSide: 'right', toSide: 'left',  label: 'Top-K + 权限剪枝', emph: true },
  ],
  bounds: [
    { x: 20, y: 40, w: 520, h: 200, label: '双路径共享同一套映射函数,等价测试钉死' },
  ],
  /* 默认左上角图例撞 bound 贴纸，挪到底部空区（最低节点 y290） */
  legendAt: { x: 12, y: 330 },
}

/* ───────────────── 图 8:端到端数据流(end-to-end)───────────────── */
export const figEndToEnd: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'prod',  x: 40,  y: 140, w: 210, h: 80, kind: 'external', label: '生产库',        sub: 'PG / MongoDB',          sigil: SIGIL_DB },
    { id: 'cdc',   x: 310, y: 140, w: 190, h: 80, kind: 'be',       label: 'Flink CDC',     sub: '88 张表实时同步',       sigil: SIGIL_ARROWS },
    { id: 'ods',   x: 560, y: 140, w: 190, h: 80, kind: 'db',       label: 'Doris ODS',     sub: '贴源层',                sigil: SIGIL_DB },
    { id: 'etl',   x: 560, y: 300, w: 190, h: 80, kind: 'key',      label: 'bi-etl',        sub: 'reconcile 物化编排',    sigil: SIGIL_WRITE },
    { id: 'dws',   x: 810, y: 140, w: 200, h: 80, kind: 'db',       label: 'Doris DWS',     sub: 'shadow 表 + RENAME',    sigil: SIGIL_DB },
    { id: 'board', x: 810, y: 300, w: 200, h: 80, kind: 'key',      label: '看板',          sub: '查询只打物化表',        sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'prod',  to: 'cdc',   fromSide: 'right', toSide: 'left',  label: 'binlog / oplog', emph: true },
    { id: 'e2', from: 'cdc',   to: 'ods',   fromSide: 'right', toSide: 'left',  label: '实时写入', emph: true },
    { id: 'e3', from: 'etl',   to: 'ods',   fromSide: 'top',   toSide: 'bottom',label: 'CTAS 重算' },
    { id: 'e4', from: 'ods',   to: 'dws',   fromSide: 'right', toSide: 'left',  label: '物化', emph: true },
    { id: 'e5', from: 'dws',   to: 'board', fromSide: 'bottom',toSide: 'top',   label: '切换零中断', emph: true },
    { id: 'e6', from: 'etl',   to: 'dws',   fromSide: 'right', toSide: 'left',  label: '影子表写入', dash: true },
  ],
  bounds: [
    { x: 790, y: 120, w: 240, h: 120, label: '重算期间看板不断' },
  ],
}