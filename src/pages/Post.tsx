import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { MDXProvider } from '@mdx-js/react'
import { getPost, getAllPosts } from '../lib/content'
import { registry } from '../components/blog-anim/registry'
import Answer from '../components/explore/Answer'
import QuestionAnchor from '../components/explore/QuestionAnchor'
import SceneClip from '../components/explore/SceneClip'

/* 构建期：所有 content/posts/<slug>/article.mdx 编译为组件映射（Vite 原生，eager） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

/**
 * Post Body 的轻量外壳。v1 探索视图（已废除）曾通过 useAnswerContext() 注册
 * AnswerProvider ctx；v2 阅读视图不再使用 ctx，但保留外壳以便未来扩展。
 */
function PostBodyShell({ Body }: { Body: React.ComponentType | null }) {
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
      </main>
    </MDXProvider>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}