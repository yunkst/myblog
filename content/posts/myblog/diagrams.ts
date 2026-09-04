// diagrams.ts — myblog 的架构图数据（设计契约见 docs/diagram-design.md）
import type { ArchNode, ArchEdge, ArchBound } from '@/components/blog-anim/ArchDiagram'

const SIGIL_DOC = 'M2 4h8M2 8h8M2 12h8'
const SIGIL_ARROWS = 'M6 3 3 8l3 5M10 3l3 5-3 5'
const SIGIL_WRITE = 'M8 2v9M8 11l-3-3M8 11l3-3M3 15h10'
const SIGIL_DB = 'M3 5c0-1.6 2.2-3 5-3s5 1.4 5 3-2.2 3-5 3-5-1.4-5-3zM3 5v6c0 1.6 2.2 3 5 3s5-1.4 5-3V5'

/* ───────────────── 图 1:两层结构(blog-overview)───────────────── */
export const figBlogOverview: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[]; legendAt?: { x: number; y: number } } = {
  nodes: [
    { id: 'site',    x: 60,  y: 60,  w: 180, h: 60, kind: 'db',  label: 'site.yaml',  sub: '站点信息 · 亮点 FAQ', sigil: SIGIL_DOC },
    { id: 'posts',   x: 60,  y: 180, w: 180, h: 60, kind: 'db',  label: 'posts/<slug>/', sub: 'meta + 场景 + 正文 + 图', sigil: SIGIL_DB },
    { id: 'explore', x: 330, y: 60,  w: 220, h: 70, kind: 'key', label: '场景编排',   sub: 'Director · 打字机 · 全屏', sigil: SIGIL_ARROWS },
    { id: 'arch',    x: 330, y: 180, w: 220, h: 70, kind: 'key', label: 'ArchDiagram', sub: '图组件 + 自动校验',  sigil: SIGIL_ARROWS },
    { id: 'dist',    x: 640, y: 120, w: 190, h: 70, kind: 'be',  label: '静态页面',   sub: 'vite-react-ssg 预渲染', sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'posts', to: 'explore', fromSide: 'right', toSide: 'left',  label: 'explore.yaml 驱动', emph: true, via: [{ x: 290, y: 210 }, { x: 290, y: 95 }] },
    { id: 'e2', from: 'posts', to: 'arch',    fromSide: 'right', toSide: 'left',  label: 'diagrams.ts', emph: true },
    { id: 'e3', from: 'explore', to: 'dist',  fromSide: 'right', toSide: 'left',  label: '渲染', emph: true },
    { id: 'e4', from: 'arch',  to: 'dist',    fromSide: 'right', toSide: 'left',  label: '渲染', emph: true, via: [{ x: 600, y: 215 }, { x: 600, y: 175 }] },
    /* site 绕底部走廊进 dist,避免横穿 explore/arch */
    { id: 'e5', from: 'site',  to: 'dist',    fromSide: 'right', toSide: 'bottom', label: '主页数据', via: [{ x: 285, y: 90 }, { x: 285, y: 300 }, { x: 735, y: 300 }] },
  ],
  bounds: [
    { x: 40, y: 40, w: 220, h: 220, label: '内容层(使用者定制)' },
    { x: 310, y: 40, w: 260, h: 230, label: '框架层(通用)' },
  ],
  /* 默认左上角图例撞内容层 bound 贴纸，挪到左下空区（e5 走廊 y300 之下） */
  legendAt: { x: 12, y: 316 },
}

/* ───────────────── 图 2:场景编排(scene-engine)───────────────── */
export const figSceneEngine: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'yaml',     x: 40,  y: 140, w: 180, h: 70, kind: 'db',  label: 'explore.yaml', sub: '场景图声明',          sigil: SIGIL_DB },
    { id: 'director', x: 300, y: 140, w: 200, h: 70, kind: 'key', label: 'Director',     sub: 'mode 1/2/3 编排',    sigil: SIGIL_ARROWS },
    { id: 'demo',     x: 570, y: 60,  w: 200, h: 60, kind: 'key', label: 'demo 舞台',    sub: '全屏灯箱 · 重播',     sigil: SIGIL_ARROWS },
    { id: 'type',     x: 570, y: 220, w: 200, h: 60, kind: 'be',  label: '打字机',       sub: '段落逐字 · 媒体顺序淡入', sigil: SIGIL_DOC },
    { id: 'choices',  x: 840, y: 140, w: 170, h: 70, kind: 'be',  label: '出口 chips',   sub: '场景跳转',            sigil: SIGIL_ARROWS },
  ],
  edges: [
    { id: 'e1', from: 'yaml',     to: 'director', fromSide: 'right', toSide: 'left',  label: '声明驱动', emph: true },
    { id: 'e2', from: 'director', to: 'demo',     fromSide: 'right', toSide: 'left',  label: 'mode 1 先播 demo', emph: true, via: [{ x: 535, y: 175 }, { x: 535, y: 90 }] },
    { id: 'e3', from: 'director', to: 'type',     fromSide: 'right', toSide: 'left',  label: 'mode 2 先打字', emph: true, via: [{ x: 545, y: 200 }, { x: 545, y: 250 }] },
    { id: 'e4', from: 'demo',     to: 'choices',  fromSide: 'right', toSide: 'left',  label: '播完', via: [{ x: 805, y: 90 }, { x: 805, y: 165 }] },
    { id: 'e5', from: 'type',     to: 'choices',  fromSide: 'right', toSide: 'left',  label: '读完出选项', emph: true, via: [{ x: 795, y: 250 }, { x: 795, y: 195 }] },
  ],
  bounds: [
    { x: 280, y: 40, w: 510, h: 260, label: '演出按文档顺序:前文未出现,后文不可见' },
  ],
}

/* ───────────────── 图 3:架构图组件(arch-engine)───────────────── */
export const figArchEngine: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'design', x: 60,  y: 60,  w: 190, h: 70, kind: 'external', label: 'diagram-design.md', sub: '设计契约',           sigil: SIGIL_DOC },
    { id: 'data',   x: 60,  y: 200, w: 190, h: 60, kind: 'db',       label: 'diagrams.ts',       sub: 'nodes/edges/bounds', sigil: SIGIL_DB },
    { id: 'render', x: 400, y: 120, w: 240, h: 80, kind: 'key',      label: 'ArchDiagram',       sub: '色板 · 标签避让 · 光点 · 交互', sigil: SIGIL_ARROWS },
    { id: 'check',  x: 400, y: 260, w: 220, h: 60, kind: 'be',       label: '自动校验',          sub: '穿越 · 碰撞 · 文字下限', sigil: SIGIL_WRITE },
  ],
  edges: [
    { id: 'e1', from: 'design', to: 'render', fromSide: 'right', toSide: 'left',  label: '规则即代码', emph: true, via: [{ x: 330, y: 95 }, { x: 330, y: 150 }] },
    { id: 'e2', from: 'data',   to: 'render', fromSide: 'right', toSide: 'left',  label: 'glob 自动发现', emph: true, via: [{ x: 300, y: 215 }, { x: 300, y: 180 }] },
    { id: 'e3', from: 'data',   to: 'check',  fromSide: 'right', toSide: 'left',  label: '纳入 FIGURES', via: [{ x: 325, y: 245 }, { x: 325, y: 290 }] },
    { id: 'e4', from: 'check',  to: 'render', fromSide: 'top',   toSide: 'bottom',label: '违规拦截', emph: true },
  ],
  bounds: [],
}

/* ───────────────── 图 4:内容即数据(content-as-data)───────────────── */
export const figContentData: { nodes: ArchNode[]; edges: ArchEdge[]; bounds: ArchBound[] } = {
  nodes: [
    { id: 'files',    x: 40,  y: 130, w: 190, h: 70, kind: 'db',  label: 'content/posts/*', sub: 'yaml + tsx + post.css', sigil: SIGIL_DB },
    { id: 'glob',     x: 300, y: 130, w: 210, h: 70, kind: 'key', label: 'import.meta.glob', sub: '自动发现 · 零注册',   sigil: SIGIL_ARROWS },
    { id: 'validate', x: 580, y: 130, w: 210, h: 70, kind: 'be',  label: 'validate-explore', sub: '三向对齐校验',        sigil: SIGIL_WRITE },
    { id: 'page',     x: 850, y: 130, w: 170, h: 70, kind: 'be',  label: '页面',           sub: '舞台 + /flat 双形态',  sigil: SIGIL_DOC },
  ],
  edges: [
    { id: 'e1', from: 'files',    to: 'glob',     fromSide: 'right', toSide: 'left', label: '目录即文章', emph: true },
    { id: 'e2', from: 'glob',     to: 'validate', fromSide: 'right', toSide: 'left', label: 'demo 名三处对齐', emph: true },
    { id: 'e3', from: 'validate', to: 'page',     fromSide: 'right', toSide: 'left', label: '一份 yaml 两种呈现', emph: true },
  ],
  bounds: [],
}
