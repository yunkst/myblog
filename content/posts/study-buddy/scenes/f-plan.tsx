import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-plan（yaml label：功能：备考拆里程碑） */
export default function FPlan() {
  return (
    <>
      <SceneClip />
      <p>告诉时习考试日期和目标，备考 Agent 会先反问几个问题（每天可投入多少时间、当前基础如何），再把备考期拆成里程碑和每日任务。</p>
      <p>反问通过 ask_user 工具完成：Agent 挂起对话、渲染选项卡，用户作答后继续规划。生成的计划落入 plan / plan_day_task 两张表，每天打开「今日」就能看到当天的任务。</p>
    </>
  )
}
