import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-diagram */
export default function QDiagram() {
  return (
    <>
      <SceneClip />
      <p>
        博客里所有原理图由同一个组件 ArchDiagram 渲染：图数据是三组数组
        （nodes / edges / bounds），组件负责布局之外的一切——配色、标签、动画、交互。
      </p>
      <p>组件提供的能力：</p>
      <ul>
        <li><strong>语义色板</strong>：节点只有五种 kind（核心/服务/存储/队列/外部），颜色唯一来源是色板，图例自动生成；</li>
        <li><strong>标签避让</strong>：边标签的落点在渲染前预排，避开节点、图例和已放置的其他标签；</li>
        <li><strong>数据流动画</strong>：边上的光点按出发节点的语义色持续流动（SMIL 实现，不占 JS 线程）；</li>
        <li><strong>交互</strong>：悬停节点时无关节点隐藏，点击锁定上下游链路（上游蓝、下游绿），全屏灯箱里同样可用。</li>
      </ul>
      <p>
        图的设计规则收敛在 docs/diagram-design.md，每条规则都有对应的自动化校验：
        文字不得跌破可辨识下限、标签避让必须有解、<strong>边线不得穿越任何第三方节点</strong>、图例不得与元素相撞。
        测试用 glob 自动发现所有文章的图数据——新文章加图无需注册，违规直接测试红。
      </p>
      <p>
        这套「规则 + 自动校验」的组合来自一个实际教训：手工画的图反复出现文字重叠和边线穿节点，
        人眼检查不可靠，于是把每条踩过的坑都变成了测试。
      </p>
    </>
  )
}
