import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-context（yaml label：原理：上下文工程六件套） */
export default function PContext() {
  return (
    <>
      <SceneClip />
      <p>让 LLM 写长文不跑题，靠的不是更长的 prompt，而是结构化的上下文装配。每次写章节，六类素材从不同存储装配进输入：人物卡按 characterNames 精确注入出场角色；大纲由 AI 调用 get_outline 主动拉取；风格标签从同名变体中随机抽取一条；作家设定拼在 system prompt 头部；经验记忆按场景分桶回灌；前一章正文作为衔接上下文。</p>
      <p>记忆机制的写入入口只有 patch_memory 工具，由 AI 判断后主动写入，不做自动埋点。用户可以在设置中逐条查看、修改、删除。</p>
      <p>边界：没有跨书章节正文的自动学习，所有 Repository 调用按书严格过滤。AI 能使用的是用户主动积累的素材，未积累的部分不会被自动学习。</p>
    </>
  )
}
