import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-review（yaml label：功能：间隔复习，只复习到期的卡） */
export default function FReview() {
  return (
    <>
      <SceneClip />
      <p>每天只需要复习到期的卡片，而不是全部卡片。复习后按四档自评（忘了 / 困难 / 良好 / 简单），调度器根据评分更新该知识点的记忆稳定性和难度，计算出下次到期时间。</p>
      <p>掌握度由记忆稳定性派生：不足 1 天为薄弱，1 至 21 天为学习中，21 天及以上为已掌握。在知识点列表里可以直接看出哪些还不牢。</p>
    </>
  )
}
