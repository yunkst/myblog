import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-subagent（yaml label：原理：子 Agent——上下文隔离与并行调度） */
export default function PSubagent() {
  return (
    <>
      <SceneClip />
      <p>主 Agent 的上下文长度有限。让它「读 30 章梳理人物关系」，正文会占用大量上下文，中间过程还会影响后续的创作判断。</p>
      <p>解法是 dispatch_subagent：主 Agent 说明任务和授权范围（allowed_tools 白名单），子 Agent 在完全独立的上下文中执行，完成后只将一份结构化 Markdown 总结带回主对话，中间读过的章节不占用主 Agent 的上下文。</p>
      <p>调度上的硬约束：4 并发槽 + 30 FIFO 排队（按会话隔离计数）；子 Agent 不能再派生子 Agent（单层嵌套）；调用白名单外的工具会被拒绝。聊天流中每个子任务有独立状态卡片，可展开查看完整执行过程。</p>
    </>
  )
}
