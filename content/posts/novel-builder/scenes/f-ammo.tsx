import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-ammo（yaml label：功能：个性化素材——标签、记忆与作家设定） */
export default function FAmmo() {
  return (
    <>
      <SceneClip />
      <p>AI 写章节时可用的上下文，会随着使用逐步积累，来源有三类：</p>
      <p>写作标签：用户自建（如赛博朋克、暗黑、轻松日常），同名标签可保存多条变体，写章时随机抽取一条拼入 prompt；经验记忆：聊天中说明的偏好（如「每章结尾留一个钩子」「反派要立体」）由 AI 记录，跨书跨会话生效；作家设定：用户定义的 AI 写作人设，作为 system prompt 头部在每次写章时套用。</p>
      <p>素材积累得越完整，每次写章时可用的上下文就越多。</p>
    </>
  )
}
