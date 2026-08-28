import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getAllDomains, getPostsByDomain } from '../lib/content'

export default function Component() {
  const { slug = 'general' } = useParams()
  const posts = getPostsByDomain(slug)
  const domains = getAllDomains()
  return (
    <>
      <Head>
        <title>领域 · {slug}</title>
        <meta name="description" content={`${slug} 领域的文章列表`} />
      </Head>
      <main className="domain-wrap">
        <p className="eyebrow">领域 · DOMAIN</p>
        <h1>{slug}</h1>
        <p className="dim">该领域下 {posts.length} 篇文章</p>
        <ul className="domain-posts">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link to={`/blog/${p.slug}`}>{p.title}</Link>
              <time>{p.date}</time>
            </li>
          ))}
        </ul>
        <nav className="domain-links">
          {domains.map((d) => (
            <Link key={d.slug} to={`/domain/${encodeURIComponent(d.slug)}`} className={d.slug === slug ? 'on' : ''}>
              {d.slug}
            </Link>
          ))}
        </nav>
      </main>
    </>
  )
}

export const entry = 'src/pages/Domain.tsx'

export function getStaticPaths() {
  return getAllDomains().map((d) => `/domain/${encodeURIComponent(d.slug)}`)
}