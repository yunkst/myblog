// scene.tsx — ai-ops 探索视图动画舞台（v2 demos 字典）
//
// 7 个 demo 全部为架构图型（ArchDiagram 容器淡入）：
//   ops-overview, gitops-cage, secret-pipeline, platform-stack,
//   inspector-phases, cost-tiers, next-step
import type { Scene } from '@/components/explore/SceneController'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import {
  OverviewStage,
  CageStage,
  SecretStage,
  PlatformStage,
  InspectorStage,
  CostStage,
  NextStepStage,
} from './scene-stages'

export const demos: Record<string, Scene> = {
  'ops-overview':       { name: 'ops-overview',       Stage: OverviewStage,   build: () => buildArchFade('[data-arch="ops-overview"]') },
  'gitops-cage':        { name: 'gitops-cage',        Stage: CageStage,       build: () => buildArchFade('[data-arch="gitops-cage"]') },
  'secret-pipeline':    { name: 'secret-pipeline',    Stage: SecretStage,     build: () => buildArchFade('[data-arch="secret-pipeline"]') },
  'platform-stack':     { name: 'platform-stack',     Stage: PlatformStage,   build: () => buildArchFade('[data-arch="platform-stack"]') },
  'inspector-phases':   { name: 'inspector-phases',   Stage: InspectorStage,  build: () => buildArchFade('[data-arch="inspector-phases"]') },
  'cost-tiers':         { name: 'cost-tiers',         Stage: CostStage,       build: () => buildArchFade('[data-arch="cost-tiers"]') },
  'next-step':          { name: 'next-step',          Stage: NextStepStage,   build: () => buildArchFade('[data-arch="next-step"]') },
}

/* 架构图 demo 演出已收敛到共享实现 src/components/blog-anim/buildArchFade.ts */
