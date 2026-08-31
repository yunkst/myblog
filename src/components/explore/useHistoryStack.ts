import { useCallback, useEffect, useRef, useState } from 'react'

export interface HistoryEntry {
  sceneId: string
}

const KEY = (k: string) => `explore.history.${k}`
/** v6 路线图：已读集合独立持久化（不受栈截断影响） */
const VKEY = (k: string) => `explore.visited.${k}`

/**
 * 探索视图的履历栈（v4）。
 * - 持久化到 sessionStorage，跨组件同 key 共享。
 * - push(sceneId) → 入栈；pop() → 同步返回退到的前一项 sceneId 并移除栈顶
 *   （栈长 ≤ 1 时返回 undefined 且不变）；Task 5 的 back() 依赖同步返回值。
 * - jumpTo(idx) → 截断到 idx（含）；canPop = stack.length > 1。
 * - 作用域键：每个 explore 配置（按 title）独立一份栈。
 *
 * v6 路线图：新增 visited（已读幕 id 集合）——
 * 栈是「本次会话的点击路径」（jumpTo/pop 会截断），不能回答「看过什么」；
 * visited 只增不减（reset 也不清），会话内累计，供路线图三态（◉ 已读）用。
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
  const [visited, setVisited] = useState<string[]>(() => {
    if (typeof sessionStorage === 'undefined') return []
    try {
      const raw = sessionStorage.getItem(VKEY(storageKey))
      return raw ? (JSON.parse(raw) as string[]) : []
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

  /* visited：与 stackRef 同构的 ref 真相源（push/reset 同一事件里连续调用时取最新值） */
  const visitedRef = useRef<string[]>(visited)
  const commitVisited = useCallback((next: string[]) => {
    visitedRef.current = next
    setVisited(next)
  }, [])
  useEffect(() => { visitedRef.current = visited }, [visited])

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(KEY(storageKey), JSON.stringify(stack))
  }, [stack, storageKey])

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(VKEY(storageKey), JSON.stringify(visited))
  }, [visited, storageKey])

  /** 已读集合只增不减（幂等）。pop/jumpTo/reset 都不走这里——回看不等于没看过。 */
  const markVisited = useCallback((sceneId: string) => {
    if (visitedRef.current.includes(sceneId)) return
    commitVisited([...visitedRef.current, sceneId])
  }, [commitVisited])

  const push = useCallback((sceneId: string) => {
    commit([...stackRef.current, { sceneId }])
    markVisited(sceneId)
  }, [commit, markVisited])

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

  /**
   * 清空栈 + 推入 sceneId + 同步写 sessionStorage。
   * 用于 ExploreRouter mount effect：跨会话残留旧栈会污染 ◀ 返回语义，
   * 必须无条件以「当前激活幕」初始化本会话栈（C1 fix round）。
   */
  const reset = useCallback((sceneId: string) => {
    const next: HistoryEntry[] = [{ sceneId }]
    commit(next)
    markVisited(sceneId)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(KEY(storageKey), JSON.stringify(next))
    }
  }, [commit, markVisited, storageKey])

  return { stack, push, pop, jumpTo, reset, canPop: stack.length > 1, visited }
}
