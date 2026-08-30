import SceneClip from '../../../../src/components/explore/SceneClip'
import ArchDiagram from '../../../../src/components/blog-anim/ArchDiagram'
import { figArchitecture } from '../../../../src/components/blog-anim/diagrams/ai-digital-employee'

/** 幕正文：q-architecture（yaml label：整体架构图）—— 从 q-badge-metaphor 拆出
 * mode 2：先讲完比喻、然后这张整体架构图淡入。
 * 一幕一图：webp 配图 + ArchDiagram 语义重叠，取 ArchDiagram（更工程、复用 SVG 几何） */
export default function QArchitecture() {
  return (
    <>
      <SceneClip demo="architecture" />
      <p>把刚才的比喻翻译成工程语言，整套平台长这样：</p>
      <ArchDiagram {...figArchitecture} />
    </>
  )
}
