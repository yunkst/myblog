import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-why-not-openclaw（yaml label：第一次尝试：为什么没用 openclaw？） */
export default function QWhyNotOpenclaw() {
  return (
    <>
      <SceneClip demo="openclaw-pitfalls" />
      <p>我最初的方案是用 OpenClaw 做一个数字分身，知识库直接对接代码库。思路很直接，但实践下来暴露了三个绕不过去的问题：</p>
      <p><strong>1. 凭证隔离问题。</strong> 要让数字分身掌握最新的知识，就得让它能拉取最新代码。拉代码需要 SSH 私钥，而这个私钥绝对不能让 OpenClaw 有任何途径读到。为此我得把 OpenClaw 关进虚拟机，再单独搭一台特权服务器，只暴露几个接口给 OpenClaw 调用，由特权服务代为执行敏感操作。架构一下子就复杂了。</p>
      <p><strong>2. 细粒度权限做不到。</strong> 比如同事 A 可以了解算法实现的具体原理，同事 B 没有这个权限——这种区分在 OpenClaw 里基本没法做。即使硬做，每次权限变更都非常麻烦，而且无法确保不出现越权。</p>
      <p><strong>3. 审计是黑洞。</strong> AI 看过什么、说过什么、动过什么，缺乏可靠的审计链路。出了问题没法回溯。</p>
      <p>这三个问题叠加，第一次尝试最终没有上线。</p>
    </>
  )
}
