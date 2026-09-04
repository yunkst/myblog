/**
 * v5（spec §2.2/§7.1）探索舞台壳。
 *
 * - main.stage-frame 包在 ExploreRouter **外层**（spec §2.2 嵌套契约）——
 *   RoadmapPanel 由 ExploreRouter 在 children 之后渲染，只有 main 包住 router，
 *   面板才是 main 的后代，`.stage-frame .roadmap-panel*` 选择器才能命中
 *   （反嵌套会让面板画在不透明 fixed main 之下，路线图 ▾ 按钮形同虚设）；
 *   SceneRoute 按 activeId 从 glob 命中场景组件；StageNav 渲染底栏 ◀/⏵/路线图/✕。
 * - setCurrentSlug 渲染期同步调用（v4 SceneClip 反查机制不变；SSG/客户端一致）。
 * - explore 配置经 content.getExploreConfig 取(数据层单点);glob/解析在 content.ts 单点维护。
 * - handleExit（v13 用户裁定）：退出舞台直接跳首页，不再 history 回退。
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Post } from '../lib/types'
import { getExploreConfig } from '../lib/content'
import { setCurrentSlug } from '../components/explore/SceneClip'
import { ExploreRouter } from '../components/explore/ExploreRouter'
import SceneRoute from '../components/explore/SceneRoute'
import StageNav from '../components/explore/StageNav'

export default function Stage({ post }: { post: Post }) {
  const navigate = useNavigate()
  const config = useMemo(() => getExploreConfig(post.slug), [post.slug])

  /* 同步写 SceneClip 反查的 slug（v4 机制；Stage 渲染 main 时一并写） */
  setCurrentSlug(post.slug)

  /* v13（用户裁定）：退出舞台直接回首页——舞台是从博客文章进入的全屏模式，
   * 「返回上一页」会把用户弹回文章中部，语义不如回首页清晰。 */
  const handleExit = useCallback(() => {
    navigate('/')
  }, [navigate])

  if (!config) {
    return (
      <main className="stage-frame" data-article-slug={post.slug}>
        <p style={{ color: '#888' }}>探索配置缺失。</p>
      </main>
    )
  }

  return (
    <main className="stage-frame" data-article-slug={post.slug}>
      <ExploreRouter config={config} onExit={handleExit}>
        <SceneRoute slug={post.slug} />
        <StageNav />
      </ExploreRouter>
    </main>
  )
}
