import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-engine */
export default function QEngine() {
  return (
    <>
      <SceneClip />
      <p>
        每篇文章的场景由一份 explore.yaml 声明：有几幕、每幕的标题、配哪个演示、出口跳到哪一幕。
        演出由 Director 组件统一编排，分三种 mode：
      </p>
      <ul>
        <li><strong>mode 1</strong>：演示动画先全屏播放，播完缩回原位，再进入文字解说——适合「先看东西再讲道理」；</li>
        <li><strong>mode 2</strong>（默认）：文字先全屏逐字打出，读完后收起为双列布局，演示动画在左侧原地播放；</li>
        <li><strong>mode 3</strong>：纯文字幕，无演示。</li>
      </ul>
      <p>正文揭示按文档顺序串行：</p>
      <ul>
        <li><code>&lt;p&gt;</code> / <code>&lt;blockquote&gt;</code> 逐字打字，打完一段才揭示下一段；</li>
        <li>列表、表格等媒体元素轮到它时整块淡入——保证「前文未出现，后文不可见」；</li>
        <li>点击任意处可逐段跳过（skip 只推进当前段，不会把整幕跳没）；系统开启 reduced-motion 时直出终态。</li>
      </ul>
      <p>
        同一份 explore.yaml 还驱动另外两个视图：/flat/ 平铺长文页（所有幕按序铺开成传统文章）
        和场景路线图（整篇文章的场景跳转关系图）。三处共享单一数据源，不会出现内容不一致。
      </p>
    </>
  )
}
