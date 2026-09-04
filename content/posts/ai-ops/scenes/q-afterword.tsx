import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-afterword（yaml label：后记：三条结论与下一步） */
export default function QAfterword() {
  return (
    <>
      <SceneClip />
      <p>这套体系运行大半年后，可以归纳出三条结论：</p>
      <ul>
        <li>
          <strong>GitOps 是 AI 运维的最大基础设施</strong>。它不只是一种部署方式，
          而是把审计、回滚、评审三件事变成架构默认值的约束机制。
        </li>
        <li>
          <strong>AI 的判断需要真实生产来校准</strong>。db-sync 案例里，正确判断在设计文档中早已写明，
          执行时仍走了弯路——体系和设想之间的差距，只有实际运行才能暴露。
        </li>
        <li>
          <strong>安全边界的本质是职责切分</strong>：AI 观察和提案，人审批和填密钥，
          架构保证 AI 做不到越界的事。这不是信任问题，是能力边界问题。
        </li>
      </ul>
      <p>
        下一步计划把巡检 agent 从「报告异常」推进到「提议修复」：
        发现异常后直接生成修复 MR 挂在评审队列里，人合并即修复。
        约束框架已经就位，剩下的只是让框架内的执行能力更进一步。
      </p>
      <p>
        本文所述体系的配置仓库结构、巡检 agent 设计文档和踩坑记录，
        均以 GitOps 方式托管在集群内的 GitLab 上。
      </p>
    </>
  )
}
