import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-snapshot（yaml label：功能：拍题问 AI，知识点自动入库） */
export default function FSnapshot() {
  return (
    <>
      <SceneClip />
      <p>拍一道题、从相册选一张图，或直接打字提问。图片以 base64 编码随消息直接发给多模态模型，AI 负责拆思路、给解析，而不是只给一个答案。</p>
      <p>对话中涉及的知识点，由 Agent 通过工具调用（save_topic / link_topics）整理进知识点库——问过的题不会聊完就散，会沉淀为可以复习的卡片。</p>
      <p>因为使用用户自备的 OpenAI 兼容接口，图片和提问内容不经过任何第三方服务器。</p>
    </>
  )
}
