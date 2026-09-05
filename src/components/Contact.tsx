import { getSite } from '../lib/content'

/* 微信双气泡单色图标（内联 SVG，随文字颜色走） */
function WeChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M9.5 4C5.36 4 2 6.79 2 10.22c0 1.93 1.06 3.65 2.72 4.79l-.68 2.05 2.37-1.19c.97.27 2 .42 3.09.42h.24A5.9 5.9 0 0 1 9.5 15c0-3.31 3.13-6 7-6 .34 0 .67.02 1 .06C16.9 6.35 13.55 4 9.5 4zM7 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      <path d="M22 15c0-2.76-2.69-5-6-5s-6 2.24-6 5 2.69 5 6 5c.83 0 1.63-.13 2.36-.36L20.5 21l-.56-1.68A4.6 4.6 0 0 0 22 15zm-8-1a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8zm4 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z" />
    </svg>
  )
}

export default function Contact() {
  const site = getSite().site
  return (
    <section className="contact" id="contact">
      <p className="eyebrow">联系 · CONTACT</p>
      <div className="contact-lines">
        <div className="c-line"><span className="c-label">邮箱</span><a href={`mailto:${site.email}`}>{site.email}</a></div>
        <div className="c-line"><span className="c-label">GitHub</span><a href={site.github} target="_blank" rel="noreferrer">{site.github}</a></div>
      </div>
      <div className="qr-wrap">
        <div className="qr">
          {site.wechat_qr.endsWith('.png')
            ? <img src={`${import.meta.env.BASE_URL}static/${site.wechat_qr}`} alt="微信二维码" />
            : <span>微信二维码<br />占位</span>}
          <span className="qr-scan" aria-hidden="true" />
        </div>
        <p className="qr-label"><WeChatIcon />微信扫码添加</p>
      </div>
    </section>
  )
}
