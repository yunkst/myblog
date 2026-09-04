import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-rewrite（yaml label：功能：不爽的剧情，AI 帮你改） */
export default function FRewrite() {
  return (
    <>
      <SceneClip />
      <p>读到不满意的剧情时，可以在 Agent Chat 里直接说明修改要求。</p>
      <p>支持的改写类型包括：补全一笔带过的打斗或心理描写；为中断更新的小说续写后续；在某章之后插入一段情节；或者修改设定——例如改为开放式结局、让反派换一种结局，由 AI 按新设定重写整章。</p>
      <p>每次重写都会保留历史版本，可以随时回退到原文。改写后的内容与原有章节一样进入缓存和搜索。</p>
    </>
  )
}
