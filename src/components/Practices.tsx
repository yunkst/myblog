import { Link } from 'react-router-dom'
import { getSite } from '../lib/content'
import { blogPostPath } from '../lib/nav'

/* 主页「AI 提效实践」：三张项目卡，点击进对应博客（site.yaml practices，缺省不渲染） */
export default function Practices() {
  const practices = getSite().site.practices
  if (!practices?.length) return null
  return (
    <section className="home-sec">
      <div className="sec-head"><span className="sec-title"><b>AI 提效实践</b> · 都在生产里跑着</span><span className="sec-rule" /></div>
      <div className="prac-grid">
        {practices.map((p) => (
          <Link key={p.post} to={blogPostPath(p.post)} className="prac-card">
            <span className="prac-kicker">{p.kicker}</span>
            <p className="prac-desc">{p.desc}</p>
            <span className="prac-more">看完整复盘 →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
