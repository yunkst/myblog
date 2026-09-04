import { getSite } from '../lib/content'

/* 主页「核心优势」：卡片网格（site.yaml strengths，缺省不渲染） */
export default function Strengths() {
  const strengths = getSite().site.strengths
  if (!strengths?.length) return null
  return (
    <section className="home-sec">
      <div className="sec-head"><span className="sec-title"><b>核心优势</b></span><span className="sec-rule" /></div>
      <div className="str-grid">
        {strengths.map((s) => (
          <div className="str-card" key={s.title}>
            <p className="str-title">{s.title}</p>
            <p className="str-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
