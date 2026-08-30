import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStack } from './useHistoryStack'

describe('useHistoryStack', () => {
  beforeEach(() => sessionStorage.clear())

  it('初始空栈', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    expect(result.current.stack).toEqual([])
    expect(result.current.canPop).toBe(false)
  })

  it('push 1 项 canPop=false（栈底无前身），push 2 项后 canPop=true', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => result.current.push('q-problem'))
    expect(result.current.stack).toEqual([{ sceneId: 'q-problem' }])
    // 与 pop 守卫、StageNav canBack 同一语义：栈长 > 1 才可退
    expect(result.current.canPop).toBe(false)
    act(() => result.current.push('q-second'))
    expect(result.current.canPop).toBe(true)
  })

  it('pop 在栈长 ≤ 1 时返回 undefined 且栈不变', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => result.current.push('only'))
    let popped: string | undefined
    act(() => { popped = result.current.pop() })
    expect(popped).toBeUndefined()
    expect(result.current.stack.map((s) => s.sceneId)).toEqual(['only'])
  })

  it('pop 返回前一项并从栈移除', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => { result.current.push('a'); result.current.push('b') })
    let popped: string | undefined
    act(() => { popped = result.current.pop() })
    expect(popped).toBe('a')
    expect(result.current.stack.map((s) => s.sceneId)).toEqual(['a'])
  })

  it('jumpTo(idx) 截断栈到该位置', () => {
    const { result } = renderHook(() => useHistoryStack('test'))
    act(() => { result.current.push('a'); result.current.push('b'); result.current.push('c') })
    act(() => result.current.jumpTo(0))
    expect(result.current.stack.map((s) => s.sceneId)).toEqual(['a'])
  })

  it('sessionStorage 往返：两个 useHistoryStack 同 key 共享栈', () => {
    const { result: r1 } = renderHook(() => useHistoryStack('test'))
    act(() => r1.current.push('a'))
    const { result: r2 } = renderHook(() => useHistoryStack('test'))
    expect(r2.current.stack.map((s) => s.sceneId)).toEqual(['a'])
  })

  it('reset(sceneId)：清空旧栈 + 推入新项 + 同步写 sessionStorage（C1 fix round）', () => {
    // 预置残留：模拟上次会话留下的栈
    sessionStorage.setItem('explore.history.test', JSON.stringify([{ sceneId: 'old-stale' }]))
    const { result } = renderHook(() => useHistoryStack('test'))
    // 重置为本会话的当前幕 → 栈只剩 1 项（自身）、无残留
    act(() => result.current.reset('fresh'))
    expect(result.current.stack).toEqual([{ sceneId: 'fresh' }])
    // 同步落 sessionStorage（即使 storage effect 还没跑，新 key 也可读出）
    expect(JSON.parse(sessionStorage.getItem('explore.history.test')!)).toEqual([{ sceneId: 'fresh' }])
    // canPop 仍为 false（栈长=1）
    expect(result.current.canPop).toBe(false)
  })
})
