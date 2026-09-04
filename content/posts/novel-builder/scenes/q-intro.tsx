import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro（yaml label：写给读者的 AI：口味自己做主） */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>市面上的 AI 写作工具大多面向作者——列大纲、续写、辅助更新。但作为读者，我也有一些自己的需求：追的书节奏不理想、结局不满意、喜欢的角色被写死，除了弃书之外，能不能自己动手改一版。</p>
      <p>novel_builder（随心阅读）就是为这个需求做的：一个面向读者的 AI 小说平台，核心功能分三类——读、改、写。从 Flutter APP 到可选后端由我个人独立完成，MIT 开源。</p>
      <p>
        项目地址：
        <a href="https://github.com/yunkst/novel_builder" target="_blank" rel="noreferrer">GitHub 仓库</a>
        {' · '}
        <a href="https://yunkst.github.io/novel_builder/" target="_blank" rel="noreferrer">在线介绍</a>
        {' · '}
        <a href="https://github.com/yunkst/novel_builder/releases/latest" target="_blank" rel="noreferrer">下载 APK 体验（Releases）</a>
      </p>
      <p>下面按功能列出，每条功能附有对应的实现原理说明。</p>
    </>
  )
}
