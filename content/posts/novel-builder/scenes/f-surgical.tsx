import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-surgical（yaml label：功能：小修小补，省 token） */
export default function FSurgical() {
  return (
    <>
      <SceneClip />
      <p>不是所有修改都需要重写整章。改错别字、调整一句对话、润色一段描写，这类修改使用 update_chapter_content 工具：LLM 只产出 old → new 两个替换片段，由工具在本地做精确字符串替换，不再调用 LLM 重写整章，其余内容不变。</p>
      <p>匹配到多处且未声明 replaceAll 时，工具返回 ambiguous_match 拒绝执行，由 AI 补充定位信息后重试。</p>
    </>
  )
}
