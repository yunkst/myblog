import type { ReactNode } from 'react'

/**
 * Bubble：消息气泡。left=对方 right=自己；带 data-mock-bubble 供 GSAP 选择。
 * GSAP 用 tl.to(el, { opacity:1, y:0 }) 入场；stagger 由 timeline 编排。
 */
export function Bubble({ side, children, id }: { side: 'left' | 'right'; children: ReactNode; id?: string }) {
  return (
    <div id={id} data-mock-bubble="" className={`mock-bubble mock-bubble-${side}`}>{children}</div>
  )
}
