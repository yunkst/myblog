// scene-stages.tsx — myblog 各 demo 的静态 Stage（首帧全亮，build 负责收回初始态）
import './post.css'
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import { figBlogOverview, figSceneEngine, figArchEngine, figContentData } from './diagrams'

export function OverviewStage() {
  return (
    <div data-arch="blog-overview">
      <ArchDiagram {...figBlogOverview} caption="两层结构:内容层(yaml + 文章目录)驱动框架层(场景编排 + 图组件),SSG 产出纯静态页面" />
    </div>
  )
}
export function EngineStage() {
  return (
    <div data-arch="scene-engine">
      <ArchDiagram {...figSceneEngine} caption="explore.yaml 声明场景图,Director 按 mode 编排演出顺序,读完才出选项" />
    </div>
  )
}
export function DiagramStage() {
  return (
    <div data-arch="arch-engine">
      <ArchDiagram {...figArchEngine} caption="设计契约里的每条规则都有对应的自动化校验——规则不是建议,是契约" />
    </div>
  )
}
export function ContentStage() {
  return (
    <div data-arch="content-as-data">
      <ArchDiagram {...figContentData} caption="加文章 = 加目录:glob 自动发现,校验强制对齐,一份 yaml 同时驱动舞台与平铺页" />
    </div>
  )
}

/* 观点幕 q-vision（mode 1）：CLI agent 输入需求 → agent 工作流 → 网页生长出新场景。
 * 演示内容 = 这一幕自身的诞生过程（读者正在读的就是它），零概念门槛。
 * 专属样式在同目录 post.css（.vs-*）。 */
export function VisionStage() {
  return (
    <div className="concept-demo" data-concept="vision-chain">
      <h4 className="concept-title">一句需求 → 一幕博客</h4>
      <div id="vs-cli" className="vs-cli">
        <div className="vs-cli-bar">
          <span className="vs-dot" /><span className="vs-dot" /><span className="vs-dot" />
          <em>agent — myblog</em>
        </div>
        <div className="vs-cli-body">
          <div className="vs-line">
            <span className="vs-prompt-sign">›</span>
            <span id="vs-prompt" />
          </div>
          <div className="vs-step">读文章的场景配置 <b>✓</b></div>
          <div className="vs-step">写这一幕的正文 <b>✓</b></div>
          <div className="vs-step">配这一幕的演示动画 <b>✓</b></div>
          <div className="vs-step">跑校验和测试 <b>✓</b></div>
        </div>
      </div>
      <div id="vs-page" className="vs-page">
        <div className="vs-page-bar">
          <span id="vs-url">/blog/myblog/#q-vision</span>
        </div>
        <div className="vs-page-body">
          <div id="vs-scene-title" className="vs-scene-title">为什么博客不该只是长文</div>
          <div id="vs-scene-text" className="vs-scene-text" />
          <div id="vs-scene-demo" className="vs-scene-demo">演示动画</div>
        </div>
      </div>
      <p id="vs-caption" className="vs-caption">作者说想法，AI 写实现，测试兜底</p>
    </div>
  )
}
