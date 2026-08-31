import { useContext } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExploreRuntimeContext } from './AnswerContext'

/** v5 底部导航条（spec §2.2）：◀ 返回 / ⏵ 继续（主线下一幕）/ 路线图 ▾ / ✕ 退出。
 * v5 review fix:下一幕由 runtime.nextScene 提供——StageNav 不再自行 findIndex 查表。
 * v6：「履历 ▾」更名「路线图 ▾」——面板主体从访问历史改为全篇场景图（RoadmapPanel）。
 * v8：新增「☰ 平铺」——双形态共存，跳到 /blog/<slug>/flat/ 长文版。 */
export default function StageNav() {
  const rt = useContext(ExploreRuntimeContext)!
  const { slug } = useParams()
  const next = rt.nextScene
  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <button type="button" disabled={!rt.canBack} aria-label="返回上一幕" onClick={rt.back}>◀ 返回</button>
      {next && (
        <button type="button" onClick={() => rt.goTo(next.id)}>⏵ 继续：{next.label}</button>
      )}
      <button type="button" aria-label="打开路线图面板" onClick={() => rt.setPanelOpen(true)}>路线图 ▾</button>
      <Link className="stage-nav__flat" to={`/blog/${slug}/flat/`} aria-label="平铺阅读">☰ 平铺</Link>
      <button type="button" aria-label="退出探索" onClick={rt.onExit}>✕ 退出</button>
    </nav>
  )
}
