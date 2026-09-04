import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-content */
export default function QContent() {
  return (
    <>
      <SceneClip />
      <p>
        加一篇文章不需要改任何框架代码：在 content/posts/ 下新建一个目录，
        放上 meta.yaml（标题/领域/日期/置顶）和 explore.yaml（场景图），
        <code>import.meta.glob</code> 会自动发现它，主页列表、领域筛选、/flat/ 页全部自动生成。
      </p>
      <p>内容层与框架层之间的对齐由校验和测试强制保证：</p>
      <ul>
        <li><code>validate-explore.ts</code>：每幕必须有 demo，demo 名必须在 scene.tsx 的注册表里，场景 id 必须有对应的正文文件；</li>
        <li>每篇文章自带两个测试：scenes 目录 ↔ yaml 场景双向对齐 + 逐幕渲染冒烟、demo 注册表完整性；</li>
        <li>图数据进 ArchDiagram 的全局校验（glob 自动发现）；</li>
        <li>内容层整体纳入 tsc 类型检查——正文 TSX 里的类型错误同样会拦截。</li>
      </ul>
      <p>
        样式也按同样的边界拆成三层：框架样式（框架自带）、主题样式（使用者的皮肤）、
        文章专属样式（post.css 随文章目录走，由文章自己 import）。
      </p>
      <p>
        仓库里带一个最小文章模板（content/posts/_template，draft 状态不上线但参与全部校验），
        复制后按 docs/writing-a-post.md 的五步改完即可上线。
      </p>
      <p>
        最后回应开头的判断：模板、校验和写作指南这些护栏，存在的意义就是让「带着 AI 演进」成立——
        使用者（或者 AI）在框架上改完任何东西，跑一遍校验和测试就立刻知道改对没有。
        功能会被随手改掉，护栏才是这个仓库真正沉淀的东西。
      </p>
    </>
  )
}
