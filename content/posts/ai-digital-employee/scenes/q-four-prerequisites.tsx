import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-four-prerequisites（yaml label：AI 安全上岗的四个前提） */
export default function QFourPrerequisites() {
  return (
    <>
      <SceneClip />
      <p>OpenClaw 那次尝试暴露的问题，归结起来是四个前提没有解决。搭建 AI 数字员工平台<strong>没有捷径</strong>——在处理好下面四个问题之前，一切接入生产系统的尝试都是危险的：</p>
      <ol>
        <li><strong>权限划分准确</strong>：不存在越权可能，最好兼容已有的权限设定，而不是另起炉灶；</li>
        <li><strong>AI 发疯有兜底</strong>：即使 AI 抽风，甚至人犯了错让 AI 抽风成功，也要有兜底机制托住；</li>
        <li><strong>行为可预测</strong>：黑箱系统就是定时炸弹，每一次操作的后果必须可观测；</li>
        <li><strong>开发可持续</strong>：核心逻辑尽量精简。庞大复杂的体系，很可能让前面三条全部失效。</li>
      </ol>
      <p>补充一个现实条件：按这四条设计的方案涉及整个运维体系的迁移和配合，能推动它的前提是决策链足够短——我的情况是一个人说、一个人做。</p>
    </>
  )
}
