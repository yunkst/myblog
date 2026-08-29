import { createContext, useContext, useMemo, useRef } from 'react'

export type AnswerMap = Record<string, string>

export interface AnswerCtx {
  /** 注册一个 (id, html) 对；返回注销函数 */
  register(id: string, html: string): () => void
  /** 当前快照（用于 QuestionAnchor 查 label） */
  snapshot(): AnswerMap
  /** 可选：provider 级回调，元素注册时收到 (id, 元素本体)，供父组件观察 */
  onRegister?(id: string, el: HTMLElement): void
}

const Ctx = createContext<AnswerCtx | null>(null)

export function useAnswerContext(): AnswerCtx | null {
  return useContext(Ctx)
}

export default function AnswerProvider({
  children,
  onRegister,
}: {
  children: React.ReactNode
  onRegister?: (id: string, el: HTMLElement) => void
}) {
  const ref = useRef<AnswerMap>({})

  const value = useMemo<AnswerCtx>(
    () => ({
      register(id, html) {
        ref.current[id] = html
        return () => {
          delete ref.current[id]
        }
      },
      snapshot() {
        return { ...ref.current }
      },
      onRegister,
    }),
    [onRegister],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}