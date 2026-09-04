import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-errors — 错误回流:让 AI 自己修到过为止 */
export default function QErrors() {
  return (
    <>
      <SceneClip />
      <p>AI 自修能否跑通，取决于错误信息怎么设计。两个实现例子：</p>
      <p>
        <strong>例 1：占位符防御（<code>apps/bi-agent/src/run_sql.rs</code>）。</strong>
        旧版 <code>run_sql</code> 信任 LLM 传入的 params 列表。曾出现的情况：LLM 声明参数叫
        <code>dt__start</code>，SQL 里写的却是 <code>{`{p_dt__start}`}</code>——名字不匹配导致占位符残留，
        sqlparser 把 <code>{`{`}</code> 误判为 ODBC 转义语法，报 <code>Expected: :, found: {'}'}</code>。
        这个报错表面是「SQL 语法错」，会引导 LLM 去改 SQL，但根因是参数未绑定。
        现行实现<strong>从 SQL 文本现提取占位符，不接受 caller 传的 params</strong>——参数绑定的真相只来自 SQL 本身。
      </p>
      <p>
        <strong>例 2：错误分类 + hint 字段。</strong><code>SqlErrorKind</code> 把错误分为
        字面量损坏 / 类型转换不支持 / 函数不支持 / 表不存在 / 语法错误。
        分类器是顺序敏感的：<code>Expected: …, found: {'}'}</code> 这个容易误导的信号被显式归入「字面量损坏」，
        并附带 <code>hint</code>「占位符应为单花括号裸名」。
        错误返回结构为 <code>{`{ error, kind, hint, raw }`}</code>——错误消息在这里被当作 AI 系统的接口契约来设计。
      </p>
      <p>
        <strong>验证门的三态状态机</strong>：<code>GateState::{`Clean | Unavailable | HasErrors`}</code>。
        每一类「门不可用」（checker 挂了 / 无草稿 / 纯读轮次）都显式落到 <code>Unavailable</code>，
        不静默吞错，也不让 LLM 误以为校验已通过。
      </p>
      <p>
        <strong>重试边界</strong>：LLM 流式响应只在响应头到达前重试（408/429/5xx）；
        已进入流后不重试——用户已经看到部分文本，重试会造成前端内容重复。指数退避 1s 起、30s 封顶，流空闲超时 120s。
      </p>
    </>
  )
}
