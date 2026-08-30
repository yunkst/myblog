import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-request-flow（yaml label：请求链路图）—— 从 q-unified-identity 拆出
 * 一幕一元素：图由 SceneClip 里的 request-flow demo 渲染。 */
export default function QRequestFlow() {
  return (
    <>
      <SceneClip />
      <p>上面这条链路上，身份=张三 一路透传到业务后台，AI 没有任何选择身份的机会。</p>
    </>
  )
}
