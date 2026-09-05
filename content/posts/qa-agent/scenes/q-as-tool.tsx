import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-as-tool（yaml label：怎么接进 AI 员工平台） */
export default function QAsTool() {
  return (
    <>
      <SceneClip />
      <p>接入平台不需要平台改任何代码。这个服务把问答接口按平台的契约规范标注成一个工具——<strong>只读级、允许 agent 使用</strong>——导出契约后，协议仓库自动收录；平台主 agent 遇到知识类问题时，按「工具按需检索」那套机制发现并调用它。</p>
      <p>一个值得说的细节是流式协议的对齐。一次问答会产生两类输出：中间的检索和读文件过程（过程解说），以及最终答案。两类事件分开标记，平台只把<strong>最终答案</strong>送进主 agent 的上下文——否则一次问答的几千字过程会污染主线对话。</p>
      <p>事件分类不靠「看起来像答案」的启发式，而由 agent 图的结构保证：带工具调用的中间消息是过程，不带工具调用的终点消息是答案。这条判定是精确的。</p>
    </>
  )
}
