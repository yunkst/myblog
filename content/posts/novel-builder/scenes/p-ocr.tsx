import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-ocr（yaml label：原理：端侧 OCR 还原管线） */
export default function POcr() {
  return (
    <>
      <SceneClip />
      <p>字体反爬的原理：站点用自定义字体将常用汉字映射到 PUA 私用区码点，文本层是乱码，但渲染后人眼可读。</p>
      <p>既然渲染后可读，识别就放在渲染之后：站点脚本标记 chapter_content_ocr 后，OcrRestoreService 将 PUA 码点渲染成图片，交给端侧 PP-OCRv6（onnxruntime）逐字识别，再替换回正常汉字。</p>
      <p>不使用云端 OCR 的原因有三个：章节正文属于版权内容，不应外传；OCR 调用频次高，云端成本不可控；离线可用是项目底线。代价是端侧推理的算力开销，低端设备上速度较慢。</p>
    </>
  )
}
