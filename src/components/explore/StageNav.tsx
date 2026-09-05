import { useContext } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExploreRuntimeContext } from './AnswerContext'

/** v5 底部导航条；v10 重设计：三段式分区，职责一目了然——
 * - 左：幕间导航（◀ 上一幕）
 * - 中：视图切换（场景地图 / 平铺全文）
 * - 右：会话（✕ 退出舞台）
 * 命名修复（原「返回/继续/路线图/平铺/退出」歧义）：
 * - 「返回」→「上一幕」：与「退出」的边界说清了——一个翻幕、一个离开舞台；
 * - 「路线图 ▾」→「场景地图」：▾ 暗示下拉菜单，实际是场景总览面板；
 * - 「平铺」→「平铺全文」：说明白切到长文阅读形态；
 * - 「退出」→「退出舞台」：退出的是舞台模式，不是离开博客。
 * 「下一幕」按钮已移除（2026-09-05 用户裁定）：前进导航由幕内出口与场景地图覆盖，
 * 且原按钮在末幕会环绕跳回首幕，语义误导；→ 键快捷键保留。 */
export default function StageNav() {
  const rt = useContext(ExploreRuntimeContext)!
  const { slug } = useParams()
  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <div className="stage-nav__group">
        <button type="button" disabled={!rt.canBack} aria-label="返回上一幕" onClick={rt.back}>◀ 上一幕</button>
      </div>
      <div className="stage-nav__group stage-nav__group--center">
        <button type="button" aria-label="打开场景地图面板" onClick={() => rt.setPanelOpen(true)}>场景地图</button>
        <Link className="stage-nav__flat" to={`/blog/${slug}/flat/`} aria-label="平铺阅读全文">平铺全文</Link>
      </div>
      <button type="button" className="stage-nav__exit" aria-label="退出舞台模式" onClick={rt.onExit}>✕ 退出舞台</button>
    </nav>
  )
}
