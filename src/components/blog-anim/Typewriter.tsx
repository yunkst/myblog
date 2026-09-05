import { useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

interface Props {
  text: string
  speed?: number // ms/字
}

export default function Typewriter({ text, speed = 55 }: Props) {
  const [out, setOut] = useState('')
  const started = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  /* useLayoutEffect（非 useEffect）：终态高度预留必须在 paint 之前生效，
   * 否则用户先看到空段落（下方内容上提）再被推下来——一次挂载期位移。 */
  useLayoutEffect(() => {
    if (started.current) return
    started.current = true
    const reduced = prefersReducedMotion()
    if (reduced) { setOut(text); return }

    /* 终态高度预留（防抖动）：.ba-type 是 inline，min-height 对它无效——
     * 预留打在向上找到的最近块级容器上。同步「插全文→量父高→移除」
     * （临时文本节点插在光标前，与终态 DOM 顺序一致；useLayoutEffect 内
     * paint 前完成，无中间帧），打字期间父块高度恒定，下方内容不再被
     * 逐行推移。jsdom 等无布局环境量到 0 自动跳过；打完后清除，打字中
     * resize 造成的 px 失真随之自愈。全局 box-sizing:border-box
     * （theme.css），rect.height 即 min-height 语义值。 */
    let block: HTMLElement | null = null
    const el = ref.current
    if (el && text.length > 0) {
      const tmp = document.createTextNode(text)
      el.insertBefore(tmp, el.firstChild)
      block = el.parentElement
      while (block && getComputedStyle(block).display === 'inline') {
        block = block.parentElement
      }
      if (block) {
        const finalH = block.getBoundingClientRect().height
        if (finalH > 0) block.style.minHeight = `${finalH}px`
        else block = null
      }
      tmp.remove()
    }

    let i = 0
    const timer = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        block?.style.removeProperty('min-height')
      }
    }, speed)
    return () => {
      clearInterval(timer)
      block?.style.removeProperty('min-height')
    }
  }, [text, speed])

  return (
    <span className="ba-type" ref={ref}>
      {out}
      <span className="ba-caret" aria-hidden="true" />
    </span>
  )
}
