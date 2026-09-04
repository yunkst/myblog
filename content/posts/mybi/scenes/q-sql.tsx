import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-sql — SQL 安全代理:校验面与织入面严格对称 */
export default function QSql() {
  return (
    <>
      <SceneClip />
      <p>
        bi-data-layer 是系统唯一的取数通道，每条 SQL 依次经过：
        身份提取 → 参数绑定 → AST 形状约束 → 表白名单 → RLS 织入 → 强制 limit → Doris 执行。
        以下展开其中四个实现细节。
      </p>
      <p>
        <strong>校验面 ≡ 织入面。</strong>AST 校验（ast.rs）和行级安全织入（rls.rs）是两套独立遍历——
        一套找违规，一套塞 RLS 谓词。两套遍历的<strong>形状必须严格对称</strong>，
        否则 <code>WHERE id IN (SELECT ...)</code> 这类子查询会绕过其中一边。
        做法是：<code>IN</code> 子查询 / <code>EXISTS</code> / 派生表 / CTE 等每个「能装子查询的容器」在两侧成对处理，
        并用成对的回归测试钉死——校验侧 <code>in_subquery_tables_collected</code> 对应织入侧 <code>inject_into_in_subquery</code>。
      </p>
      <p>
        <strong>bind_params 是手写的，注释里标明是临时方案。</strong>
        转义做两件事：单引号双写 + 反斜杠双写——MySQL 默认把 <code>\</code> 当转义符，
        只转引号会让含反斜杠的值「吞掉」后面的 RLS 谓词，导致实际执行的 SQL 与校验过的 AST 不一致。
        注释中明确这是 Layer 1 临时方案，Layer 2 应换成 mysql_async 的真预编译。
      </p>
      <p>
        <strong>超时下放给 Doris。</strong>应用侧 <code>tokio::time::timeout</code> 只是本地放弃等待，
        Doris 上的查询还在跑，属于伪超时。实际做法是每次取连接都执行 <code>SET SESSION query_timeout</code>
        （连接池复用会串 session，所以每次都设），由 FE 权威取消；
        超时错误收敛为结构化 <code>Timeout</code> → HTTP 504。
      </p>
      <p>
        <strong>流式 CSV 导出</strong>的三个决策：并发槽靠 <code>OwnedSemaphorePermit</code> 的 Drop 语义跨整个流持有；
        BOM + header 作为首块，handler 收到首块才发 200 和 <code>text/csv</code>
        （启动期失败走 JSON 错误、运行期失败走流截断，两种失败不错位）；
        浏览器 abort 时 mpsc 背压自然反向通知生产者退出，不需要显式 KILL QUERY。
      </p>
    </>
  )
}
