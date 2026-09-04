import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-local-first（yaml label：原理：无后端的本地优先架构） */
export default function PLocalFirst() {
  return (
    <>
      <SceneClip />
      <p>整个 App 没有自建后端：Flutter UI 调用 study_engine（纯 Dart 包），引擎读写 sqflite 本地库；AI 能力由引擎直连用户配置的 OpenAI 兼容端点，SSE 流式返回，末包提取 token 用量。</p>
      <p>这个结构带来的收益是隐私和零运维：数据不出手机，没有服务器成本，用户用自己的 key 控制自己的模型。代价是多端数据不同步，换设备需要重新开始——这是当前版本的明确边界。</p>
    </>
  )
}
