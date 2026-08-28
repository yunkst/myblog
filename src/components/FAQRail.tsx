import { useLocation, useNavigate } from 'react-router-dom'
import { getFAQs } from '../lib/content'
import { handleFaqClick } from './scrollTo'

export default function FAQRail() {
  const faqs = getFAQs()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside className="faq-rail" aria-label="常见问题导航">
      <p className="faq-title">面试官常问</p>
      <p className="faq-sub">点问题 → 跳到答案并触发动画</p>
      {faqs.map((f) => (
        <button key={f.id} className="faq-item" onClick={() => handleFaqClick(f.target, pathname, navigate)}>
          <span className="faq-no">{f.id}</span>
          <span className="faq-text">{f.text}</span>
          <span className="faq-dash" aria-hidden="true" />
        </button>
      ))}
    </aside>
  )
}
