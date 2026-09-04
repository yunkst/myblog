import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>
        你现在正在看的这个页面就是本文的主角——这个博客本身，上一幕说的「底座」的一次实践。
        这里的做法是<strong>把文章做成可交互的演示</strong>：解说逐字打出、架构图带动画、
        功能点之间可以场景跳转；不想看演出的话，每篇文章还有一个传统的平铺长文页（/flat/）。
      </p>
      <p>
        技术栈：React + TypeScript + vite-react-ssg（全静态预渲染，无后端）+ GSAP（演出编排）+ 原生 CSS，
        不依赖任何 UI 组件库。部署产物是纯静态文件，丢到任意静态托管即可。
      </p>
      <p>代码结构刻意分成两层：</p>
      <ul>
        <li><strong>内容层</strong>（content/）：站点信息、FAQ、每篇文章的 yaml 与正文、图数据、文章专属样式——换使用者只需要改这一层；</li>
        <li><strong>框架层</strong>（src/）：场景编排、架构图组件、对齐校验——通用逻辑，不随内容变化。</li>
      </ul>
      <p>
        开源地址：<a href="https://github.com/yunkst/myblog">github.com/yunkst/myblog</a>。
        仓库自带文章模板（content/posts/_template）与写作指南（docs/writing-a-post.md），可以当模板用。
      </p>
      <p>下面分三节展开：场景编排、架构图组件、内容组织方式。</p>
    </>
  )
}
