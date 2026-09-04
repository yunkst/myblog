import { Head } from 'vite-react-ssg'
import { getSite } from '../lib/content'
import About from '../components/About'
import Practices from '../components/Practices'
import Strengths from '../components/Strengths'
import PostList from '../components/PostList'
import Contact from '../components/Contact'

export default function Home() {
  const site = getSite().site
  return (
    <>
      <Head>
        <title>{site.name} · 个人主页</title>
        <meta name="description" content={`${site.name} · ${site.years} 年经验 · ${site.tagline}`} />
      </Head>

      {/* HERO：姓名 + 头衔 */}
      <section className="hero">
        <p className="eyebrow">{site.eyebrow}<span className="no">UPDATED {site.updated}</span></p>
        <h1 className="hero-h1">{site.name}</h1>
        <p className="hero-title">{site.years} 年经验 · {site.tagline}</p>
        <div className="cta-row">
          <a className="btn btn-solid" href="#contact">直接联系我</a>
          <a className="btn btn-ghost" href="#blog">先看博客 ↓</a>
        </div>
      </section>

      <About />
      <Practices />
      <Strengths />

      <div className="home-sec" id="blog">
        <PostList />
      </div>

      <Contact />
    </>
  )
}
