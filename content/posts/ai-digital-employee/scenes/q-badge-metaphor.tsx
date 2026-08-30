import SceneClip from '../../../../src/components/explore/SceneClip'
import ArchDiagram from '../../../../src/components/blog-anim/ArchDiagram'
import { figArchitecture } from '../../../../src/components/blog-anim/diagrams/ai-digital-employee'

/** 幕正文：q-badge-metaphor（yaml label：一句话方案：把工牌借给 AI） */
export default function QBadgeMetaphor() {
  return (
    <>
      <SceneClip demo="badge-metaphor" />
      <p>在展开技术细节之前，先打个比方——这套方案用一句话就能讲完：</p>
      <p><strong>让员工把自己的工牌借给 AI，AI 戴着这张工牌去干活。</strong></p>
      <p>公司的门禁系统早就建好了：每张工牌能刷开哪些门，是行政（RBAC）定的；谁在几点刷开了哪扇门，监控（审计）记得清清楚楚。现在 AI 来了，我们不给它配任何"万能卡"，也不为它改动任何一扇门的权限——它只是替你刷卡：</p>
      <ul>
        <li>它能进的房间，就是你本来就能进的房间，一扇都不会多；</li>
        <li>它每刷开一扇门，门禁记录里写的都是你的名字——所以敏感操作它刷之前，得先回头看你一眼，这就是确认与审批；</li>
        <li>少数房间（高风险操作）的门禁规则是"必须本人到场"：AI 可以把你带到门口，但最后那一下，必须你亲手按；</li>
        <li>如果它进错了房间，大多数地方还能退出来、恢复原样，这就是撤回。</li>
      </ul>
      <p>工牌自始至终是你的工牌，AI 只是替你跑腿的那双手。下面三层设计，全部是在把这个比喻变成工程现实。</p>
      <img src="/posts/ai-digital-employee/badge-metaphor.webp"
        alt="员工把工牌借给数字员工：她能刷的门就是你授权的门，敏感房间仍需你本人到场" />
      <p>整体架构长这样：</p>
      <ArchDiagram {...figArchitecture} caption="三层结构：协议仓库（接口自报家门）→ 统一身份（AI 走人一样的通道）→ 分级执行（AI 发疯也有兜底）" />
    </>
  )
}
