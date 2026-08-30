import type { HistoryEntry } from './useHistoryStack'

interface Props {
  stack: HistoryEntry[]
  /** 栈长 ≤ 1 时按钮 disabled（栈底无前身可退） */
  onBack: () => void
  onOpenPanel: () => void
}

/**
 * 底栏按钮组（v4 视觉小说式）：◀ 返回 / ▤ 履历 / 第 N 步。
 * - canBack = stack.length > 1，与 useHistoryStack.pop 守卫同一语义。
 * - 样式由 Task 6 在 `.post-wrap--stage` 作用域下补齐；本组件只出 DOM + 语义 class。
 */
export default function HistoryFAB({ stack, onBack, onOpenPanel }: Props) {
  const canBack = stack.length > 1
  return (
    <div className="history-fab">
      <button
        type="button"
        className="history-fab__back"
        disabled={!canBack}
        aria-label="返回上一幕"
        onClick={onBack}
      >
        ◀ 返回
      </button>
      <button
        type="button"
        className="history-fab__panel"
        aria-label="打开履历面板"
        onClick={onOpenPanel}
      >
        ▤ 履历
      </button>
      <span className="history-fab__depth">第 {stack.length} 步</span>
    </div>
  )
}
