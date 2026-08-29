import { gsap } from 'gsap' // 显式导入（import type 只是类型，运行时不会拉 gsap）
import { pipelineNodes, PIPELINE_TOTAL_W, PIPELINE_TOTAL_H, NODE_CENTER_Y, PIPELINE_W } from './scene-data'
import type { Scene } from '../../../src/components/explore/SceneController'

/**
 * ai-it-system 的探索视图动画舞台（v2 demos 字典）。
 *
 * 单一 demo `badcase-journey`：一条完整叙事——
 * - 顶部 left bubble 打字机出现「搜索 badcase：query X 召回不全，预期 Y 实际 Z」
 * - 节点从左到右 stagger 点亮（问题报告→AI 分析→开发分支→CI/CD→审查合并）
 * - CI 节点亮起时旁边小方块由灰转绿（#ci-light backgroundColor → #0E6E5C）
 * - MR 节点亮起时右上角「✓ merged」标签淡入
 * - 底部字幕最终变为「全程几乎零沟通：人只在报告与验收出现两次」
 *
 * 总时长约 6s。
 */
export const demos: Record<string, Scene> = {
  'badcase-journey': {
    name: 'badcase-journey',
    Stage: PipelineSvg,
    build() {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

      const nodeSelectors = pipelineNodes.map((n) => `#${n.id}`)

      // 初始：所有节点透明、副元素隐藏
      tl.set(nodeSelectors, { opacity: 0, fillOpacity: 0.2 })
      tl.set('#scene-subtitle', { opacity: 0 })
      tl.set('#report-bubble', { opacity: 0 })
      tl.set('#ci-light', { opacity: 1, backgroundColor: '#cccccc' })
      tl.set('#merged-tag', { opacity: 0 })

      // ─── 1) 顶部 left bubble 打字机出现（≈2.2s） ───
      const bubbleText = '搜索 badcase：query X 召回不全，预期 Y 实际 Z'
      tl.to('#report-bubble', { opacity: 1, duration: 0.2 })
      for (let i = 1; i <= bubbleText.length; i++) {
        tl.call(() => {
          const el = document.getElementById('report-bubble')
          if (el) el.textContent = bubbleText.slice(0, i)
        })
        tl.to({}, { duration: 0.08 })
      }
      tl.to({}, { duration: 0.3 }) // 打字机结束后停留

      // ─── 2) 字幕"全链路总览"淡入 ───
      tl.call(() => {
        const el = document.querySelector('#scene-subtitle')
        if (el) el.textContent = '全链路总览'
      })
      tl.to('#scene-subtitle', { opacity: 1, duration: 0.3 })

      // ─── 3) 节点从左到右 stagger 点亮（≈2.1s） ───
      tl.to(nodeSelectors,
        { opacity: 1, fillOpacity: 1, duration: 0.45, stagger: 0.42 },
        '<+0.2')

      // ─── 4) CI 节点（n-cicd）亮起时—— ci-light 由灰转绿 ───
      tl.set('#ci-light', { backgroundColor: '#0E6E5C' }, '>-0.15')

      // ─── 5) MR 节点（n-review）亮起时—— merged-tag 右上角淡入 ───
      tl.to('#merged-tag', { opacity: 1, duration: 0.35 }, '<+0.2')

      // ─── 6) 字幕最终切换为「全程几乎零沟通：人只在报告与验收出现两次」 ───
      tl.call(() => {
        const el = document.querySelector('#scene-subtitle')
        if (el) el.textContent = '全程几乎零沟通：人只在报告与验收出现两次'
      }, [], '+=0.6')
      tl.to('#scene-subtitle', { opacity: 1, duration: 0.45 }, '<')

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
      {/* 顶部 left bubble：报告内容（打字机） */}
      <g>
        <rect
          id="report-bubble-bg"
          x={20}
          y={20}
          width={420}
          height={56}
          rx={12}
          ry={12}
          className="scene-bubble-bg"
        />
        <text
          id="report-bubble"
          x={36}
          y={54}
          className="scene-bubble-text"
        >
          {''}
        </text>
      </g>

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

      {/* CI 节点旁边的小方块（默认灰色；CI 节点亮起时由灰转绿 #0E6E5C） */}
      <rect
        id="ci-light"
        x={pipelineNodes[3].x + pipelineNodes[3].w - 14}
        y={pipelineNodes[3].y - 18}
        width={14}
        height={14}
        rx={3}
        ry={3}
      />

      {/* MR 节点右上角「✓ merged」标签 */}
      <text
        id="merged-tag"
        x={pipelineNodes[4].x + pipelineNodes[4].w}
        y={pipelineNodes[4].y - 8}
        textAnchor="end"
        className="scene-merged-tag"
      >
        ✓ merged
      </text>

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