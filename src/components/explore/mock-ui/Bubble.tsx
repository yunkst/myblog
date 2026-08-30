import type { ReactNode } from 'react'

/**
 * Bubble：消息气泡。left=对方 right=自己；带 data-mock-bubble 供 GSAP 选择。
 * GSAP 用 tl.to(el, { opacity:1, y:0 }) 入场；stagger 由 timeline 编排。
 * avatar/name 可选：传了就在气泡上方/左侧渲染头像+姓名行（企业微信群样式）。
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
        {children}
      </div>
    </div>
  )
}
