import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-tool-map（yaml label：原理：29 个工具的全景分工） */
export default function PToolMap() {
  return (
    <>
      <SceneClip />
      <p>「Agent 工具设计」一幕介绍了改动幅度最大的三个写入工具。主 Agent 共有 29 个工具：28 个领域工具按职责分为八组，外加场景级的 patch_memory（经验记忆）。</p>
      <p>两个约束。一是读-写分离：读工具（list / get / read / search）可以自由调用，写工具必须先读取当前内容再执行，越权调用直接拒绝。二是工具即产品逻辑：能写成确定性规则的判断（多处匹配拒绝执行、重写必须留档）不交给模型自由发挥。</p>
      <p>唯一不直接执行具体业务的是 dispatch_subagent：将可拆分的重任务委派给独立上下文的子 Agent，见下一幕。</p>
    </>
  )
}
