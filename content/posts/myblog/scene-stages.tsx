// scene-stages.tsx — myblog 各 demo 的静态 Stage（首帧全亮，build 负责收回初始态）
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

/* 观点幕 q-vision：四步推理链，复用全局 .concept-demo 样式（无专属 CSS） */
export function VisionStage() {
  return (
    <div className="concept-demo" data-concept="vision-chain">
      <h4 className="concept-title">从「做不起」到「日用品」</h4>
      <ul className="concept-list">
        <li className="concept-item" data-idx="0">
          <span className="concept-no">1</span>
          <span className="concept-text">博客是自我表达的载体，长文把重点埋掉</span>
        </li>
        <li className="concept-item" data-idx="1">
          <span className="concept-no">2</span>
          <span className="concept-text">动画 / 演示 / 跳转：不是不想做，是做不起</span>
        </li>
        <li className="concept-item" data-idx="2">
          <span className="concept-no">3</span>
          <span className="concept-text">AI 把演出的成本打到接近零</span>
        </li>
        <li className="concept-item" data-idx="3">
          <span className="concept-no">4</span>
          <span className="concept-text">博客形态跟着变：成品网站 → 可演化的底座</span>
        </li>
      </ul>
    </div>
  )
}
