// scene-stages.tsx — ai-ops 各 demo 的静态 Stage（首帧全亮，build 负责收回初始态）
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import {
  figOpsOverview,
  figGitopsCage,
  figSecretPipeline,
  figPlatformStack,
  figInspectorPhases,
  figCostTiers,
  figNextStep,
} from './diagrams'

/* ─── 架构图型 7 个 ─── */
export function OverviewStage() {
  return (
    <div data-arch="ops-overview">
      <ArchDiagram {...figOpsOverview} caption="人搭体系、定边界、做审批；AI 观察、判断、执行——写操作全部经 GitOps 通道" />
    </div>
  )
}
export function CageStage() {
  return (
    <div data-arch="gitops-cage">
      <ArchDiagram {...figGitopsCage} caption="犯错不可持续（selfHeal 纠偏）、密钥不可见、操作可审计——边界由架构保证，不靠提示词" />
    </div>
  )
}
export function SecretStage() {
  return (
    <div data-arch="secret-pipeline">
      <ArchDiagram {...figSecretPipeline} caption="AI 设计管道，人负责灌水：AI 只接触元数据，密钥值从头到尾不可见" />
    </div>
  )
}
export function PlatformStage() {
  return (
    <div data-arch="platform-stack">
      <ArchDiagram {...figPlatformStack} caption="所有组件经 App of Apps 声明式部署；入口收敛到 APISIX 是巡检能力的地基" />
    </div>
  )
}
export function InspectorStage() {
  return (
    <div data-arch="inspector-phases">
      <ArchDiagram {...figInspectorPhases} caption="维度并行、疑点串行、深挖封顶 5 次；LLM 不可用时退化为纯规则检查，报告照发" />
    </div>
  )
}
export function CostStage() {
  return (
    <div data-arch="cost-tiers">
      <ArchDiagram {...figCostTiers} caption="包年保底 + 竞价冲量：2 倍容量冗余，约 1/3 包年成本" />
    </div>
  )
}
export function NextStepStage() {
  return (
    <div data-arch="next-step">
      <ArchDiagram {...figNextStep} caption="下一步：从「报告异常」推进到「提议修复」——修复 MR 挂评审队列，人合并即修复" />
    </div>
  )
}
