import type { ArchNode, ArchEdge, ArchBound } from '../ArchDiagram'

/* 共用 sigil（沿用 ArchDiagram DEMO 已校验的 16x16 SVG path） */
const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 图 1：总体架构（flowchart TD）───────────────── */
export const figArchitecture: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'staff',    x: 40,  y: 60,  w: 130, h: 60, kind: 'external', label: '员工',                sub: '已登录',                        sigil: SIGIL_DOC },
    { id: 'gw',       x: 230, y: 60,  w: 170, h: 60, kind: 'key',      label: 'Apisix + OIDC',     sub: '第二层：统一身份入口',           sigil: SIGIL_ARROWS },
    { id: 'platform', x: 440, y: 60,  w: 170, h: 60, kind: 'be',       label: 'AI 数字员工平台',     sub: '也在 Apisix 后面',              sigil: SIGIL_WRITE },
    { id: 'repo',     x: 440, y: 200, w: 140, h: 60, kind: 'db',       label: '协议仓库',            sub: '只读·安全写·可逆·高风险',       sigil: SIGIL_DB },
    { id: 'policy',   x: 620, y: 200, w: 140, h: 60, kind: 'key',      label: '分级策略',            sub: '直调 / 确认 / 预演 / 审批',     sigil: SIGIL_ARROWS },
    { id: 'be-a',     x: 230, y: 340, w: 150, h: 60, kind: 'be',       label: '业务后台 A',          sub: 'Flask',                         sigil: SIGIL_WRITE },
    { id: 'be-b',     x: 430, y: 340, w: 150, h: 60, kind: 'be',       label: '业务后台 B',          sub: 'FastAPI',                       sigil: SIGIL_WRITE },
    { id: 'rbac',     x: 620, y: 340, w: 140, h: 60, kind: 'be',       label: 'RBAC 校验',           sub: '放行 / 拒绝',                   sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'staff',    to: 'gw',       fromSide: 'right', toSide: 'left', label: '1. 和 AI 对话发起请求', emph: true },
    { id: 'e2', from: 'gw',       to: 'platform', fromSide: 'right', toSide: 'left', label: '2. 转发，身份已确定',   emph: true },
    { id: 'e3', from: 'platform', to: 'repo',     fromSide: 'bottom', toSide: 'top', label: '查询接口能力' },
    { id: 'e4', from: 'platform', to: 'policy',   fromSide: 'right', toSide: 'left', label: '按接口分级执行' },
    { id: 'e5', from: 'policy',   to: 'gw',       fromSide: 'left', toSide: 'right', label: '携带员工真实身份', dash: true, via: [{ x: 600, y: 230 }, { x: 600, y: 20 }, { x: 400, y: 20 }] },
    { id: 'e6', from: 'gw',       to: 'be-a',     fromSide: 'bottom', toSide: 'top', label: '转发', via: [{ x: 200, y: 120 }, { x: 200, y: 320 }] },
    { id: 'e7', from: 'gw',       to: 'be-b',     fromSide: 'bottom', toSide: 'top', label: '转发', via: [{ x: 680, y: 120 }, { x: 680, y: 320 }, { x: 505, y: 320 }] },
    { id: 'e8', from: 'be-a',     to: 'rbac',     fromSide: 'right', toSide: 'bottom', label: 'RBAC', via: [{ x: 405, y: 370 }, { x: 405, y: 425 }, { x: 690, y: 425 }] },
    { id: 'e9', from: 'be-b',     to: 'rbac',     fromSide: 'right', toSide: 'left', label: 'RBAC' },
  ],
  bounds: [
    { x: 20,  y: 40,  w: 400, h: 100, label: '接入层' },
    { x: 420, y: 40,  w: 360, h: 340, label: '平台核心' },
    { x: 210, y: 320, w: 570, h: 100, label: '业务后台' },
  ],
}

/* ───────────────── 图 2：请求链路（sequence → flowchart）───────────────── */
export const figRequestFlow: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'staff',    x: 40,  y: 80, w: 130, h: 60, kind: 'external', label: '员工',         sub: 'OIDC 登录态',                       sigil: SIGIL_DOC },
    { id: 'gw',       x: 240, y: 80, w: 150, h: 60, kind: 'key',      label: 'Apisix',       sub: '鉴权 + 转发',                        sigil: SIGIL_ARROWS },
    { id: 'platform', x: 460, y: 80, w: 200, h: 60, kind: 'be',       label: 'AI 平台',       sub: '身份透传（写死逻辑，AI 无法选择）',  sigil: SIGIL_WRITE },
    { id: 'be',       x: 730, y: 80, w: 170, h: 60, kind: 'be',       label: '业务后台',      sub: 'RBAC 校验：按该员工角色裁决',         sigil: SIGIL_DB },
  ],
  edges: [
    { id: 'e1', from: 'staff',    to: 'gw',       fromSide: 'right', toSide: 'left', label: '① 发起请求',           emph: true },
    { id: 'e2', from: 'gw',       to: 'platform', fromSide: 'right', toSide: 'left', label: '② 转发，身份已确定',    emph: true },
    { id: 'e3', from: 'platform', to: 'be',       fromSide: 'right', toSide: 'left', label: '③ 携带员工身份调用',    emph: true },
    { id: 'e4', from: 'be',       to: 'staff',    fromSide: 'bottom', toSide: 'bottom', label: '④ RBAC 校验 → 返回（审计记员工本人）', dash: true, via: [{ x: 815, y: 220 }, { x: 105, y: 220 }] },
  ],
  bounds: [],
}

/* ───────────────── 图 3：分级执行决策树（flowchart TD）───────────────── */
export const figTiered: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'start', x: 40,  y: 40,  w: 130, h: 60, kind: 'external', label: 'AI 发起接口调用',   sub: '',                                          sigil: SIGIL_WRITE },
    { id: 'q1',    x: 40,  y: 140, w: 150, h: 60, kind: 'key',      label: '接口属于哪一级？',  sub: '决策',                                       sigil: SIGIL_ARROWS },
    { id: 'e1',    x: 220, y: 240, w: 110, h: 60, kind: 'be',       label: '只读',               sub: '直调执行',                                   sigil: SIGIL_DOC },
    { id: 'e2',    x: 360, y: 240, w: 110, h: 60, kind: 'be',       label: '安全写',             sub: '人类确认 → 执行',                            sigil: SIGIL_WRITE },
    { id: 'e3',    x: 500, y: 240, w: 140, h: 60, kind: 'be',       label: '可逆',               sub: '预演→确认→锁定→生产',                      sigil: SIGIL_DB },
    { id: 'e4',    x: 670, y: 240, w: 140, h: 60, kind: 'key',      label: '高风险',             sub: '预演→审批→锁定→生产',                      sigil: SIGIL_ARROWS },
    { id: 'q2',    x: 40,  y: 360, w: 150, h: 60, kind: 'key',      label: '事后发现问题？',     sub: '决策',                                       sigil: SIGIL_ARROWS },
    { id: 'r1',    x: 220, y: 460, w: 110, h: 60, kind: 'be',       label: '一键撤回',           sub: '可撤回 · 恢复原样',                          sigil: SIGIL_DOC },
    { id: 'r2',    x: 360, y: 460, w: 110, h: 60, kind: 'key',      label: '复盘会',             sub: '不可撤回 · 回放决策链',                      sigil: SIGIL_ARROWS },
    { id: 'r3',    x: 500, y: 460, w: 110, h: 60, kind: 'be',       label: '收工',               sub: '✓',                                          sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'start', to: 'q1',    fromSide: 'bottom', toSide: 'top', label: '' },
    { id: 'e2', from: 'q1',    to: 'e1',    fromSide: 'right',  toSide: 'left' },
    { id: 'e3', from: 'q1',    to: 'e2',    fromSide: 'right',  toSide: 'left' },
    { id: 'e4', from: 'q1',    to: 'e3',    fromSide: 'right',  toSide: 'left' },
    { id: 'e5', from: 'q1',    to: 'e4',    fromSide: 'right',  toSide: 'left' },
    { id: 'e6', from: 'e3',    to: 'q2',    fromSide: 'bottom', toSide: 'top', label: '生产后', via: [{ x: 570, y: 320 }, { x: 115, y: 320 }] },
    { id: 'e7', from: 'e4',    to: 'q2',    fromSide: 'bottom', toSide: 'top', label: '生产后', via: [{ x: 740, y: 340 }, { x: 115, y: 340 }] },
    { id: 'e8', from: 'q2',    to: 'r1',    fromSide: 'right',  toSide: 'left' },
    { id: 'e9', from: 'q2',    to: 'r2',    fromSide: 'right',  toSide: 'left' },
    { id: 'e10', from: 'q2',   to: 'r3',    fromSide: 'right',  toSide: 'left' },
  ],
  bounds: [],
}

/* ───────────────── 图 4：开发流（flowchart LR）───────────────── */
export const figDevFlow: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'r',   x: 0,    y: 40, w: 120, h: 60, kind: 'external', label: '业务需求',         sub: '',                                  sigil: SIGIL_DOC },
    { id: 'a1',  x: 135,  y: 40, w: 120, h: 60, kind: 'be',       label: '方案生成 Agent',   sub: '只读接口 · 随便跑',                 sigil: SIGIL_WRITE },
    { id: 'm',   x: 270,  y: 40, w: 120, h: 60, kind: 'key',      label: '管理人员审查方案', sub: '反向追问 · 输出完整方案',            sigil: SIGIL_ARROWS },
    { id: 'gl',  x: 405,  y: 40, w: 120, h: 60, kind: 'key',      label: 'GitLab 触发器',    sub: '批准（高风险接口）',                sigil: SIGIL_ARROWS },
    { id: 'a2',  x: 540,  y: 40, w: 130, h: 60, kind: 'be',       label: '方案落地 Agent',   sub: '独立隔离系统',                      sigil: SIGIL_WRITE },
    { id: 'b',   x: 685,  y: 40, w: 120, h: 60, kind: 'be',       label: '开发分支',          sub: '非主分支',                          sigil: SIGIL_DOC },
    { id: 'ci',  x: 820,  y: 40, w: 120, h: 60, kind: 'be',       label: 'CI/CD',            sub: '自动部署到测试环境',                sigil: SIGIL_WRITE },
    { id: 'te',  x: 955,  y: 40, w: 120, h: 60, kind: 'be',       label: '测试环境验证',     sub: '管理人员 + 需求方',                 sigil: SIGIL_DB },
    { id: 'm2',  x: 1090, y: 40, w: 120, h: 60, kind: 'key',      label: '管理人员正式发布', sub: '高风险审批',                        sigil: SIGIL_ARROWS },
    { id: 'u',   x: 1225, y: 40, w: 120, h: 60, kind: 'external', label: '需求方验收',        sub: '体验码 / APK',                      sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1',  from: 'r',  to: 'a1',  fromSide: 'right', toSide: 'left' },
    { id: 'e2',  from: 'a1', to: 'm',   fromSide: 'right', toSide: 'left' },
    { id: 'e3',  from: 'm',  to: 'gl',  fromSide: 'right', toSide: 'left' },
    { id: 'e4',  from: 'gl', to: 'a2',  fromSide: 'right', toSide: 'left' },
    { id: 'e5',  from: 'a2', to: 'b',   fromSide: 'right', toSide: 'left' },
    { id: 'e6',  from: 'b',  to: 'ci',  fromSide: 'right', toSide: 'left' },
    { id: 'e7',  from: 'ci', to: 'te',  fromSide: 'right', toSide: 'left' },
    { id: 'e8',  from: 'te', to: 'm2',  fromSide: 'right', toSide: 'left' },
    { id: 'e9',  from: 'te', to: 'u',   fromSide: 'right', toSide: 'left', dash: true },
    { id: 'e10', from: 'm2', to: 'u',   fromSide: 'right', toSide: 'left' },
  ],
  bounds: [
    { x: -20,  y: 20, w: 150, h: 100, label: '需求侧' },
    { x: 125,  y: 20, w: 555, h: 100, label: 'Agent 系统（独立隔离）' },
    { x: 800,  y: 20, w: 565, h: 100, label: 'CI/CD 工程流' },
  ],
}
