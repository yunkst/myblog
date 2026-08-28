import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { MDXProvider } from '@mdx-js/react'
import { getPost, getAllPosts } from '../lib/content'
import { registry } from '../components/blog-anim/registry'

/* 构建期：所有 content/posts/*.mdx 编译为组件映射（Vite 原生，eager） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*.mdx',
  { eager: true },
)

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

  const key = Object.keys(mdxModules).find((k) =>
    k.split('/').pop()!.replace(/\.mdx$/, '') === post.fileName,
  )
  const Body = key ? mdxModules[key].default : null

  return (
    <MDXProvider components={{ ...registry }}>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className="post-wrap">
        <div className="post-meta">
          <Link to={`/domain/${encodeURIComponent(post.domain)}`} className="tag">{post.domain}</Link>
          <time>{post.date}</time>
          <span className="anim-badge">{post.anim_profile}</span>
        </div>
        <h1>{post.title}</h1>
        <p className="post-excerpt">{post.excerpt}</p>
        <article className="post-body" id="animations">
          {Body ? <Body /> : <p>正文缺失。</p>}
        </article>
        <nav className="post-nav">
          {prev && <Link to={`/blog/${prev.slug}`}>← {prev.title}</Link>}
          {next && <Link to={`/blog/${next.slug}`}>{next.title} →</Link>}
        </nav>
      </main>
    </MDXProvider>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => `/blog/${p.slug}`)
}