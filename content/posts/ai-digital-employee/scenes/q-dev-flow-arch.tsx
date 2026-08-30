import SceneClip from '../../../../src/components/explore/SceneClip'
import ArchDiagram from '../../../../src/components/blog-anim/ArchDiagram'
import { figDevFlow } from '../../../../src/components/blog-anim/diagrams/ai-digital-employee'

/** 幕正文：q-dev-flow-arch（yaml label：开发流架构图）—— 从 q-future 拆出（mode 2） */
export default function QDevFlowArch() {
  return (
    <>
      <SceneClip demo="dev-flow-arch" />
      <ArchDiagram {...figDevFlow} />
    </>
  )
}
