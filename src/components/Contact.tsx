import { getSite } from '../lib/content'

export default function Contact() {
  const site = getSite().site
  return (
    <section className="contact" id="contact">
      <p className="eyebrow">联系 · CONTACT</p>
      <div className="contact-lines">
        <div className="c-line"><span className="c-label">邮箱</span><a href={`mailto:${site.email}`}>{site.email}</a></div>
        <div className="c-line"><span className="c-label">GitHub</span><a href={site.github} target="_blank" rel="noreferrer">{site.github}</a></div>
      </div>
      <div className="qr">
        {site.wechat_qr.endsWith('.png')
          ? <img src={site.wechat_qr} alt="微信二维码" />
          : <span>微信二维码<br />占位</span>}
      </div>
    </section>
  )
}