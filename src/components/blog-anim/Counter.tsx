import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

interface Props {
  from: number
  to: number
  suffix?: string
  label?: string
  duration?: number
}

export default function Counter({ from, to, suffix = '', label, duration = 1.4 }: Props) {
  const numRef = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(from)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setValue(to); return }
    const obj = { n: from }
    const tween = gsap.to(obj, {
      n: to,
      duration,
      ease: 'power3.out',
      onUpdate: () => setValue(Math.round(obj.n)),
    })
    return () => { tween.kill() }
  }, [from, to, duration])

  return (
    <span className="ba-counter">
      <span ref={numRef} className="ba-counter-num">{value.toLocaleString()}</span>
      <span className="ba-counter-suffix">{suffix}</span>
      {label && <span className="ba-counter-label"> · {label}</span>}
    </span>
  )
}
