import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  speed?: number // ms/字
}

export default function Typewriter({ text, speed = 55 }: Props) {
  const [out, setOut] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setOut(text); return }
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <span className="ba-type">
      {out}
      <span className="ba-caret" aria-hidden="true" />
    </span>
  )
}
