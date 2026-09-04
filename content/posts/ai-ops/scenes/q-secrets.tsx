import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-secrets（yaml label：密钥管道与输出脱敏） */
export default function QSecrets() {
  return (
    <>
      <SceneClip />
      <p>
        运维场景里最敏感的是明文密钥。这套体系里 AI 从头到尾看不到密钥的值，职责切分为
        <strong>「AI 设计管道，人负责灌水」</strong>：
      </p>
      <ul>
        <li><strong>人</strong>在 Infisical 网页上填密钥值——明文只存在这一处；</li>
        <li><strong>Git</strong> 里只有 InfisicalSecret CR——「哪个 K8s Secret 来自 Infisical 哪条路径」的元数据；</li>
        <li><strong>集群内</strong> secrets-operator 用 K8s native auth（SA TokenReview，无静态凭证）自动把值同步成 K8s Secret，业务照常挂载、无感知。</li>
      </ul>
      <p>
        AI 的工作是搭「接线」：写 InfisicalSecret CR、建 reader ServiceAccount、在 K8s Auth 白名单里登记 namespace——
        这些全是元数据，不含任何秘密。切换过程也有验证兜底：从 SealedSecret 迁移到 Infisical 时，
        用脚本对两边 Secret 做 SHA256 逐键比对，不一致就禁止切换。
      </p>
      <p>
        输入要管，输出同样要管：巡检 agent 把任何内容交给 LLM、或推送到企业微信之前，
        先过一遍正则强制脱敏——token、password、cookie、手机号、身份证、邮箱，全部替换成 <code>[REDACTED:*]</code>。
      </p>
      <p>
        经验也喂回给 AI：踩过的坑沉淀成仓库里的 skill 文件，目前编码了密钥管理的 5 个已知陷阱
        （K8s Auth 白名单遗漏、dockerconfigjson 编码、operator ETag 缓存、空值密钥被拒、双 owner 冲突），
        AI 每次接触密钥相关工作都会先读它，直接绕开。
      </p>
      <p>
        这套模型的实际效果：AI 可以承担大部分日常运维——部署、排障、巡检、容量建议——
        而它做不了的事（直接改集群、看到明文、泄漏数据）是架构上不可能，而不是提示词上不允许。
      </p>
    </>
  )
}
