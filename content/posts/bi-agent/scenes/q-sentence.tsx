import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-sentence */
export default function QSentence() {
  return (
    <>
      <SceneClip />
      <p>一句话生成看板的全流程，在代码侧是内外两层循环（<code>apps/bi-agent/src/react.rs</code>）。</p>
      <p>
        <strong>内层：主 ReAct 循环。</strong>LLM 每一步决定「用哪个工具 / 拿到结果再做什么」。
        循环的终止条件是<strong>累计 output tokens 上限</strong>（<code>MAX_AGENT_TOKENS</code>，默认 500,000）而不是轮数上限——
        LLM 场景中真正稀缺的资源是 token；达到上限时用户能在面板里看到明确提示
        「已达本次会话输出 token 上限，实际已消耗约 N tokens」，而不是无理由地停在第几轮。
      </p>
      <p>
        <strong>外层：验证门循环。</strong>每轮产生文件写入后，bi-checker 对草稿做全量检查，
        把 <code>errors[]</code> 拼成一条 user 消息压回 <code>messages</code>，LLM 自动进入修复轮；
        超过 <code>MAX_FIX_ROUNDS=2</code> 不再重试，转为 <code>HasErrors</code> 状态，
        要求 LLM 在最终答复里如实告知用户哪些错误未修复。
      </p>
      <p>
        工具分两类：语义检索（选表、选字段）+ document 编辑（写 DB 草稿）。
        写文档的工具接收的是 SemanticDashboard 语义树，element key、日期区间双参数、SQL 占位符等
        物理形态全部由编译器展开（见「语义树契约」一节）。
      </p>
      <p>
        每一步工具调用都渲染为独立工具卡，SSE 流式推到前端。
        面板顶部「📋 复制记录」可把整个会话（用户消息、AI 回复、工具调用及返回原文）一键导出为 Markdown，
        用于留档、问题反馈和交接。会话按工作区 + 用户 + 看板复用，切走再切回会自动恢复历史。
      </p>
    </>
  )
}
