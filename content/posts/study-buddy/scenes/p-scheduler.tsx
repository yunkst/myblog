import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-scheduler（yaml label：原理：FSRS 复习调度器） */
export default function PScheduler() {
  return (
    <>
      <SceneClip />
      <p>调度器是 FSRS 思路的简化实现。每个知识点维护两个数值：记忆稳定性 S（预计能记住多少天）和难度 D。四档评分对应不同的初始 S（忘了 0.02 天 / 困难 1 天 / 良好 3 天 / 简单 8 天）和增长系数（遗忘时 S 乘 0.3 衰减，困难 ×1.2、良好 ×2.5、简单 ×4.0）。</p>
      <p>所有参数集中在 params.dart 一个文件里，调参不需要改动算法实现。掌握度展示（未知 / 薄弱 / 学习中 / 已掌握）由 S 派生，不单独存储，避免两处数据不一致。</p>
    </>
  )
}
