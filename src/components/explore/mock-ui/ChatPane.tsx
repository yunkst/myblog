import type { ReactNode } from 'react'

/**
 * ChatPane：聊天窗口框架。children 渲染在 body 内，作为消息列表容器。
 * GSAP 通过选择器 .mock-chat-body 进入并操作其内部 .mock-bubble/.mock-typing。
 */
export function ChatPane({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={['mock-chat-pane', className].filter(Boolean).join(' ')}>
      <div className="mock-chat-head">{title}</div>
      <div className="mock-chat-body">{children}</div>
    </div>
  )
}
