import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-tiered-confirm（yaml label：一段确认流程） */
export default function QTieredConfirm() {
  return (
    <>
      <SceneClip />
      <p>演示的是一次典型的「安全写」操作，界面就是平台真实的样子：同事在网页对话页里说"清除订单 A123456 的绑定关联"，
AI 在协议仓库里命中对应接口，识别出这不是只读操作，弹回一张确认卡——将执行哪个工具、完整参数是什么，
全部列清楚。点下「确认执行」，动作才真正发生；审计日志记的是操作人本人，而不是"AI"。
这个接口同时标记了可逆，所以事后发现清错了，还能一键撤回。
这正是分级执行里"安全写接口：获得人类确认后立即触发"的那条路径。</p>
    </>
  )
}
