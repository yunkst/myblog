/**
 * v5（spec §7.2）探索舞台壳。
 *
 * - 渲染 main.stage-frame 容器；ExploreRouter 接管 hash / 履历栈 / 键盘接线；
 *   SceneRoute 按 activeId 从 glob 命中场景组件；StageNav 渲染底栏 ◀/⏵/履历/✕。
 * - setCurrentSlug 渲染期同步调用（v4 SceneClip 反查机制不变；SSG/客户端一致）。
 * - exploreConfigFor 从旧 Post.tsx 迁入——文章 YAML 是 Stage 的数据源。
 * - handleExit：浏览器历史可退则回退，否则跳首页（stage-frame 是「全屏覆盖」语义）。
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import yaml from 'js-yaml'
import type { Post, ExploreConfig } from '../lib/types'
import { setCurrentSlug } from '../components/explore/SceneClip'
import { ExploreRouter } from '../components/explore/ExploreRouter'
import SceneRoute from '../components/explore/SceneRoute'
import StageNav from '../components/explore/StageNav'

const exploreYamls = import.meta.glob<string>('/content/posts/*/explore.yaml', {
  query: '?raw', import: 'default', eager: true,
})

/** 从全局 glob 表里按 slug 找 explore.yaml 文本并解析为 ExploreConfig。 */
function exploreConfigFor(slug: string): ExploreConfig | null {
  const key = Object.keys(exploreYamls).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  try {
    const parsed = yaml.load(exploreYamls[key]) as ExploreConfig | null
    return parsed && Array.isArray(parsed.scenes) ? parsed : null
  } catch {
    return null
  }
}

export default function Stage({ post }: { post: Post }) {
  const navigate = useNavigate()
  const config = useMemo(() => exploreConfigFor(post.slug), [post.slug])

  /* 同步写 SceneClip 反查的 slug（v4 机制；Stage 渲染 main 时一并写） */
  setCurrentSlug(post.slug)

  const handleExit = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }, [navigate])

  if (!config) {
    return (
      <main className="stage-frame" data-article-slug={post.slug}>
        <p style={{ color: '#888' }}>探索配置缺失。</p>
      </main>
    )
  }

  return (
    <ExploreRouter config={config} onExit={handleExit}>
      <main className="stage-frame" data-article-slug={post.slug}>
        <SceneRoute slug={post.slug} />
        <StageNav />
      </main>
    </ExploreRouter>
  )
}
