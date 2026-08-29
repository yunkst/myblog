import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { MDXProvider } from '@mdx-js/react'
import { getPost, getAllPosts } from '../lib/content'
import { registry } from '../components/blog-anim/registry'
import AnswerProvider, { useAnswerContext } from '../components/explore/AnswerProvider'
import Answer from '../components/explore/Answer'
import QuestionAnchor from '../components/explore/QuestionAnchor'
import SceneClip from '../components/explore/SceneClip'

/* 构建期：所有 content/posts/<slug>/article.mdx 编译为组件映射（Vite 原生，eager） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

/**
 * 探索视图（Task 7 实装）会消费 useAnswerContext()。这里在阅读视图里
 * 调一次 hook，让 ctx 类型在阅读侧也能被工具函数合法引用。
 * 当前阶段仍由 MDX 渲染器直接产出正文，Body 只是 Post 的子组件。
 */
function PostBodyShell({ Body }: { Body: React.ComponentType | null }) {
  const ctx = useAnswerContext()
  void ctx
  return Body ? <Body /> : <p>正文缺失。</p>
}

export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  const list = useMemo(() => getAllPosts(), [])

  if (!post) {
    return <main className="post-wrap"><p>文章不存在。</p></main>
  }

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
    <MDXProvider components={{ ...registry, Answer, QuestionAnchor, SceneClip }}>
      <AnswerProvider>
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
            <PostBodyShell Body={Body} />
          </article>
          <nav className="post-nav">
            {prev && <Link to={`/blog/${prev.slug}/`}>← {prev.title}</Link>}
            {next && <Link to={`/blog/${next.slug}/`}>{next.title} →</Link>}
          </nav>
          {post.hasExplore && (
            <p style={{ marginTop: 32 }}>
              <Link to={`/blog/${post.slug}/explore/`} className="explore-entry-link">
                走进探索视图 →
              </Link>
            </p>
          )}
        </main>
      </AnswerProvider>
    </MDXProvider>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}