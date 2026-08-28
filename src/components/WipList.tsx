import { getWips } from '../lib/content'

export default function WipList() {
  const wips = getWips()
  if (!wips.length) return null
  return (
    <section className="wip-section">
      <div className="sec-head"><span className="sec-title"><b>在做</b> · WIP</span><span className="sec-rule" /></div>
      {wips.map((w) => (
        <article key={w.slug} className="wip-card">
          <div className="wip-top"><h3>{w.title}</h3><span className="wip-status">{w.status}</span></div>
          <p className="wip-thoughts">{w.thoughts}</p>
          <div className="progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${w.progress}%` }} /></div>
            <span className="progress-num">{w.progress}%</span></div>
        </article>
      ))}
    </section>
  )
}