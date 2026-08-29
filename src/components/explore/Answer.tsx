import { useEffect, useRef } from 'react'
import { useAnswerContext } from './AnswerProvider'

interface Props {
  id?: string
  children: React.ReactNode
}

/**
 * 同一段 children，两个视图各自渲染：
 * - 阅读视图：照常渲染为正文流（左侧标记线是 CSS 的事，不在组件里）。
 * - 探索视图：把元素自身的 innerHTML 注册到 AnswerMap，问题树点击时取出展示。
 * id 缺省时只渲染（探索视图无法引用），控制台打 warning。
 */
export default function Answer({ id, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useAnswerContext()

  useEffect(() => {
    if (!id || !ref.current || !ctx) return
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      console.warn(`[Answer] id 非法 "${id}"（只允许小写字母、数字、连字符）`)
      return
    }
    const html = ref.current.innerHTML
    const unregister = ctx.register(id, html)
    ctx.onRegister?.(id, ref.current)
    return unregister
  }, [id, ctx])

  if (!id) {
    if (typeof console !== 'undefined') console.warn('[Answer] 缺 id，正文可读但探索视图无法引用')
  }

  return (
    <div ref={ref} className="post-answer" data-answer-id={id || undefined}>
      {children}
    </div>
  )
}