import { useLocation, useNavigate } from 'react-router-dom'
import { getFAQs } from '../lib/content'
import { handleFaqClick } from './scrollTo'

/* 亮点 = FAQ 的另一个视图（spec §3.2）：文案来自 faqs.yaml，跳转行为与 FAQ 一致 */
export default function Highlights() {
  const faqs = getFAQs()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <div className="highlights">
      {faqs.map((f, i) => (
        <button key={f.id} className="hl" style={{ animationDelay: `${0.45 + i * 0.1}s` }}
          onClick={() => handleFaqClick(f.target, pathname, navigate)}>
          <span className="hl-name">{f.text}</span>
          <span className="hl-target">{f.target}</span>
        </button>
      ))}
    </div>
  )
}