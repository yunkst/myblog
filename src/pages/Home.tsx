import { Head } from 'vite-react-ssg'
import { getSite, getAllPosts } from '../lib/content'
import Highlights from '../components/Highlights'
import PostList from '../components/PostList'
import WipList from '../components/WipList'
import Contact from '../components/Contact'
import FAQRail from '../components/FAQRail'

export default function Home() {
  const site = getSite().site
  const count = getAllPosts().length
  return (
    <>
      <Head>
        <title>{site.name} · 个人博客</title>
        <meta name="description" content={site.tagline} />
      </Head>

      {/* HERO */}
      <section className="hero">
        <p className="eyebrow">候选人档案<span className="no">UPDATED 2026-08</span></p>
        <h1 className="hero-h1">{site.tagline}</h1>
        <div className="dim-line">
          <span className="dim-end" /><span className="dim-line-grow" />
          <span className="dim-text">{site.name} · 8 年 · 3 个领域 · {count} 篇文章</span>
          <span className="dim-line-grow" /><span className="dim-end" />
        </div>
        <p className="legend-label">亮点图例</p>
        <Highlights />
        <div className="cta-row">
          <a className="btn btn-solid" href="#contact">直接联系我</a>
          <a className="btn btn-ghost" href="#blog">先看博客 ↓</a>
        </div>
      </section>

      {/* 主体两栏：左内容 + 右 FAQ 列 */}
      <main className="main-grid">
        <div className="main-col">
          <PostList />

          <WipList />
        </div>
        <FAQRail />
      </main>

      <Contact />
    </>
  )
}