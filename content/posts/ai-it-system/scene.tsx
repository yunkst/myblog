import { gsap } from 'gsap' // 显式导入（import type 只是类型，运行时不会拉 gsap）
import { pipelineNodes, PIPELINE_TOTAL_W, PIPELINE_TOTAL_H, NODE_CENTER_Y, PIPELINE_W } from './scene-data'
import type { Scene } from '../../../src/components/explore/SceneController'

/**
 * ai-it-system 的探索视图动画舞台。
 *
 * 三个 GSAP label：
 * - intro: 5 个节点先全亮（opacity 1），展示全流水线；底部字幕"全链路总览"。
 * - q-search-pipeline: 重新从左到右逐个淡入，强调"问题报告 → AI 分析 → 提交分支 → CI/CD → 审查合并"；
 *   同时放慢节奏让阅读者有时间跟。
 * - q-ops-backup: 把最后一个"审查合并"节点上锁（off-color 灰），前面 4 个保持高亮，文字提示
 *   "运维侧（影子备份 / GitOps）后续接入"——动画演示该节点仍然能点亮（即使占位）。
 *
 * focusable: 与 YAML 里 focus 字段对齐（n-report / n-ai / n-branch / n-cicd / n-review）。
 */
const scene: Scene = {
  focusable: pipelineNodes.map((n) => n.id),
  build() {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

    // 初始：所有节点透明
    tl.set(pipelineNodes.map((n) => `#${n.id}`), { opacity: 0, fillOpacity: 0.2 })
    tl.set('#scene-subtitle', { opacity: 0 })

    // ─── intro ───
    tl.addLabel('intro', 0)
    tl.to('#scene-subtitle', { opacity: 1, duration: 0.4 }, '<')
    tl.to(pipelineNodes.map((n) => `#${n.id}`),
      { opacity: 1, fillOpacity: 1, duration: 0.6, stagger: 0.12 },
      '<')

    // ─── q-search-pipeline ───
    tl.addLabel('q-search-pipeline', '+=0.3')
    // 先整体淡出
    tl.to(pipelineNodes.map((n) => `#${n.id}`),
      { opacity: 0.3, fillOpacity: 0.3, duration: 0.25 }, '<')
    // 字幕切换：GSAP 3 核心不处理 SVG <text> 的 textContent（需要 TextPlugin），
    // 用 .call() 回调直接改 DOM
    tl.call(() => {
      const el = document.querySelector('#scene-subtitle')
      if (el) el.textContent = '搜索优化流水线：问题报告 → AI 分析 → 提交分支 → CI/CD → 审查合并'
    })
    // 从左到右逐个点亮
    tl.to('#scene-subtitle', { opacity: 1, duration: 0.3 }, '<')
    tl.to(pipelineNodes.map((n) => `#${n.id}`),
      {
        opacity: 1,
        fillOpacity: 1,
        duration: 0.45,
        stagger: 0.35,
      },
      '<+0.2')

    // ─── q-ops-backup ───
    tl.addLabel('q-ops-backup', '+=0.3')
    tl.call(() => {
      const el = document.querySelector('#scene-subtitle')
      if (el) el.textContent = '运维侧（影子备份 / GitOps）：后续接入，节点先预留'
    })
    tl.to('#scene-subtitle', { opacity: 1, duration: 0.3 }, '<')
    // 最后一个节点（审查合并）回到 0.6 透明度作为"占位待接入"提示，其余保持
    tl.to(`#${pipelineNodes[pipelineNodes.length - 1].id}`,
      { opacity: 0.6, fillOpacity: 0.5, duration: 0.4 }, '<')

    return tl
  },
}

export default scene

/** 单独的 SVG 组件（仅供阅读视图/探索视图引用，scene.tsx 本体只是数据）。 */
export function PipelineSvg() {
  return (
    <svg
      viewBox={`0 0 ${PIPELINE_TOTAL_W} ${PIPELINE_TOTAL_H}`}
      role="img"
      aria-label="搜索优化流水线：问题报告、AI 分析、开发分支、CI/CD、审查合并"
      className="scene-svg"
    >
      {/* 节点 */}
      {pipelineNodes.map((n) => (
        <g key={n.id}>
          <rect
            id={n.id}
            x={n.x}
            y={n.y}
            width={n.w}
            height={n.h}
            rx={10}
            ry={10}
            className="scene-node"
          />
          <text
            x={n.x + n.w / 2}
            y={n.y + n.h / 2 - 8}
            textAnchor="middle"
            className="scene-node-label"
          >
            {n.label}
          </text>
          <text
            x={n.x + n.w / 2}
            y={n.y + n.h / 2 + 14}
            textAnchor="middle"
            className="scene-node-sub"
          >
            {n.sub}
          </text>
        </g>
      ))}

      {/* 连接线（静态，几何位置只算一次） */}
      {pipelineNodes.slice(0, -1).map((n, i) => {
        const next = pipelineNodes[i + 1]
        const x1 = n.x + n.w
        const x2 = next.x
        return (
          <line
            key={`arrow-${i}`}
            x1={x1}
            y1={NODE_CENTER_Y}
            x2={x2}
            y2={NODE_CENTER_Y}
            className="scene-edge"
            markerEnd="url(#scene-arrow)"
          />
        )
      })}

      {/* 箭头定义 + 底部字幕 */}
      <defs>
        <marker
          id="scene-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" className="scene-arrow-fill" />
        </marker>
      </defs>
      <text
        id="scene-subtitle"
        x={PIPELINE_TOTAL_W / 2}
        y={PIPELINE_TOTAL_H - 20}
        textAnchor="middle"
        className="scene-subtitle"
      >
        全链路总览
      </text>

      {/* 隐藏的辅助宽度（不参与渲染，仅在 typecheck 时用） */}
      <metadata>{PIPELINE_W}</metadata>
    </svg>
  )
}
