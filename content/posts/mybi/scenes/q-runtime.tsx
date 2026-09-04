import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-runtime — 看板运行时:一棵 spec 树怎么变成页面 */
export default function QRuntime() {
  return (
    <>
      <SceneClip />
      <p>dashboard-app 加载一张看板的链路：</p>
      <ol>
        <li><strong>拉 document</strong>——按 URL 区分 published（<code>/d/&lt;id&gt;</code>）或草稿（<code>/p/&lt;draft_id&gt;</code>），从 bi-agent 拿 JSON document；</li>
        <li><strong>SpecView 装载</strong>——<code>ElementPickerProvider → JSONUIProvider → Renderer</code> 的嵌套顺序不得颠倒：spike 阶段验证过，Provider 外直接挂 Renderer 拿不到 dispatch，变更不生效（<code>apps/dashboard-app/src/spec/SpecView.tsx</code> 头注释）；</li>
        <li><strong>catalog 选组件</strong>——spec 是一棵声明式元素树，<code>defineCatalog(zod, ...)</code> 同时承担三件事：组件白名单、props 强类型来源、给 LLM 的 prompt 文档；</li>
        <li><strong>BoardDataLayer 桥接</strong>——每个 query 对应一个 BoardDataLayer，订阅 <code>/params/*</code>，调 <code>useQueryResult</code> 取数，回写到 <code>/queries/&lt;id&gt;</code>；</li>
        <li><strong>组件订阅渲染</strong>——图表/表格/指标卡读 <code>/queries/&lt;id&gt;/rows</code>，自身不取数不缓存，刷新由参数变化驱动。</li>
      </ol>
      <p>
        <strong>初次加载防御</strong>：<code>buildInitialState</code> 把 <code>/queries/&lt;id&gt;</code> 预置为
        <code>{`{ rows: null, schema: [], status: "idle" }`}</code>，消费侧不会读到 <code>undefined</code>，
        首次 fetch 完成后才覆盖。
      </p>
      <p>
        <strong>可见性即真理</strong>：<code>/d/&lt;id&gt;</code> 直达时，若 id 不在 <code>/api/navigation</code>
        下发的可见集合内，统一渲染 404，不区分「不存在」与「无权访问」，避免存在性侧信道。
      </p>
      <p>
        <strong>shell 锁的退役</strong>：早期设计有 shell.lock + ESLint 硬约束等多层防护。
        spec 化之后，agent 唯一的写入口是 <code>write_document</code>（走 zod 校验 + compile），
        不存在可被篡改的 shell 文件，大部分防线由 schema 校验本身承接。
      </p>
    </>
  )
}
