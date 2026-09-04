import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-why（yaml label：功能：「为什么？」AI 反问式教学） */
export default function FWhy() {
  return (
    <>
      <SceneClip />
      <p>知识点详情页有一个「为什么？」按钮。点进去之后，AI 不直接给结论，而是从一个具体场景开始反问，根据回答逐步引导，直到用户自己推导出答案——即苏格拉底式教学。</p>
      <p>实现上它是一个带工具的教学 Agent：可以追问（ask_user 挂起对话、等用户作答后继续），可以把讲透的内容更新回知识点（save_topic），也可以标记掌握度（set_mastery）。</p>
      <p>入口体验上有一个细节：点击后先启动教学、等 AI 返回首个 token 再跳转对话页，避免黑屏等待。</p>
    </>
  )
}
