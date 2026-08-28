import { Link } from 'react-router-dom'
import { getSite } from '../lib/content'

/* 全站共享顶栏（spec §3.1：顶栏 + 导航，任何页面始终可见） */
export default function Topbar() {
  const site = getSite().site
  return (
    <header className="topbar">
      <Link to="/" className="logo">{site.name}</Link>
      <nav className="topnav">
        <Link to="/#blog">博客</Link>
        <Link to="/#contact">联系</Link>
      </nav>
    </header>
  )
}
