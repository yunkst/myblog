import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-read（yaml label：功能：干净正文 + 离线缓存） */
export default function FRead() {
  return (
    <>
      <SceneClip />
      <p>正文从原页提取，弹窗、广告、「请下载 APP 继续」一类的推广内容不进入阅读器。阅读页为纯文本，配纸张色背景和衬线字体。</p>
      <p>读过的章节自动缓存到本地，断网时可以继续阅读。当前章渲染完成后，APP 会在后台预加载下一章，翻页无需等待。</p>
      <p>支持书内搜索：在已缓存章节中按关键词定位上下文；也可以直接问 AI，例如「某个道具第一次出现在第几章」。</p>
    </>
  )
}
