// scene-stages.tsx — 各 demo 的静态 Stage（首帧全亮，build 负责收回初始态）
// 文章有自己的 demo 样式时新建 post.css 放同目录，在这里顶部 import './post.css'
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import { figTplOverview, figTplDetail } from './diagrams'

export function OverviewStage() {
  return (
    <div data-arch="tpl-overview">
      <ArchDiagram {...figTplOverview} caption="一句话图注：这张图说明了什么" />
    </div>
  )
}

export function DetailStage() {
  return (
    <div data-arch="tpl-detail">
      <ArchDiagram {...figTplDetail} caption="一句话图注" />
    </div>
  )
}
