/**
 * v5（Task 7）：MDX 管线退役——
 * - 不再有 mdxModules glob；正文渲染依赖 explore → Stage 占位（main.stage-frame），
 *   T8 将用 SceneRoute 接管该 main 的内容；
 * - 非 explore 分支（无 yaml）走「敬请期待」占位页（article.mdx 已删除）。
 */
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getPost, getAllPosts } from '../lib/content'
import { parseExploreYaml } from '../lib/explore'
import type { ExploreConfig } from '../lib/types'
import { ExploreRouter } from '../components/explore/ExploreRouter'

/* 探索 yaml 原文（与 content.client 同款 ?raw glob）；SSG 与浏览器同源，无 hydration 差异 */
const exploreYamls = import.meta.glob<string>('/content/posts/*/explore.yaml', {
  query: '?raw', import: 'default', eager: true,
})
function exploreConfigFor(slug: string): ExploreConfig | null {
  const key = Object.keys(exploreYamls).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  const r = parseExploreYaml(exploreYamls[key])
  return r.ok ? r.value : null
}

export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  const list = useMemo(() => getAllPosts(), [])
  const exploreConfig = useMemo(() => exploreConfigFor(post?.slug || ''), [post?.slug])

  if (!post) {
    return <main className="post-wrap"><p>文章不存在。</p></main>
  }

  const idx = list.findIndex((p) => p.slug === post.slug)
  const prev = idx > 0 ? list[idx - 1] : undefined
  const next = idx < list.length - 1 ? list[idx + 1] : undefined

  /* 探索分支：占位 <main className="stage-frame" data-article-slug=...>
   * ——T8 把 SceneRoute 接进这个 main；ExploreRouter 在 mount effect 中查询
   * `main.stage-frame, main.post-wrap--stage` 挂 data-has-router + body.stage-locked。 */
  if (exploreConfig) {
    return (
      <>
        <Head>
          <title>{post.title} · {post.domain}</title>
          <meta name="description" content={post.excerpt} />
        </Head>
        <ExploreRouter config={exploreConfig}>
          <main className="stage-frame" data-article-slug={post.slug}>
            <p style={{ color: '#888' }}>舞台在 T8 接线</p>
          </main>
        </ExploreRouter>
        {/* 上下篇导航放 ExploreRouter 之外——避免 ExploreRouter 的全屏 div 覆盖 */}
        <nav className="post-nav">
          {prev && <Link to={`/blog/${prev.slug}/`}>← {prev.title}</Link>}
          {next && <Link to={`/blog/${next.slug}/`}>{next.title} →</Link>}
        </nav>
      </>
    )
  }

  /* 非探索分支（article.mdx 已废除，无 yaml 时正文走「敬请期待」占位） */
  return (
    <>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className="post-wrap" data-article-slug={post.slug}>
        <div className="post-meta">
          <Link to={`/domain/${encodeURIComponent(post.domain)}/`} className="tag">{post.domain}</Link>
          <time>{post.date}</time>
          <span className="anim-badge">{post.anim_profile}</span>
        </div>
        <h1>{post.title}</h1>
        <p className="post-excerpt">{post.excerpt}</p>
        <article className="post-body" id="animations">
          <p style={{ color: '#888' }}>该文章正文正在迁移到场景单元，敬请期待。</p>
        </article>
        <nav className="post-nav">
          {prev && <Link to={`/blog/${prev.slug}/`}>← {prev.title}</Link>}
          {next && <Link to={`/blog/${next.slug}/`}>{next.title} →</Link>}
        </nav>
      </main>
    </>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}
