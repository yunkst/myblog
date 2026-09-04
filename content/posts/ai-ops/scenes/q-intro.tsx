import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro（yaml label：让 AI 安全地担负运维：体系复盘） */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>
        运维是一个复杂、需要大量实践和知识积累的工作。与其让自己成为一个合格的运维人员，
        更可行的方向是搭建一套体系，让 AI 在明确的边界内承担运维工作：
        人负责搭体系、定边界、做审批，AI 负责观察、判断、执行。
      </p>
      <p>这套体系主要回答三个问题：</p>
      <ul>
        <li><strong>体系搭建步骤</strong>——从租集群到 GitOps 闭环的完整清单，以及每条清单在生产里的真实形态；</li>
        <li><strong>AI 的安全边界怎么画</strong>——不靠提示词约束，靠架构保证「做不到越界」；</li>
        <li><strong>节约成本</strong>——用稳定性分级策略，把容量做到需求的 2 倍、成本压到包年包月的约 1/3。</li>
      </ul>
      <p>
        本文是这套体系运行大半年之后的复盘：哪些设想落地了，哪些设想和生产现实碰撞后改了方向，
        以及 AI 在这套约束下的真实表现。
      </p>
    </>
  )
}
