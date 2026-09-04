import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-cage（yaml label：安全模型：GitOps 笼子） */
export default function QCage() {
  return (
    <>
      <SceneClip />
      <p>
        安全模型的出发点不是「指望 AI 不犯错」，而是设计一个
        <strong>犯错不可持续、密钥不可见、操作可审计</strong>的体系。
        安全边界不靠提示词里的「请你小心」，而靠架构本身。
      </p>
      <p>
        AI（以及人）对集群没有直接的写权限，规则明文写在仓库的 CLAUDE.md 里：
      </p>
      <ul>
        <li><strong>禁止</strong>：<code>kubectl apply / delete / edit / patch / scale</code>——任何绕过 Git 的操作都会造成集群真实状态和 Git 声明状态的漂移；</li>
        <li><strong>允许</strong>：<code>get / describe / logs / top / port-forward</code>——读操作几乎不设限，AI 需要充分观察才能做出正确判断。</li>
      </ul>
      <p>
        写操作只有一条路：改 YAML、提 commit，ArgoCD 自动同步。每个变更因此天然具备三件事：
        <strong>审计</strong>（git log 完整可查）、<strong>回滚</strong>（git revert 即回滚方案）、
        <strong>评审</strong>（AI 提 MR、人合并，危险变更在合并前被拦下）。
        兜底一层是 ArgoCD 的 <code>selfHeal</code>：即使有人绕过规则手动改了集群，下次同步会自动纠回 Git 声明的状态——漂移不可持续。
      </p>
      <p>
        例外也经过论证：<code>rollout restart</code> 被特别放行，理由写在注释里——
        重启不改变资源定义，ArgoCD 下次同步时 spec 未变不会覆盖，不会导致 GitOps 漂移。
        AI 每次动手前还有四问自检：这个变更能表达为 commit 吗？我是不是没耐心等 ArgoCD 自己收敛？
        我是在修症状，还是修 Git 里的根因？这次手动改动会被下次同步回滚吗？
      </p>
    </>
  )
}
