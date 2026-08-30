import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-tiered-flow（yaml label：分级决策流程图）—— 从 q-tiered-execution 拆出
 * 一幕一元素：图由 SceneClip 里的 tiered-flow demo 渲染。 */
export default function QTieredFlow() {
  return (
    <>
      <SceneClip />
      <p>四档策略的判分支一目了然。载荷锁定是高风险审批不流于形式的关键前提。</p>
    </>
  )
}
