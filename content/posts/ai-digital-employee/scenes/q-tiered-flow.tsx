import SceneClip from '../../../../src/components/explore/SceneClip'
import ArchDiagram from '../../../../src/components/blog-anim/ArchDiagram'
import { figTiered } from '../../../../src/components/blog-anim/diagrams/ai-digital-employee'

/** 幕正文：q-tiered-flow（yaml label：分级决策流程图）—— 从 q-tiered-execution 拆出（mode 2） */
export default function QTieredFlow() {
  return (
    <>
      <SceneClip demo="tiered-flow" />
      <ArchDiagram {...figTiered} />
    </>
  )
}
