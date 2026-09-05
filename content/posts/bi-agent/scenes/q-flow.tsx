import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-flow（yaml label：端到端：数据怎么流到看板） */
export default function QFlow() {
  return (
    <>
      <SceneClip />
      <p>从生产库到看板，一条数据流穿过的环节：</p>
      <ol>
        <li><strong>生产库 → Flink CDC</strong>——生产 PG（逻辑复制，<code>wal_level=logical</code>）与 MongoDB（单节点副本集 rs0，oplog 可读）的变更日志进入 Flink CDC，共 88 张表作为源；</li>
        <li><strong>Flink CDC → Doris ODS</strong>——按表结构落 Doris 贴源层，保留原始粒度；</li>
        <li><strong>Doris ODS → DWS（物化）</strong>——bi-etl 的 reconcile 作业产出宽表/聚合表，全量重算用 <strong>shadow 表 + ALTER RENAME</strong> 做平滑切换：</li>
      </ol>
      <ul>
        <li>新数据先写 <code>&lt;name&gt;__new</code> 影子表（CREATE AS SELECT），原表持续可查；</li>
        <li>计算完成后两条 <code>ALTER TABLE ... RENAME</code> 原子切换（元数据级操作，毫秒完成），最后删旧表；</li>
        <li>看板查询始终指向原表名，重算期间不中断、无读错误、不会出现新旧数据混杂。</li>
      </ul>
      <p>
        实时同步直接采用 Flink CDC 成熟方案，自研部分集中在 reconcile 的平滑切换上。
        作业定义在 <code>flink-lib/cdc-pipeline/pipelines/*.yaml</code> 与 <code>sql/cdc-mongo.sql</code>，
        密码字段一律使用 <code>{'${PG_PASSWORD}'}</code> 形式的占位符，提交时由 envsubst 白名单渲染、
        产物即用即删——凭据不进 git、不落盘；bi-checker 仍校验作业定义的结构合法性。
      </p>
      <p>
        另有两条配套机制：<strong>schema 漂移对账</strong>（源库 information_schema vs 声明 vs Doris DESC 三方比对，
        观察式只告警、不阻断 CDC 流）和<strong>脚本物化通道</strong>（脚本计算结果经 bi-etl 直入 Doris，
        强制 schema 契约，CDC 源拒写以防双写冲突）。
      </p>
    </>
  )
}
