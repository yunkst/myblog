import { gsap } from 'gsap' // 显式导入（import type 只是类型，运行时不会拉 gsap）
import { pipelineNodes, PIPELINE_TOTAL_W, PIPELINE_TOTAL_H, NODE_CENTER_Y, PIPELINE_W } from './scene-data'
import type { Scene } from '../../../src/components/explore/SceneController'

/**
 * ai-it-system 的探索视图动画舞台（v2 demos 字典）。
 *
 * 单一 demo `badcase-journey`：把 v1 的 intro + q-search-pipeline 两段合并为一条连续叙事，
 * 删除 q-ops-backup 段——它原本就是死 label（v1 只声明未触发）。
 *
 * 节拍：
 * - set 全部节点 opacity 0
 * - subtitle 淡入"全链路总览"
 * - 节点 stagger 淡入（0.12 间隔）
 * - subtitle 切换为"搜索优化流水线：问题报告 → AI 分析 → 提交分支 → CI/CD → 审查合并"（tl.call 改 textContent）
 * - 节点再次从左到右 stagger 点亮（0.35 间隔）
 *
 * 总时长约 4s。
 */
export const demos: Record<string, Scene> = {
  'badcase-journey': {
    name: 'badcase-journey',
    Stage: PipelineSvg,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

      // 初始：所有节点透明
      tl.set(pipelineNodes.map((n) => `#${n.id}`), { opacity: 0, fillOpacity: 0.2 })
      tl.set('#scene-subtitle', { opacity: 0 })

      // ─── intro：字幕"全链路总览"+ 节点 stagger 淡入 ───
      tl.to('#scene-subtitle', { opacity: 1, duration: 0.4 })
      tl.to(pipelineNodes.map((n) => `#${n.id}`),
        { opacity: 1, fillOpacity: 1, duration: 0.6, stagger: 0.12 },
        '<')

      // ─── q-search-pipeline 续：整体淡出 → 字幕切换 → 节点重新从左到右点亮 ───
      tl.to(pipelineNodes.map((n) => `#${n.id}`),
        { opacity: 0.3, fillOpacity: 0.3, duration: 0.25 }, '+=0.3')
      // GSAP 3 核心不处理 SVG <text> 的 textContent（需要 TextPlugin），用 .call() 回调直接改 DOM
      tl.call(() => {
        const el = document.querySelector('#scene-subtitle')
        if (el) el.textContent = '搜索优化流水线：问题报告 → AI 分析 → 提交分支 → CI/CD → 审查合并'
      })
      tl.to('#scene-subtitle', { opacity: 1, duration: 0.3 }, '<')
      tl.to(pipelineNodes.map((n) => `#${n.id}`),
        {
          opacity: 1,
          fillOpacity: 1,
          duration: 0.45,
          stagger: 0.35,
        },
        '<+0.2')

      return tl
    },
  },
}

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
