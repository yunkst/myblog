import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPosts, getSite } from '../lib/content'
import { blogPostPath } from '../lib/nav'

export default function PostList() {
  const posts = getAllPosts()
  /* 领域筛选：按钮顺序按 site.yaml domains 编排，只展示有文章的领域（避免空筛选项） */
  const order = getSite().site.domains ?? []
  const present = [...new Set(posts.map((p) => p.domain))]
  const domains = [
    ...order.filter((d) => present.includes(d)),
    ...present.filter((d) => !order.includes(d)),
  ]
  const [active, setActive] = useState('all')
  const visible = active === 'all' ? posts : posts.filter((p) => p.domain === active)

  return (
    <section className="posts-section">
      <div className="sec-head"><span className="sec-title"><b>博客</b> · 置顶优先 · 时间倒序</span><span className="sec-rule" /></div>
      <div className="post-filters" role="group" aria-label="按领域筛选">
        <button
          type="button"
          className={`post-filter-btn${active === 'all' ? ' is-active' : ''}`}
          onClick={() => setActive('all')}
        >全部<span className="n">{posts.length}</span></button>
        {domains.map((d) => (
          <button
            key={d}
            type="button"
            className={`post-filter-btn${active === d ? ' is-active' : ''}`}
            onClick={() => setActive(d)}
          >{d}<span className="n">{posts.filter((p) => p.domain === d).length}</span></button>
        ))}
      </div>
      {visible.map((p) => {
        const target = p.exploreEntry
          ? { pathname: blogPostPath(p.slug), hash: `#${p.exploreEntry.id}` }
          : blogPostPath(p.slug)
        return (
          <Link key={p.slug} to={target} className="post-card">
            <div className="post-meta">
              {p.pinned && <span className="post-pin">置顶</span>}
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
