import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro（yaml label：时习：把「学会」做成闭环） */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>学习类工具大多只解决「学」的环节——讲课、刷题、直接给答案。但「学会」其实是一个闭环：遇到问题时有人引导你弄懂、学过的东西沉淀下来、在快要遗忘的时候复习、长期备考有节奏可循。</p>
      <p>时习（study_buddy）尝试把这四件事放进一个 App：拍题问 AI、知识点自动入库、「为什么？」反问式教学、FSRS 间隔复习、备考计划拆解、专注时钟与学习日报。技术栈：Flutter + 纯 Dart 端侧 Agent 引擎 + sqflite 本地存储；没有自建后端，LLM 走用户自备的 OpenAI 兼容接口。个人独立完成，MIT 开源。</p>
      <p>
        项目地址：
        <a href="https://github.com/yunkst/study_buddy" target="_blank" rel="noreferrer">GitHub 仓库</a>
        {' · '}
        <a href="https://yunkst.github.io/study_buddy/" target="_blank" rel="noreferrer">在线介绍</a>
        {' · '}
        <a href="https://github.com/yunkst/study_buddy/releases" target="_blank" rel="noreferrer">下载 APK 体验（Releases）</a>
      </p>
      <p>下面按功能列出，每条功能附有对应的实现原理说明。</p>
    </>
  )
}
