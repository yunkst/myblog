import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getSite, getAllPosts } from '../lib/content'
import Highlights from '../components/Highlights'
import PostList from '../components/PostList'
import WipList from '../components/WipList'
import Contact from '../components/Contact'
import FAQRail from '../components/FAQRail'
import Counter from '../components/blog-anim/Counter'
import Typewriter from '../components/blog-anim/Typewriter'
import ArchDiagram, { DEMO_ARCH } from '../components/blog-anim/ArchDiagram'

export default function Home() {
  const site = getSite().site
  const count = getAllPosts().length
  return (
    <>
      <Head>
        <title>{site.name} · 个人博客</title>
        <meta name="description" content={site.tagline} />
      </Head>

      <header className="topbar">
        <span className="logo">{site.name}</span>
        <nav className="topnav">
          <Link to="/#blog">博客</Link>
          <Link to="/#contact">联系</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <p className="eyebrow">候选人档案<span className="no">UPDATED 2026-08</span></p>
        <h1 className="hero-h1">{site.tagline}</h1>
        <div className="dim-line">
          <span className="dim-end" /><span className="dim-line-grow" />
          <span className="dim-text">{site.name} · {count} 篇文章 · 示例</span>
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

          {/* 动画样张区：把三种动画一次性展示（spec §3.2 落地） */}
          <section className="anim-section">
            <div className="sec-head"><span className="sec-title"><b>动画样张</b> · 三种档案</span><span className="sec-rule" /></div>
            <div className="specimens">
              <div className="spec"><div className="spec-label">TYPEWRITER · story</div><div className="spec-body"><Typewriter text="问题不是流量大，是读多写少还要求强一致——我们把缓存当成了第一方案，又亲手把它撤了。" /></div></div>
              <div className="spec"><div className="spec-label">COUNTER · data-narrative</div><div className="spec-body"><Counter from={0} to={4200} suffix=" QPS" label="峰值压测（占位）" /></div></div>
            </div>
            <div className="spec full"><div className="spec-label">ARCH DIAGRAM · architecture · 装配动画</div><ArchDiagram {...DEMO_ARCH} caption="读多写少架构示意（占位数据）" /></div>
          </section>

          <WipList />
        </div>
        <FAQRail />
      </main>

      <Contact />
    </>
  )
}