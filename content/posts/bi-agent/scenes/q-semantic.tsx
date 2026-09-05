import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-semantic — 语义层:向量检索怎么帮 AI 选表 */
export default function QSemantic() {
  return (
    <>
      <SceneClip />
      <p>
        agent 要写 SQL，先要知道「查哪张表、用哪个字段」。语义层是这件事的底座
        （<code>apps/bi-agent/src/semantic/</code>），以下四个实现细节。
      </p>
      <p>
        <strong>「一个名字 = 一张物理表」是数据驱动的双射。</strong>
        多库 CDC 场景里语义名/物理名必然存在两套命名（mongo 的 <code>mongo__user</code>、PG 的 <code>app.user</code>）。
        映射不写 if-else，而是进声明表（semantic_prefix / physical_prefix），加载时统一过
        <code>physical_name()</code> / <code>semantic_name()</code>；
        并配一条不变量测试：<code>semantic_name(physical_name(x)) == x</code>（manifest.rs），
        双射被破坏时 CI 直接失败。
      </p>
      <p>
        <strong>字段级 embedding，而不是表级。</strong>500+ 张宽表的规模下，整表一条向量会被平均稀释。
        检索单元是字段：文档格式为 <code>{`"{表名} | {列名}({类型}): {含义}"`}</code>，
        表级向量只兜底表名级问题；检索时把字段分聚合成表分，再与词法路（字符 bigram 加权）做 RRF 融合。
        图扩展阶段对每一跳邻居做 role 白名单剪枝，防止 JOIN 链把无权表带进子图——
        剪枝在工具侧强制，role 不作为工具参数（不信任 agent 的工具调用）。
      </p>
      <p>
        <strong>doc_hash 掺入 embedder 版本。</strong>更换嵌入模型后指纹必变，增量 sync 自动触发全量重建，
        避免「库里是旧模型向量、查询用新模型向量」导致余弦距离失真。
        配套的回归测试来自一个真实缺陷：库侧 <code>ORDER BY doc_hash</code> 是 BIGINT 有符号序，
        声明侧曾按 u64 无符号序排序，高位为 1 的 hash 被误判为「已变更」，每次启动都全量重写；
        现在声明侧按 i64 语义排序与库侧对齐。
      </p>
      <p>
        <strong>fs → DB 双路径等价测试。</strong>语义真源迁移到 DB 后，fs yaml 冻结为种子；
        两条加载路径（fs loader / DB rows loader）共享同一套映射函数，
        用同一份 fixture 断言模型数、列数、主键、prefix_map 完全一致，防止两条路径各自演化。
      </p>
    </>
  )
}
