import type { ReactNode } from 'react'
import type { HistoryEntry } from './useHistoryStack'

interface Props {
  /** 受控：false 时整层不挂载 */
  open: boolean
  onClose: () => void
  stack: HistoryEntry[]
  /** idx 是 stack 索引；面板不直接动 history，由调用方决定语义（close + goTo） */
  onJumpTo: (idx: number) => void
  /** 出口树 slot（由 ExploreRouter 注入主线/支线） */
  children?: ReactNode
  /* v5 新增：动作镜像（spec §3.3） */
  /** 栈长 > 1 时启用 ◀ 返回 */
  canBack?: boolean
  onBack?: () => void
  /** 例如 "⏵ 继续：B" */
  nextLabel?: string
  onNext?: () => void
  onExit?: () => void
}

/**
 * 探索履历弹层（v4 视觉小说式）。
 * - 受控弹层：open=false 不渲染。
 * - 出口树（slot） + 访问历史（ol 倒序可点跳）。
 * - 样式由 Task 6 在 `.stage-frame` 作用域下补齐，本组件只出 DOM + 语义 class。
 * - 无障碍：role=dialog + aria-label；关闭用 aria-label=关闭。
 */
export default function HistoryPanel({ open, onClose, stack, onJumpTo, children, canBack, onBack, nextLabel, onNext, onExit }: Props) {
  if (!open) return null
  return (
    <div className="history-panel" role="dialog" aria-label="探索履历">
      <div className="history-panel__backdrop" onClick={onClose} />
      <div className="history-panel__body">
        <header className="history-panel__header">
          <span className="history-panel__title">─ 探索履历 ─</span>
          <button
            type="button"
            aria-label="关闭"
            className="history-panel__close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="history-panel__actions">
          <button type="button" disabled={!canBack} onClick={onBack}>◀ 返回</button>
          <button type="button" onClick={onNext}>{nextLabel}</button>
          <button type="button" onClick={onExit}>✕ 退出</button>
        </div>
        {children && (
          <section className="history-panel__exits">{children}</section>
        )}
        <section className="history-panel__history">
          <span className="history-panel__sub">─ 访问历史 ─</span>
          {stack.length === 0 ? (
            <ol />
          ) : (
            <ol className="history-panel__list">
              {stack.map((e, i) => (
                <li key={`${e.sceneId}-${i}`}>
                  <button
                    type="button"
                    className="history-panel__entry"
                    onClick={() => onJumpTo(i)}
                  >
                    <span className="history-panel__no">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="history-panel__id">{e.sceneId}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
