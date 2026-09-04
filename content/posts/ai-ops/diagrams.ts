import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

/* 共用 sigil（沿用 ArchDiagram DEMO 已校验的 16x16 SVG path） */
const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v4c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 图 1：体系总览（ops-overview）───────────────── */
export const figOpsOverview: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'ai',      x: 70,  y: 60,  w: 170, h: 60, kind: 'key',      label: 'AI 运维 agent',  sub: '观察 · 判断 · 提案',              sigil: SIGIL_ARROWS },
    { id: 'human',   x: 300, y: 60,  w: 170, h: 60, kind: 'external', label: '人',             sub: '搭体系 · 定边界 · 做审批',        sigil: SIGIL_DOC },
    { id: 'gitlab',  x: 70,  y: 220, w: 170, h: 60, kind: 'key',      label: 'GitLab 集群内',  sub: 'GitOps 仓库 · 自循环',            sigil: SIGIL_DB },
    { id: 'argocd',  x: 300, y: 220, w: 170, h: 60, kind: 'key',      label: 'ArgoCD',         sub: 'App of Apps · selfHeal',          sigil: SIGIL_ARROWS },
    { id: 'apisix',  x: 560, y: 220, w: 150, h: 60, kind: 'key',      label: 'APISIX',         sub: '统一入口 · 禁 LB/NodePort',       sigil: SIGIL_ARROWS },
    { id: 'cluster', x: 770, y: 220, w: 180, h: 60, kind: 'be',       label: '业务负载',       sub: 'dev/prod overlays',               sigil: SIGIL_WRITE },
    { id: 'wecom',   x: 70,  y: 380, w: 150, h: 56, kind: 'external', label: '企业微信',       sub: '告警 · 巡检报告',                 sigil: SIGIL_DOC },
    { id: 'monitor', x: 300, y: 380, w: 220, h: 56, kind: 'be',       label: '可观测栈',       sub: 'Prometheus · Loki · blackbox',    sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'ai',      to: 'gitlab',  fromSide: 'bottom', toSide: 'top',    label: '写：YAML + MR',           emph: true },
    { id: 'e2', from: 'human',   to: 'gitlab',  fromSide: 'bottom', toSide: 'left',   label: '评审 · 合并',             via: [{ x: 385, y: 160 }, { x: 60, y: 160 }, { x: 60, y: 250 }] },
    { id: 'e3', from: 'gitlab',  to: 'argocd',  fromSide: 'right',  toSide: 'left',   label: 'push webhook 秒级感知',   emph: true },
    { id: 'e4', from: 'argocd',  to: 'cluster', fromSide: 'top',    toSide: 'top',    label: '自动同步 · 漂移自纠',     emph: true, via: [{ x: 385, y: 160 }, { x: 860, y: 160 }] },
    { id: 'e5', from: 'apisix',  to: 'cluster', fromSide: 'right',  toSide: 'left',   label: '所有流量经网关',          emph: true },
    { id: 'e6', from: 'ai',      to: 'cluster', fromSide: 'right',  toSide: 'right',  label: '读：get/logs 不设限',     dash: true, via: [{ x: 260, y: 140 }, { x: 980, y: 140 }, { x: 980, y: 250 }] },
    { id: 'e7', from: 'monitor', to: 'wecom',   fromSide: 'left',   toSide: 'right',  label: '告警投递' },
    { id: 'e8', from: 'cluster', to: 'monitor', fromSide: 'bottom', toSide: 'top',    label: '指标 · 日志',             via: [{ x: 860, y: 340 }, { x: 410, y: 340 }] },
  ],
  bounds: [
    { x: 50, y: 200, w: 440, h: 100, label: 'GitOps 控制面 · 写操作唯一通道' },
  ],
}

/* ───────────────── 图 2：GitOps 笼子（gitops-cage）───────────────── */
export const figGitopsCage: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'human',   x: 40,  y: 60,  w: 150, h: 60, kind: 'external', label: '人',          sub: '评审 · 合并 MR',         sigil: SIGIL_DOC },
    { id: 'ai',      x: 40,  y: 220, w: 170, h: 60, kind: 'external', label: 'AI agent',    sub: '无集群写权限',           sigil: SIGIL_ARROWS },
    { id: 'git',     x: 300, y: 140, w: 180, h: 60, kind: 'key',      label: 'GitLab',      sub: 'YAML + MR 唯一写入口',   sigil: SIGIL_DB },
    { id: 'argo',    x: 560, y: 140, w: 180, h: 60, kind: 'key',      label: 'ArgoCD',      sub: 'selfHeal 自动纠偏',      sigil: SIGIL_ARROWS },
    { id: 'cluster', x: 810, y: 140, w: 170, h: 60, kind: 'be',       label: 'K8s 集群',    sub: '真实状态 = Git 声明',    sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'ai',    to: 'git',     fromSide: 'right', toSide: 'left',   label: '写：只能 YAML + MR',  emph: true },
    { id: 'e2', from: 'human', to: 'git',     fromSide: 'right', toSide: 'left',   label: '评审 · 合并',         emph: true },
    { id: 'e3', from: 'git',   to: 'argo',    fromSide: 'right', toSide: 'left',   label: 'webhook 触发同步',    emph: true },
    { id: 'e4', from: 'argo',  to: 'cluster', fromSide: 'right', toSide: 'left',   label: '自动同步',            emph: true },
    { id: 'e5', from: 'ai',    to: 'cluster', fromSide: 'right', toSide: 'bottom', label: '读：get/logs/describe', dash: true, via: [{ x: 390, y: 320 }, { x: 895, y: 320 }] },
  ],
  bounds: [
    { x: 280, y: 110, w: 700, h: 120, label: '写操作唯一通道 · GitOps 笼子' },
  ],
}

/* ───────────────── 图 3：密钥管道（secret-pipeline）───────────────── */
export const figSecretPipeline: {
  nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]
  /** 默认左上角图例撞「明文区」bound 贴纸，挪到底部左下空区 */
  legendAt: { x: number; y: number }
} = {
  legendAt: { x: 12, y: 320 },
  nodes: [
    { id: 'human',     x: 40,  y: 60,  w: 170, h: 60, kind: 'external', label: '人 · 网页填值',      sub: '明文仅此一处',            sigil: SIGIL_DOC },
    { id: 'infisical', x: 280, y: 60,  w: 190, h: 60, kind: 'db',       label: 'Infisical',          sub: '自托管 · Web UI',          sigil: SIGIL_DB },
    { id: 'operator',  x: 550, y: 60,  w: 190, h: 60, kind: 'be',       label: 'secrets-operator',   sub: 'SA TokenReview 无静态凭证', sigil: SIGIL_WRITE },
    { id: 'secret',    x: 810, y: 60,  w: 170, h: 60, kind: 'db',       label: 'K8s Secret',         sub: '自动同步生成',             sigil: SIGIL_DB },
    { id: 'app',       x: 810, y: 240, w: 170, h: 60, kind: 'be',       label: '业务 Pod',           sub: '照常挂载 · 无感知',        sigil: SIGIL_WRITE },
    { id: 'cr',        x: 550, y: 240, w: 190, h: 60, kind: 'be',       label: 'InfisicalSecret CR', sub: 'Git 里只有元数据',         sigil: SIGIL_DOC },
    { id: 'ai',        x: 280, y: 240, w: 170, h: 60, kind: 'key',      label: 'AI agent',           sub: '设计管道 · 不见值',        sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'human',     to: 'infisical', fromSide: 'right',  toSide: 'left',   label: '填密钥值',     emph: true },
    { id: 'e2', from: 'ai',        to: 'cr',        fromSide: 'right',  toSide: 'left',   label: '写 CR · 元数据', emph: true },
    { id: 'e3', from: 'cr',        to: 'operator',  fromSide: 'top',    toSide: 'bottom', label: '声明来源路径' },
    { id: 'e4', from: 'infisical', to: 'operator',  fromSide: 'right',  toSide: 'left',   label: 'K8s Auth 拉值', emph: true },
    { id: 'e5', from: 'operator',  to: 'secret',    fromSide: 'right',  toSide: 'left',   label: '同步写入',     emph: true },
    { id: 'e6', from: 'secret',    to: 'app',       fromSide: 'bottom', toSide: 'top',    label: '挂载' },
  ],
  bounds: [
    { x: 20, y: 40, w: 470, h: 100, label: '明文只存在于这一区' },
  ],
}

/* ───────────────── 图 4：平台组件总览（platform-stack）───────────────── */
export const figPlatformStack: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'gitlab',   x: 40,  y: 60,  w: 170, h: 56, kind: 'key',      label: 'GitLab 集群内',         sub: 'GitOps 仓库自托管',      sigil: SIGIL_DB },
    { id: 'argocd',   x: 250, y: 60,  w: 180, h: 56, kind: 'key',      label: 'ArgoCD',                sub: 'App of Apps',            sigil: SIGIL_ARROWS },
    { id: 'apisix',   x: 480, y: 60,  w: 170, h: 56, kind: 'key',      label: 'APISIX',                sub: '统一入口',               sigil: SIGIL_ARROWS },
    { id: 'casdoor',  x: 700, y: 60,  w: 160, h: 56, kind: 'be',       label: 'Casdoor',               sub: 'SSO 统一登录',           sigil: SIGIL_WRITE },
    { id: 'infisical',x: 900, y: 60,  w: 160, h: 56, kind: 'db',       label: 'Infisical',             sub: '密钥管理',               sigil: SIGIL_DB },
    { id: 'prom',     x: 40,  y: 200, w: 200, h: 56, kind: 'be',       label: 'kube-prometheus-stack', sub: '指标 · 告警',            sigil: SIGIL_WRITE },
    { id: 'loki',     x: 280, y: 200, w: 170, h: 56, kind: 'be',       label: 'Loki + Promtail',       sub: '日志聚合 · 30 天',       sigil: SIGIL_WRITE },
    { id: 'blackbox', x: 490, y: 200, w: 170, h: 56, kind: 'be',       label: 'blackbox-exporter',     sub: '黑盒探测',               sigil: SIGIL_WRITE },
    { id: 'wecom',    x: 700, y: 200, w: 160, h: 56, kind: 'external', label: '企微 webhook',          sub: '统一投递通道',           sigil: SIGIL_DOC },
    { id: 'dbsync',   x: 900, y: 200, w: 170, h: 56, kind: 'be',       label: 'db-sync',               sub: '生产→测试每日重灌',      sigil: SIGIL_WRITE },
    { id: 'cloud',    x: 900, y: 340, w: 170, h: 56, kind: 'external', label: '云数据库每日备份',      sub: '经 COS 中转 · 留 3 份',  sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'gitlab',  to: 'argocd',    fromSide: 'right',  toSide: 'left',   label: 'push webhook',    emph: true },
    { id: 'e2', from: 'argocd',  to: 'apisix',    fromSide: 'right',  toSide: 'left',   label: '声明式部署',      emph: true },
    { id: 'e3', from: 'apisix',  to: 'loki',      fromSide: 'bottom', toSide: 'top',    label: '访问日志集中',    emph: true, via: [{ x: 565, y: 160 }, { x: 365, y: 160 }] },
    { id: 'e4', from: 'argocd',  to: 'prom',      fromSide: 'bottom', toSide: 'top',    label: '部署',            dash: true, via: [{ x: 340, y: 160 }, { x: 140, y: 160 }] },
    { id: 'e5', from: 'prom',    to: 'wecom',     fromSide: 'right',  toSide: 'top',    label: '告警投递',        via: [{ x: 260, y: 170 }, { x: 780, y: 170 }] },
    { id: 'e6', from: 'cloud',   to: 'dbsync',    fromSide: 'top',    toSide: 'bottom', label: '备份文件恢复' },
    { id: 'e7', from: 'casdoor', to: 'infisical', fromSide: 'right',  toSide: 'left',   label: 'OIDC 直连' },
  ],
  bounds: [
    { x: 20, y: 180, w: 660, h: 100, label: '观测层 · AI 的感官' },
  ],
}

/* ───────────────── 图 5：巡检 agent 三阶段（inspector-phases）───────────────── */
export const figInspectorPhases: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'cron',     x: 40,   y: 150, w: 160, h: 60, kind: 'external', label: '定时触发',   sub: '每日 9:00 · 14 分钟预算',  sigil: SIGIL_DOC },
    { id: 'main',     x: 280,  y: 150, w: 190, h: 60, kind: 'key',      label: '主 Agent',   sub: '编排 · 疑点识别',          sigil: SIGIL_ARROWS },
    { id: 's1',       x: 560,  y: 40,  w: 200, h: 52, kind: 'be',       label: '攻击面',     sub: '5xx · 敏感路径 · 异常 IP', sigil: SIGIL_WRITE },
    { id: 's2',       x: 560,  y: 112, w: 200, h: 52, kind: 'be',       label: '服务健康',   sub: '重启基线 · 证书 · 探测',   sigil: SIGIL_WRITE },
    { id: 's3',       x: 560,  y: 210, w: 200, h: 52, kind: 'be',       label: '资源水位',   sub: 'CPU/内存/磁盘 · OOM',      sigil: SIGIL_WRITE },
    { id: 's4',       x: 560,  y: 282, w: 200, h: 52, kind: 'be',       label: '合规',       sub: 'limits · 探针 · VPA',      sigil: SIGIL_WRITE },
    { id: 'research', x: 830,  y: 150, w: 190, h: 60, kind: 'be',       label: '研究子 Agent', sub: '独立上下文 · 跨维度取证', sigil: SIGIL_WRITE },
    { id: 'report',   x: 830,  y: 290, w: 190, h: 60, kind: 'key',      label: '聚合 · 脱敏', sub: '异常详写 · 正常压一行',   sigil: SIGIL_ARROWS },
    { id: 'wecom',    x: 1080, y: 290, w: 160, h: 60, kind: 'external', label: '企业微信',   sub: '报告投递',                 sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'cron',     to: 'main',     fromSide: 'right',  toSide: 'left',  label: '触发',                    emph: true },
    { id: 'e2', from: 'main',     to: 's1',       fromSide: 'right',  toSide: 'left',  label: '并行扫描',                emph: true, via: [{ x: 520, y: 180 }, { x: 520, y: 66 }] },
    { id: 'e3', from: 'main',     to: 's2',       fromSide: 'right',  toSide: 'left',  label: '',                        via: [{ x: 520, y: 180 }, { x: 520, y: 138 }] },
    { id: 'e4', from: 'main',     to: 's3',       fromSide: 'right',  toSide: 'left',  label: '',                        via: [{ x: 520, y: 180 }, { x: 520, y: 236 }] },
    { id: 'e5', from: 'main',     to: 's4',       fromSide: 'right',  toSide: 'left',  label: '',                        via: [{ x: 520, y: 180 }, { x: 520, y: 308 }] },
    { id: 'e6', from: 'main',     to: 'research', fromSide: 'right',  toSide: 'left',  label: '疑点深挖 ≤5 次' },
    { id: 'e7', from: 'research', to: 'report',   fromSide: 'bottom', toSide: 'top',   label: '取证结论' },
    { id: 'e8', from: 'report',   to: 'wecom',    fromSide: 'right',  toSide: 'left',  label: '全绿只发一行',            emph: true },
    { id: 'e9', from: 'main',     to: 'report',   fromSide: 'bottom', toSide: 'left',  label: '降级：LLM 不可用走纯规则', dash: true, via: [{ x: 375, y: 360 }, { x: 830, y: 360 }] },
  ],
  bounds: [
    { x: 540, y: 20, w: 240, h: 330, label: 'Phase 1 · 四维度并行' },
  ],
}

/* ───────────────── 图 6：成本分级（cost-tiers）───────────────── */
export const figCostTiers: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'yearly',   x: 40,  y: 60,  w: 200, h: 60, kind: 'key', label: '包年包月 ×2',       sub: '关键服务亲和性钉住',   sigil: SIGIL_DB },
    { id: 'spot',     x: 40,  y: 220, w: 200, h: 60, kind: 'be',  label: '竞价实例',          sub: '约 1/8 价格 · 可被回收', sigil: SIGIL_WRITE },
    { id: 'critical', x: 330, y: 60,  w: 200, h: 56, kind: 'key', label: 'APISIX · ArgoCD',   sub: '挂了全体系瘫痪',       sigil: SIGIL_ARROWS },
    { id: 'others',   x: 330, y: 220, w: 200, h: 56, kind: 'be',  label: '测试 · 后台 · 批处理', sub: '可中断负载',         sigil: SIGIL_WRITE },
    { id: 'prod',     x: 630, y: 60,  w: 180, h: 52, kind: 'key', label: '生产对外服务',      sub: 'Priority 最高 · 强制 HPA', sigil: SIGIL_ARROWS },
    { id: 'internal', x: 630, y: 162, w: 180, h: 52, kind: 'be',  label: '内部后台',          sub: '巡检 · 监控 · CI',     sigil: SIGIL_WRITE },
    { id: 'test',     x: 630, y: 264, w: 180, h: 52, kind: 'be',  label: '测试环境',          sub: '单副本 · 每晚重灌',    sigil: SIGIL_WRITE },
    { id: 'vpa',      x: 880, y: 162, w: 170, h: 52, kind: 'db',  label: 'VPA 建议',          sub: '资源申请定价依据',     sigil: SIGIL_DB },
  ],
  edges: [
    { id: 'e1', from: 'yearly',   to: 'critical', fromSide: 'right',  toSide: 'left',   label: '钉住',           emph: true },
    { id: 'e2', from: 'spot',     to: 'others',   fromSide: 'right',  toSide: 'left',   label: '承载',           emph: true },
    { id: 'e3', from: 'prod',     to: 'internal', fromSide: 'bottom', toSide: 'top',    label: '资源紧张优先扩' },
    { id: 'e4', from: 'internal', to: 'test',     fromSide: 'bottom', toSide: 'top',    label: '不足时驱逐' },
    { id: 'e5', from: 'vpa',      to: 'prod',     fromSide: 'left',   toSide: 'right',  label: '建议值 → 申请',  dash: true },
  ],
  bounds: [
    { x: 610, y: 40, w: 220, h: 300, label: 'PriorityClass 三级水位' },
  ],
}

/* ───────────────── 图 7：下一步·提议修复闭环（next-step）───────────────── */
export const figNextStep: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'inspector', x: 40,  y: 60, w: 190, h: 60, kind: 'key',      label: '巡检 Agent',       sub: '发现异常',          sigil: SIGIL_ARROWS },
    { id: 'mr',        x: 330, y: 60, w: 190, h: 60, kind: 'be',       label: '修复 MR 自动挂单', sub: 'diff + 根因分析',   sigil: SIGIL_WRITE },
    { id: 'human',     x: 620, y: 60, w: 170, h: 60, kind: 'external', label: '人评审',           sub: '合并即修复',        sigil: SIGIL_DOC },
    { id: 'argo',      x: 880, y: 60, w: 170, h: 60, kind: 'key',      label: 'ArgoCD',           sub: '同步生效',          sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'inspector', to: 'mr',    fromSide: 'right',  toSide: 'left',   label: '下一步：提议修复',   emph: true },
    { id: 'e2', from: 'mr',        to: 'human', fromSide: 'right',  toSide: 'left',   label: '挂评审队列',         emph: true },
    { id: 'e3', from: 'human',     to: 'argo',  fromSide: 'right',  toSide: 'left',   label: '合并 → 部署',        emph: true },
    { id: 'e4', from: 'inspector', to: 'human', fromSide: 'bottom', toSide: 'bottom', label: '现状：只报告 · 人来修', dash: true, via: [{ x: 135, y: 150 }, { x: 705, y: 150 }] },
  ],
  bounds: [],
}
