import { useCallback, useEffect, useRef, useState } from 'react'

export interface HistoryEntry {
  sceneId: string
}

const KEY = (k: string) => `explore.history.${k}`

/**
 * 探索视图的履历栈（v4）。
 * - 持久化到 sessionStorage，跨组件同 key 共享。
 * - push(sceneId) → 入栈；pop() → 同步返回退到的前一项 sceneId 并移除栈顶
 *   （栈长 ≤ 1 时返回 undefined 且不变）；Task 5 的 back() 依赖同步返回值。
 * - jumpTo(idx) → 截断到 idx（含）；canPop = stack.length > 1。
 * - 作用域键：每个 explore 配置（按 title）独立一份栈。
 */
export function useHistoryStack(storageKey: string) {
  const [stack, setStack] = useState<HistoryEntry[]>(() => {
    if (typeof sessionStorage === 'undefined') return []
    try {
      const raw = sessionStorage.getItem(KEY(storageKey))
      return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
    } catch {
      return []
    }
  })
  // stackRef 是可变操作的真相源：pop() 需要同步返回值，且同一事件里
  // 连续 push/pop 时 functional setState 的队列语义会取到旧快照
  const stackRef = useRef<HistoryEntry[]>(stack)
  const commit = useCallback((next: HistoryEntry[]) => {
    stackRef.current = next
    setStack(next)
  }, [])
  useEffect(() => { stackRef.current = stack }, [stack])

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(KEY(storageKey), JSON.stringify(stack))
  }, [stack, storageKey])

  const push = useCallback((sceneId: string) => {
    commit([...stackRef.current, { sceneId }])
  }, [commit])

  const pop = useCallback((): string | undefined => {
    const current = stackRef.current
    if (current.length <= 1) return undefined
    const prevId = current[current.length - 2].sceneId
    commit(current.slice(0, -1))
    return prevId
  }, [commit])

  const jumpTo = useCallback((idx: number) => {
    const current = stackRef.current
    commit(idx < 0 ? [] : current.slice(0, idx + 1))
  }, [commit])

  return { stack, push, pop, jumpTo, canPop: stack.length > 1 }
}
