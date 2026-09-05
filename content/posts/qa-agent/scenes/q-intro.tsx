import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro（yaml label：为什么知识库要独立成一个服务） */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>AI 数字员工平台上线后，最常收到的需求是问答：「订单状态有哪些取值」「这个活动配置怎么填」。答案都在文档和代码仓库里，但平台里的 agent 没有读知识的能力。</p>
      <p>做法是做一个<strong>独立的知识库问答服务</strong>：知识库就是普通的 git 仓库，服务周期同步它们；员工用自然语言提问，agent 读仓库内容作答。对平台来说，它只是一个只读工具。</p>
      <p>独立而不是塞进平台，原因有两个：知识库有自己的同步周期和权限规则，生命周期和平台完全不同；只读服务天然零风险，独立部署后出问题也不会波及平台上的写操作。</p>
      <p>技术栈一句话：FastAPI 提供服务、LangGraph 跑问答 agent，身份与契约规范沿用平台同一套。内部项目，未开源；体验入口就是平台对话页——直接提问即可。</p>
    </>
  )
}
