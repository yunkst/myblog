import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-dev-flow-arch（yaml label：开发流架构图）—— 从 q-future 拆出
 * 一幕一元素：图由 SceneClip 里的 dev-flow-arch demo 渲染。 */
export default function QDevFlowArch() {
  return (
    <>
      <SceneClip />
      <p>需求进来后，方案 Agent 先做只读设计；落地通过 GitLab 触发器唤起独立 agent 系统，与平台完全隔离。</p>
    </>
  )
}
