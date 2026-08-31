/**
 * v8 平铺阅读页（双形态共存）：/blog/<slug>/flat/
 *
 * 把 explore 文章的 15 幕按 yaml 顺序平铺成普通长文——
 * 给「不想看演出、只想一口气读完」的读者一个不交互的版本。
 *
 * 复用面（零改动的既有能力）：
 * - Answer 无 ExploreRuntimeContext 时 perform=false → 静态直渲（无 Director 门控，
 *   打字机/逐条演出不触发，全文立即终态可见，SSG/no-JS 同构）；
 * - SceneClip 自带 IntersectionObserver——demo 滚动进视口自动内联播一次，
 *   离开暂停、播完出「↻ 重看」，平铺模式天然生效；
 * - ExitChips 无 runtime 时回退 hash + scrollIntoView——出口 chips 自动变成
 *   文内锚点跳转（每节 id = scene.id）；
 * - setCurrentSlug 渲染期同步写（与 Stage 同一机制，SSG/hydration 一致）。
 *
 * 与舞台模式互链：本页头部「▶ 舞台模式」→ /blog/<slug>/；
 * StageNav 底栏「☰ 平铺」→ 本页。
 */
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getPost, getExploreConfig } from '../lib/content'
import { blogPostPath } from '../lib/nav'
import { setCurrentSlug } from '../components/explore/SceneClip'
import { sceneModulesFor, resolveSceneComponent } from '../components/explore/SceneRoute'
import { ExploreConfigContext } from '../components/explore/AnswerContext'
import Answer from '../components/explore/Answer'

export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  const config = useMemo(
    () => (post?.hasExplore ? getExploreConfig(post.slug) : null),
    [post],
  )
  /* 同步写 SceneClip 反查的 slug（与 Stage 同一时机：渲染期，SSG/客户端一致）。
   * 必须在 return 前无条件执行——hooks 顺序契约不涉及它（非 hook），
   * 但 SSR 直出要求渲染 SceneClip 之前 slug 已就位。 */
  setCurrentSlug(post?.hasExplore ? post.slug : null)

  if (!post) {
    return (
      <>
        <Head><title>文章不存在</title></Head>
        <main className="post-wrap"><p>文章不存在。</p></main>
      </>
    )
  }
  if (!config) {
    /* 无 explore 配置的文章没有平铺版（本就无舞台内容）——引导回文章页 */
    return (
      <>
        <Head><title>{post.title} · {post.domain}</title></Head>
        <main className="post-wrap">
          <p>这篇文章没有平铺版。<Link to={blogPostPath(post.slug)}>回到文章 →</Link></p>
        </main>
      </>
    )
  }

  const sceneMap = sceneModulesFor()
  return (
    <>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className="flat-post" data-article-slug={post.slug}>
        <header className="flat-post__header">
          <p className="flat-post__meta">{post.domain} · {post.date}</p>
          <h1 className="flat-post__title">{post.title}</h1>
          {post.excerpt && <p className="flat-post__excerpt">{post.excerpt}</p>}
          <Link className="flat-post__mode-switch" to={blogPostPath(post.slug)}>
            ▶ 舞台模式（动画探索版）
          </Link>
        </header>
        <ExploreConfigContext.Provider value={config}>
          {config.scenes.map((scene) => {
            const Scene = resolveSceneComponent(sceneMap, post.slug, scene.id)
            if (!Scene) return null
            /* 无 ExploreRuntimeContext.Provider——Answer 静态直渲（见文件头注释） */
            return <Answer key={scene.id} scene={scene} body={<Scene />} />
          })}
        </ExploreConfigContext.Provider>
        <footer className="flat-post__footer">
          <Link className="flat-post__mode-switch" to={blogPostPath(post.slug)}>
            ▶ 舞台模式（动画探索版）
          </Link>
        </footer>
      </main>
    </>
  )
}

export const entry = 'src/pages/FlatPost.tsx'
