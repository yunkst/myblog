import SceneClip from '../../../../src/components/explore/SceneClip'
import ArchDiagram from '../../../../src/components/blog-anim/ArchDiagram'
import { figRequestFlow } from '../../../../src/components/blog-anim/diagrams/ai-digital-employee'

/** 幕正文：q-request-flow（yaml label：请求链路图）—— 从 q-unified-identity 拆出（mode 2） */
export default function QRequestFlow() {
  return (
    <>
      <SceneClip demo="request-flow" />
      <ArchDiagram {...figRequestFlow} />
    </>
  )
}
