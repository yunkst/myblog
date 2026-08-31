import type { ReactNode } from 'react'

/**
 * Bubble：消息气泡。left=对方 right=自己；带 data-mock-bubble 供 GSAP 选择。
 * GSAP 用 tl.to(el, { opacity:1, y:0 }) 入场；stagger 由 timeline 编排。
 * avatar/name 可选：传了就渲染头像（企微小圆角方形）+ 姓名行（群聊才显示姓名）。
 * children 包在 .mock-bubble-content 里——气泡底色/圆角/小尾巴只作用于内容块，
 * 头像不参与气泡背景（2026-08-31 企微皮肤）。
 */
export function Bubble({ side, children, id, avatar, name }: {
  side: 'left' | 'right'
  children: ReactNode
  id?: string
  avatar?: string
  name?: string
}) {
  return (
    <div id={id} data-mock-bubble="" className={`mock-bubble mock-bubble-${side}`}>
      {avatar && (
        <img className="mock-avatar" src={avatar} alt={name ?? ''} aria-hidden="true" />
      )}
      <div className="mock-bubble-main">
        {name && <span className="mock-bubble-name">{name}</span>}
        <div className="mock-bubble-content">{children}</div>
      </div>
    </div>
  )
}
