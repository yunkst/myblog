import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-agent（yaml label：原理：端侧 ReAct Agent 引擎） */
export default function PAgent() {
  return (
    <>
      <SceneClip />
      <p>study_engine 是一个纯 Dart 本地包，不依赖 Flutter，可以独立测试。核心是 ReAct 循环：流式调用 LLM → 聚合工具调用 → 执行 → 把结果作为观察喂回 → 进入下一轮，事件实时 yield 给 UI。</p>
      <p>ask_user 是其中最特别的一个工具：Agent 提问时循环挂起，UI 渲染选项卡，用户作答后答案作为工具结果回灌给 LLM。实现上用哨兵对象区分「用户取消」和「真实作答」，不存在答案歧义。</p>
      <p>两个健壮性设计：SSE 流中断后整轮重发——SSE 不支持断点续传，重发配合指数退避和随机抖动，避免半截文本拼接；上下文由 ContextCompactor 压缩，超长工具输出截断后落盘存临时目录。</p>
    </>
  )
}
