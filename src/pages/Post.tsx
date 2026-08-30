/**
 * v2 单页面方案：阅读与探索是同一页面——正文由 MDX 渲染，Answer 原位渲染为
 * 锚点块（#<id>），场景动画经 SceneClip 嵌入正文流；<main data-article-slug> 保留
 * （SceneClip 反查当前文章依赖）。
 * v4（Task 5）：有 exploreConfig 时正文由 `<ExploreRouter>` 包裹——hash 路由 +
 * 履历栈 + 单幕激活 + 点击跳过；无 explore 文章渲染路径完全不变。
 * SceneToc 已随 v4 幕式导航退役（滚动定位语义被激活幕取代）。
 */
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { MDXProvider } from '@mdx-js/react'
import { getPost, getAllPosts } from '../lib/content'
import { registry } from '../components/blog-anim/registry'
import { parseExploreYaml } from '../lib/explore'
import type { ExploreConfig } from '../lib/types'
import Answer from '../components/explore/Answer'
import SceneClip, { setCurrentSlug } from '../components/explore/SceneClip'
import { ExploreRouter } from '../components/explore/ExploreRouter'

/* 构建期：所有 content/posts/<slug>/article.mdx 编译为组件映射（Vite 原生，eager） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

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

  /* 同步设置当前文章 slug——SceneClip 在 SSG/hydration 的渲染期读取它来解析
   * demos 字典。放在 return 之前保证 SSR 与客户端同一顺序执行，Stage 渲染
   * 一致，避免 React hydration mismatch（closest() 在 SSG 无 DOM 不可用）。 */
  setCurrentSlug(post.slug)

  const idx = list.findIndex((p) => p.slug === post.slug)
  const prev = idx > 0 ? list[idx - 1] : undefined
  const next = idx < list.length - 1 ? list[idx + 1] : undefined

  const key = Object.keys(mdxModules).find((k) => {
    const parts = k.split('/')
    const dir = parts[parts.length - 2]
    return dir === post.slug
  })
  const Body = key ? mdxModules[key].default : null

  return (
    <MDXProvider components={{ ...registry, Answer, SceneClip }}>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className={exploreConfig ? 'post-wrap post-wrap--stage' : 'post-wrap'} data-article-slug={post.slug}>
        <div className="post-meta">
          <Link to={`/domain/${encodeURIComponent(post.domain)}/`} className="tag">{post.domain}</Link>
          <time>{post.date}</time>
          <span className="anim-badge">{post.anim_profile}</span>
        </div>
        <h1>{post.title}</h1>
        <p className="post-excerpt">{post.excerpt}</p>
        {exploreConfig && (
          <p className="explore-hint">本文可顺序阅读；点击各场景下方的出口按钮可跳转探索。</p>
        )}
        {exploreConfig ? (
          <ExploreRouter config={exploreConfig}>
            <article className="post-body" id="animations">
              {Body ? <Body /> : <p>正文缺失。</p>}
            </article>
          </ExploreRouter>
        ) : (
          <article className="post-body" id="animations">
            {Body ? <Body /> : <p>正文缺失。</p>}
          </article>
        )}
        <nav className="post-nav">
          {prev && <Link to={`/blog/${prev.slug}/`}>← {prev.title}</Link>}
          {next && <Link to={`/blog/${next.slug}/`}>{next.title} →</Link>}
        </nav>
      </main>
    </MDXProvider>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}
