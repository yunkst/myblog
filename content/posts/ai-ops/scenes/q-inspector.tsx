import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-inspector（yaml label：巡检 agent：三阶段架构） */
export default function QInspector() {
  return (
    <>
      <SceneClip />
      <p>
        前面所有组件搭的是「感官」和「肌肉」，巡检 agent 是大脑——每天早上 9 点自动运行一次，
        把集群前 24 小时的状态浓缩成一份企业微信报告，14 分钟预算，超时强杀。架构分三阶段：
      </p>
      <ul>
        <li><strong>Phase 1 并行扫描（约 5 分钟）</strong>：四个维度子 agent（攻击面 / 服务健康 / 资源水位 / 合规）同时运行，各带工具箱（日志查询、指标查询、K8s API），各自产出 findings JSON（含覆盖率、置信度自评）。</li>
        <li><strong>Phase 2 疑点深挖（按需，最多 5 次）</strong>：主 agent 审视 findings，识别疑点——跨维度同 namespace 时间相近的异常组合、severity=critical 但 confidence=low 的发现、子 agent 自报的覆盖缺口——对每个疑点派独立上下文的研究子 agent 跨维度取证。</li>
        <li><strong>Phase 3 聚合报告</strong>：生产异常详写、正常项压成一行、全绿时只发「今日无异常」。</li>
      </ul>
      <p>几个刻意的设计：</p>
      <ul>
        <li><strong>维度并行、疑点串行</strong>：Phase 1 四个维度互不等待，任何一个挂了其他照常；Phase 2 深挖次数封顶 5 次，防止 agent 陷入调查循环烧 token；</li>
        <li><strong>降级路径</strong>：LLM 完全不可用时退化为纯规则检查（不走 AI，直接拼阈值告警）——底线是哪怕 AI 挂了，报告照发；</li>
        <li><strong>告警和巡检互补</strong>：AlertManager 管「现在就炸了」的实时告警，巡检 agent 管「还没炸但不对劲」的趋势巡查——比如重启次数没到告警线、但在 7 天基线上明显抬升。</li>
      </ul>
      <p>四个维度的具体检查项（全部配置化，改 YAML 即可调整阈值）：</p>
      <table>
        <thead>
          <tr><th>维度</th><th>检查内容</th></tr>
        </thead>
        <tbody>
          <tr><td>攻击面</td><td>5xx 计数、敏感路径扫描（/admin、/.env、/wp-login 等）、高频来源 IP、登录失败突增</td></tr>
          <tr><td>服务健康</td><td>Pod 重启次数 vs 7 天基线、ArgoCD 应用同步状态、证书到期天数、黑盒探测成功率</td></tr>
          <tr><td>资源水位</td><td>CPU / 内存 / 磁盘超阈值、OOMKilled 迹象、接近 limits 的 Pod</td></tr>
          <tr><td>合规</td><td>无 limits 的容器、缺探针的 Deployment、缺 VPA 建议的工作负载</td></tr>
        </tbody>
      </table>
      <p>
        攻击面检查依赖入口收敛这个架构决策：所有流量过 APISIX，访问日志全部落在 apisix namespace 下，
        按 host 区分业务——查业务流量实际是「查 apisix namespace + host 过滤」，映射关系配在 ns_host_mapping 里。
      </p>
      <p>
        巡检 agent 的 RBAC 是只读的：ClusterRole 只有 <code>get / list / watch</code>，
        注释写明 observe-only、禁止 patch/delete/create。LLM 凭据走 SealedSecret 注入，输出过 scrub 脱敏，
        报告发企业微信群。整条链路上它是一个只能看、只能报告、不能碰的角色；
        发现的异常报告给人，修复动作由人或（经评审的）AI 通过 Git 完成。
      </p>
    </>
  )
}
