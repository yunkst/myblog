import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-schema — 语义树契约:LLM 只写意图,物理形态由编译器推导 */
export default function QSchema() {
  return (
    <>
      <SceneClip />
      <p>
        LLM 直接写 UI 描述时，出错集中在「物理形态」细节上：
        element key 的命名、<code>children</code> 的位置、日期区间双参数的拆分、SQL 占位符的命名约定。
        mybi 的解法是<strong>只让 LLM 写语义树</strong>。SemanticDashboard 的 zod schema 只有四节：
      </p>
      <pre>
        <code>{`{ meta, filters[], queries[], layout[] }`}</code>
      </pre>
      <p>
        LLM 只需要表达「一个 <code>date_range</code> 类型的 filter、SQL 里引用 <code>{`{dt}`}</code>」，
        编译器（<code>packages/spec/src/compile.ts</code>）自动展开为物理形态：
      </p>
      <ul>
        <li>日期区间拆成两个 ParamSpec（<code>dt__start</code> + <code>dt__end</code>）；</li>
        <li>语义树里的 SQL 占位符必须是裸 <code>{`{name}`}</code>，带历史 <code>p_</code> 前缀直接报错；</li>
        <li><code>children</code> 一律输出到 element 顶级，不允许塞进 <code>props.children</code>——该约束源自真实事故 preview-572c6e12：e_root 把 children 写进 props，导致其余 7 个 element 全部不渲染；bi-checker 留有对应的防御性 lint；</li>
        <li>每个 element 自动填 <code>data-source-location</code> 属性，作为 portal「点选看板元素 → 反向定位 spec 元素 → agent 精准修改」选取闭环的物理锚点。</li>
      </ul>
      <p>
        写侧已硬切单形态：<code>write_document</code> 不再透传 flat tree，
        LLM 若把语义树误塞进 spec 字段，会收到结构化错误提示「请检查是否误把语义树放进了 spec 字段」；
        读侧保留 decompile 降级用于兼容旧数据。
      </p>
    </>
  )
}
