import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-focus（yaml label：功能：专注时钟 + 学习日报） */
export default function FFocus() {
  return (
    <>
      <SceneClip />
      <p>一键开始专注，结束后自动汇总进当天的学习日报：专注了多久、复习了哪些知识点、和 AI 讨论了哪些题。</p>
      <p>日报卡片可以分享到小红书：手账风格排版，带纸纹底和印章。专注记录存在本地 focus_session 表，日报由聚合查询生成，不需要联网。</p>
    </>
  )
}
