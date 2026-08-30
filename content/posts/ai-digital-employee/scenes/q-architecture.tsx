import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-architecture（yaml label：整体架构图）—— 从 q-badge-metaphor 拆出
 * mode 2：先讲完比喻、然后这张整体架构图淡入。
 * 一幕一元素：图由 SceneClip 里的 architecture demo 渲染（demo 内部就是 ArchDiagram 容器），不再额外写。 */
export default function QArchitecture() {
  return (
    <>
      <SceneClip />
      <p>把刚才的比喻翻译成工程语言，整套平台长这样。</p>
    </>
  )
}
