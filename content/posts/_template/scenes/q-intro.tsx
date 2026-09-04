import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro。首元素固定 <SceneClip />（demo 由 explore.yaml 派生，不要传 demo prop）。
 * 正文支持 <p>（打字机逐字）、<ul>/<ol>/<table>（按文档顺序淡入）、<code>/<strong> 内联标记。 */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>第一段：这个东西解决什么问题。</p>
      <p>第二段：技术栈 / 现状 / 阅读路线。</p>
    </>
  )
}
