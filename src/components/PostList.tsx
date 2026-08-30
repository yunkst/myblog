import { Link } from 'react-router-dom'
import { getAllPosts } from '../lib/content'
import { blogPostPath } from '../lib/nav'

export default function PostList() {
  const posts = getAllPosts()
  return (
    <section className="posts-section">
      <div className="sec-head"><span className="sec-title"><b>博客</b> · 时间倒序</span><span className="sec-rule" /></div>
      {posts.map((p) => {
        const target = p.exploreEntry
          ? { pathname: blogPostPath(p.slug), hash: `#${p.exploreEntry.id}` }
          : blogPostPath(p.slug)
        return (
          <Link key={p.slug} to={target} className="post-card">
            <div className="post-meta">
              <span className="tag">{p.domain}</span>
              <time>{p.date}</time>
            </div>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
            {p.exploreEntry && (
              <span className="explore-entry-btn" aria-hidden="false">▶ 进入舞台 · {p.exploreEntry.label}</span>
            )}
            <span className="anim-badge">anim · {p.anim_profile}</span>
          </Link>
        )
      })}
    </section>
  )
}