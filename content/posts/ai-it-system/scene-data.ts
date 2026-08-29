// 搜索优化流水线相关的几何数据。
// 5 个节点横向铺开，每个节点用 <rect> + <text> 即可。
// 几何从简：节点宽度 150，间距 30，垂直居中（y=140, h=80）。

export interface PipelineNode {
  id: string        // DOM id —— 用于 focus 高亮
  x: number
  y: number
  w: number
  h: number
  label: string
  sub: string
}

export const PIPELINE_W = 150
export const PIPELINE_H = 80
export const PIPELINE_GAP = 30
export const PIPELINE_Y = 140

// 5 个节点：问题报告 → AI 分析 → 开发分支 → CI/CD → 审查合并
export const pipelineNodes: PipelineNode[] = [
  { id: 'n-report', x: 0,                                                y: PIPELINE_Y, w: PIPELINE_W, h: PIPELINE_H, label: '问题报告', sub: '运维提交' },
  { id: 'n-ai',     x: (PIPELINE_W + PIPELINE_GAP) * 1,                  y: PIPELINE_Y, w: PIPELINE_W, h: PIPELINE_H, label: 'AI 分析',  sub: '生成 patch' },
  { id: 'n-branch', x: (PIPELINE_W + PIPELINE_GAP) * 2,                  y: PIPELINE_Y, w: PIPELINE_W, h: PIPELINE_H, label: '开发分支', sub: '自动提交' },
  { id: 'n-cicd',   x: (PIPELINE_W + PIPELINE_GAP) * 3,                  y: PIPELINE_Y, w: PIPELINE_W, h: PIPELINE_H, label: 'CI/CD',    sub: 'dev 部署' },
  { id: 'n-review', x: (PIPELINE_W + PIPELINE_GAP) * 4,                  y: PIPELINE_Y, w: PIPELINE_W, h: PIPELINE_H, label: '审查合并', sub: '上线生产' },
]

// 总宽：5 * 150 + 4 * 30 = 870
export const PIPELINE_TOTAL_W = PIPELINE_W * 5 + PIPELINE_GAP * 4
// 总高：节点顶(140) + 节点高(80) + 底部字幕余量(60) = 280
export const PIPELINE_TOTAL_H = PIPELINE_Y + PIPELINE_H + 60

// 阶段节点中心 y，用于连接线
export const NODE_CENTER_Y = PIPELINE_Y + PIPELINE_H / 2
