import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-agent-tools（yaml label：原理：Agent 工具设计） */
export default function PAgentTools() {
  return (
    <>
      <SceneClip />
      <p>改写能力由一组分工明确的工具支撑，核心原则是「工具即产品逻辑」。</p>
      <p>整章重写在 rewrite_chapter 中完成，原文、人物卡、风格标签作为上下文注入；插入新章节使用 create_chapter，补细节、续写、插情节都走这个工具；单句级修改使用 update_chapter_content 做精确替换，不调用 LLM。</p>
      <p>两个约束：多处匹配时工具拒绝执行，要求 AI 精确定位；所有重写写入 chapter_versions 版本表，任何改写都可以回滚到原文。</p>
    </>
  )
}
