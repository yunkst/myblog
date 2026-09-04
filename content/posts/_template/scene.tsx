// scene.tsx — demos 字典：键名必须与 explore.yaml 的 scenes[].demo 一致（validate-explore 强制）
import type { Scene } from '@/components/explore/SceneController'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import { OverviewStage, DetailStage } from './scene-stages'

export const demos: Record<string, Scene> = {
  'tpl-overview': { name: 'tpl-overview', Stage: OverviewStage, build: () => buildArchFade('[data-arch="tpl-overview"]') },
  'tpl-detail':   { name: 'tpl-detail',   Stage: DetailStage,   build: () => buildArchFade('[data-arch="tpl-detail"]') },
}
