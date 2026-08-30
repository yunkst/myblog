import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-tiered-confirm（yaml label：一段确认流程） */
export default function QTieredConfirm() {
  return (
    <>
      <SceneClip demo="tiered-confirm" />
      <p>左边演示的是一次典型的「安全写」操作：运维同事在 IM 里说"给张三开通 BI 看板权限"，
AI 识别出这不是只读操作，弹回一张确认卡——操作的完整参数、以谁的身份执行、影响哪个系统，
全部列清楚。点下确认，动作才真正发生。全程审计日志记的是操作人本人，而不是"AI"。
这正是分级执行里"安全写接口：获得人类确认后立即触发"的那条路径。</p>
    </>
  )
}
