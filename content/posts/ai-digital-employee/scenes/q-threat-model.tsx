import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-threat-model（yaml label：威胁模型：平台约束的是 AI，不是人） */
export default function QThreatModel() {
  return (
    <>
      <SceneClip demo="threat-model" />
      <p>先做个消歧：这个平台不是业界常说的那种 AI Gateway——Kong、Cloudflare 那类网关管的是应用怎么调模型，方向正好相反；这个平台管的是 <strong>AI 怎么调业务后台</strong>。</p>
      <p>容易被误解的第二点：这个平台<strong>不是一个权限系统</strong>，它没有、也不试图收缩任何人的权限。传统后台全部保留，人的直连入口照旧，原有审计照旧——平台是一个纯粹的<strong>增量层</strong>，它不做任何传统后台做不到的事。</p>
      <p>想清楚这一点，很多质疑就自动消解了：</p>
      <ul>
        <li><strong>AI 能做的任何事，这个用户本来就能自己在后台做掉。</strong> 身份透传意味着平台没有赋予任何新能力，只是让既有能力调用得更快。运营人员在平台上批准一个操作之前能看到完整内容——他本来就可以直接登录生产后台做同样的操作，平台并没有引入额外风险。</li>
        <li><strong>平台挂了不影响业务。</strong> 人随时可以回到传统后台直接操作，它是效率工具，不是命脉。</li>
      </ul>
      <p>平台真正要回答的问题只有一个：<strong>当 AI 顶着某个人的身份干活时，怎么保证它不干这个人不想干的事。</strong> 分级执行、预演、审批、撤回，全部是为这一个问题服务的。</p>
    </>
  )
}
