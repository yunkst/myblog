import type { ReactNode } from 'react'

/**
 * ChatPane：企业微信聊天窗口框架。children 渲染在 body 内，作为消息列表容器。
 * GSAP 通过选择器 .mock-chat-body 进入并操作其内部 .mock-bubble/.mock-typing。
 * 头部：‹ 返回 + 居中标题 + ⋯ 更多（企微私聊/群聊标准栏）。
 */
export function ChatPane({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={['mock-chat-pane', className].filter(Boolean).join(' ')}>
      <div className="mock-chat-head">
        <span className="mock-chat-back" aria-hidden="true">‹</span>
        <span className="mock-chat-title">{title}</span>
        <span className="mock-chat-more" aria-hidden="true">⋯</span>
      </div>
      <div className="mock-chat-body">{children}</div>
    </div>
  )
}
