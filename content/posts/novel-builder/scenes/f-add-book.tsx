import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-add-book（yaml label：功能：任意网站，一键加入书架） */
export default function FAddBook() {
  return (
    <>
      <SceneClip />
      <p>APP 内置一个浏览器。用它打开任意小说站的目录页，右下角会出现「加入书架」按钮，点击后该书进入书架。</p>
      <p>首次访问某个站点时，由 AI 现场生成该站的章节提取脚本，用户等待并确认预览即可。脚本保存后同站复用，后续使用不再消耗 token。</p>
      <p>站点规则由 AI 生成而非人工维护，新增一个站点只需要一次生成确认。</p>
    </>
  )
}
