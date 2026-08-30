import { useEffect, useRef } from 'react'

export interface KeyboardHandlers {
  onBack: () => void
  onNext: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onEnter: () => void
  onEsc: () => void
}

/** editable 元素（输入框等）聚焦时快捷键全部失效 */
function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true
  // isContentEditable 定义在 HTMLElement 上（Element 类型没有），非 HTML 元素上为 undefined → falsy，语义不变
  return (t as HTMLElement).isContentEditable
}

/**
 * v5 舞台键盘快捷键（spec §3.2）：← 返回 / → 下一幕 / ↑↓ 焦点出口 / Enter 跳转 / Esc 关面板或退出。
 * enabled=false：履历面板打开态——非 Esc 键全部失效（Esc 始终活着）。
 * handlers 走 ref，引用变化不重挂监听。
 */
export function useKeyboardShortcuts(handlers: KeyboardHandlers, enabled = true) {
  const ref = useRef(handlers)
  useEffect(() => { ref.current = handlers })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.key === 'Escape') { ref.current.onEsc(); return }
      if (!enabled) return
      switch (e.key) {
        case 'ArrowLeft': ref.current.onBack(); break
        case 'ArrowRight': ref.current.onNext(); break
        case 'ArrowUp': e.preventDefault(); ref.current.onArrowUp(); break
        case 'ArrowDown': e.preventDefault(); ref.current.onArrowDown(); break
        case 'Enter': ref.current.onEnter(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
