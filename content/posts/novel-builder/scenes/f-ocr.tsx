import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-ocr（yaml label：功能：字体反爬也能读） */
export default function FOcr() {
  return (
    <>
      <SceneClip />
      <p>部分站点（如番茄）使用自定义字体渲染正文，直接抓取到的文本是乱码，属于字体反爬。</p>
      <p>处理方式是把识别放在端侧完成：将乱码码点渲染成图片，再用端侧 OCR 还原为正常汉字。全程不联网，读到乱码章节时自动触发，不需要用户操作。</p>
    </>
  )
}
