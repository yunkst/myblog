import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-script-gen（yaml label：原理：AI 现场生成提取脚本） */
export default function PScriptGen() {
  return (
    <>
      <SceneClip />
      <p>加书流程的关键判断在目录页 URL：该域名已有 chapter_list_js 脚本则直接执行；没有则进入 webview_extract 场景 Agent——观察当前页面结构，生成提取脚本，经 save_script 工具落库，之后同站复用。</p>
      <p>AI 只负责首次生成。生成物是确定性的 JS 脚本，落库后每次执行不再消耗 token，也不存在模型输出的不确定性。</p>
      <p>正文提取由 HeadlessWebViewContentService 完成：无头 WebView 单例加互斥锁执行站点脚本，避免并发执行互相干扰页面状态。</p>
    </>
  )
}
