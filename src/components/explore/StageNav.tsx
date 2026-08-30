import { useContext } from 'react'
import { ExploreRuntimeContext } from './AnswerContext'

/** v5 底部导航条（spec §2.2）：◀ 返回 / ⏵ 继续（主线下一幕）/ 履历 ▾ / ✕ 退出。
 * v5 review fix:下一幕由 runtime.nextScene 提供——StageNav 不再自行 findIndex 查表。 */
export default function StageNav() {
  const rt = useContext(ExploreRuntimeContext)!
  const next = rt.nextScene
  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <button type="button" disabled={!rt.canBack} aria-label="返回上一幕" onClick={rt.back}>◀ 返回</button>
      {next && (
        <button type="button" onClick={() => rt.goTo(next.id)}>⏵ 继续：{next.label}</button>
      )}
      <button type="button" aria-label="打开履历面板" onClick={() => rt.setPanelOpen(true)}>履历 ▾</button>
      <button type="button" aria-label="退出探索" onClick={rt.onExit}>✕ 退出</button>
    </nav>
  )
}
