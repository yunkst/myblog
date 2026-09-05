import { getSite } from '../lib/content'

/* 主页「关于我」：经历概述 + AI 实战 + 技术栈 + 业务规模数字（site.yaml about） */
export default function About() {
  const about = getSite().site.about
  if (!about) return null
  return (
    <section className="home-sec">
      <div className="sec-head"><span className="sec-title"><b>关于我</b></span><span className="sec-rule" /></div>
      <p className="about-lead">{about.experience}</p>
      <div className="about-block about-block-wide">
        <p className="about-label">AI 实战</p>
        <p className="about-text">{about.ai}</p>
      </div>
      <div className="stack-list">
        {about.stacks.map((s) => (
          <div className="stack-row" key={s.label}>
            <span className="stack-label">{s.label}</span>
            <span className="stack-items">{s.items}</span>
          </div>
        ))}
      </div>
      {about.stats && (
        <div className="bg-stats about-stats">
          {about.stats.map((s) => (
            <div className="bg-stat" key={s.label}>
              <span className="bg-value">{s.value}</span>
              <span className="bg-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
