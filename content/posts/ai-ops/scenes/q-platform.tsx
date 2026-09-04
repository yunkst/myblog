import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-platform（yaml label：体系搭建：清单与真实落地） */
export default function QPlatform() {
  return (
    <>
      <SceneClip />
      <p>
        下面是当初的搭建清单，以及每一条在生产里的真实形态。清单和现实的差距，比清单本身更有价值。
      </p>
      <table>
        <thead>
          <tr><th>清单项</th><th>真实落地形态</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>租一个集群</td>
            <td>云服务商的托管集群（腾讯云 TKE），不自建控制面。唯一需要决策的是节点购买策略，见成本章节。</td>
          </tr>
          <tr>
            <td>GitLab + ArgoCD</td>
            <td>整个体系的地基：之后所有组件（包括 ArgoCD 自身的升级）都通过「往 GitLab 提交 YAML、ArgoCD 自动同步」完成。部署模式用 App of Apps——root Application 监听 <code>apps/</code> 目录，接入新组件只需提交一个新的 Application YAML，root App 自动发现并部署。</td>
          </tr>
          <tr>
            <td>APISIX 统一入口</td>
            <td>规则：所有服务必须经 APISIX 暴露，禁止 LoadBalancer 和 NodePort。访问日志因此天然集中一处，证书由 cert-manager 统一管理——这是后面巡检 agent 能用一份日志查出所有业务 5xx 和攻击扫描的前提。</td>
          </tr>
          <tr>
            <td>Casdoor 统一登录</td>
            <td>GitLab、Grafana、Infisical 的登录都指向 Casdoor。每多接一个服务，「不用再管一套账号」的收益复利一次。</td>
          </tr>
          <tr>
            <td>Infisical 密钥管理</td>
            <td>经历三代演进（详见下表）。选自托管 Infisical 而非 Vault：20+ 密钥的体量用不起 Vault 的运维成本，且 Infisical 有 Web UI、原生 K8s operator、Casdoor OIDC 直连。SealedSecret 保留为应急通道。</td>
          </tr>
          <tr>
            <td>自循环：GitLab 搬进集群</td>
            <td>GitLab 通过 ArgoCD 部署在集群内（本地 chart 模式，因集群访问上游 Helm 源不稳定），GitOps 仓库托管在这个 GitLab 上；push webhook 通知 ArgoCD，commit 一推送秒级感知。闭环：改配置 → 提交 → webhook → 同步，体系监控并部署着自己，外部无部署依赖。</td>
          </tr>
          <tr>
            <td>日志和报警</td>
            <td>kube-prometheus-stack（指标告警）+ Loki/Promtail（日志聚合，30 天保留）+ blackbox-exporter（黑盒探测）+ 企微 webhook 适配器。告警规则只覆盖会直接炸的：Pod 重启频次、OOMKilled、5xx 率、证书到期、磁盘水位——误报多的规则宁可关掉，告警疲劳比告警缺失更危险。</td>
          </tr>
          <tr>
            <td>dev / prod 分离</td>
            <td>放弃分支模型（dev/main 双分支要求公共改动来回 cherry-pick），改用单 main 分支 + Kustomize overlays 目录：base 存通用配置，overlay 只存差异。分支差异挪到业务仓库 CI 层：master 构建 <code>prod-日期</code> 镜像、deploy-dev 构建 <code>dev-日期</code> 镜像，流水线自动回写 GitOps 仓库对应 overlay 的镜像 tag。prod 保留 automated sync——安全闸门在 MR 评审而非同步环节，合并即部署。</td>
          </tr>
          <tr>
            <td>数据分身</td>
            <td>测试库每晚被生产数据覆盖式重灌（DROP + restore），语义是「影子环境」。数据源用托管数据库的每日逻辑备份而非直连 dump；备份经 COS 中转按份数保留 3 份；生产侧连接全部走只读副本（<code>secondaryPreferred</code>）；ES 和 Redis 明确排除。测试环境用真实数据形态，测试结论才对生产有预见性。</td>
          </tr>
        </tbody>
      </table>
      <p>密钥管理的三代演进：</p>
      <table>
        <thead>
          <tr><th>代际</th><th>方案</th><th>问题</th></tr>
        </thead>
        <tbody>
          <tr><td>第一代</td><td>明文 Secret 直接提交</td><td>Git 仓库里全是明文，安全审计 P0 级问题</td></tr>
          <tr><td>第二代</td><td>SealedSecret（kubeseal 加密提交，集群内解密）</td><td>密钥散落 20 多个 YAML，查靠 grep，轮换流程长，无使用审计</td></tr>
          <tr><td>第三代（现行）</td><td>自托管 Infisical</td><td>值只存 Infisical，Git 只有 CR 元数据，operator 自动同步成 K8s Secret</td></tr>
        </tbody>
      </table>
    </>
  )
}
