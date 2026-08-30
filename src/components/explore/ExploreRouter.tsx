import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ExploreConfigContext,
  ExploreRuntimeContext,
  type ExploreRuntime,
} from './AnswerContext'
import { useHistoryStack } from './useHistoryStack'
import { readSeenScenes, writeSeenScenes } from './seenScenes'
import HistoryPanel from './HistoryPanel'
import HistoryFAB from './HistoryFAB'
import type { ExploreConfig, ExploreScene } from '../../lib/types'

interface Props {
  config: ExploreConfig
  children: ReactNode
}

/** 从 URL hash 解析当前幕（无效 hash 回落 entry）。SSR/无 window 安全。 */
function currentSceneId(config: ExploreConfig): string {
  if (typeof window === 'undefined') return config.entry
  const h = window.location.hash.replace(/^#/, '')
  if (h && config.scenes.some((s) => s.id === h)) return h
  return config.entry
}

/** spec §3.3：点空白处调 skip——交互元素不触发。 */
const SKIP_IGNORE_SELECTOR = 'a, button, [role="button"], .scene-replay, .chip-prefix, .history-fab, .history-panel'

/**
 * v4 探索视图路由器（plan Task 5）。
 *
 * 职责：
 * - hash 监听（双向：用户改 URL / goTo 出口点击 / popstate）→ setActiveId；
 * - 履历栈（useHistoryStack）：goTo 时 push；back() pop；面板 jumpTo 截断；
 * - 已看幕集合（seenScenes）：firstActivation=true 时 Director 挂演出、回看不挂；
 * - FAB + 履历面板挂载；
 * - 容器 onClick 非交互目标 → 调激活幕注入的 skip（Director.onReady 注入）；
 * - Esc 关闭履历面板（Task 2 评审遗留）。
 *
 * 出幕主线/支线（在 HistoryPanel slot 里渲染）：yaml 顺序下一幕 = 主线，其余 features/questions = 支线。
 *
 * Provider 嵌套：ExploreConfigContext 包外、ExploreRuntimeContext 包内——
 * Answer 既能读 exploreConfig 也能读 runtime。
 */
export function ExploreRouter({ config, children }: Props) {
  const [activeId, setActiveId] = useState(() => currentSceneId(config))
  const [panelOpen, setPanelOpen] = useState(false)
  const [firstActivation, setFirstActivation] = useState<Record<string, boolean>>(() => {
    const seen = readSeenScenes(config.title)
    const init: Record<string, boolean> = {}
    for (const s of config.scenes) init[s.id] = !seen.has(s.id)
    return init
  })
  const history = useHistoryStack(config.title)
  const skipRef = useRef<() => void>(() => {})
  const seenRef = useRef<Set<string>>(readSeenScenes(config.title))
  /** 履历栈 ref（用于 jumpTo 同步取最新栈顶——见 jumpTo 实现注释） */
  const stackRef = useRef(history.stack)
  useEffect(() => { stackRef.current = history.stack }, [history.stack])
  /** activeId ref（goTo 判重用——副作用不能放 setState updater，StrictMode 会 double-invoke） */
  const activeIdRef = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  /* 初次挂载：推 entry、给 main 加 data-has-router、body 加 stage-locked */
  useEffect(() => {
    if (history.stack.length === 0) history.push(activeId)
    if (!seenRef.current.has(activeId)) {
      seenRef.current.add(activeId)
      writeSeenScenes(config.title, seenRef.current)
    }
    document.querySelector('main.post-wrap--stage')?.setAttribute('data-has-router', '')
    document.body.classList.add('stage-locked')
    return () => {
      document.body.classList.remove('stage-locked')
      document.querySelector('main.post-wrap--stage')?.removeAttribute('data-has-router')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* hash 监听：用户手动改 URL / 浏览器前进后退——只 setActiveId，不入履历栈
   * （履历栈只反映用户的显式 goTo）。 */
  useEffect(() => {
    const onHash = () => {
      const next = currentSceneId(config)
      setActiveId((prev) => (prev === next ? prev : next))
      if (!seenRef.current.has(next)) {
        seenRef.current.add(next)
        writeSeenScenes(config.title, seenRef.current)
        setFirstActivation((m) => (m[next] ? m : { ...m, [next]: true }))
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  /* Esc 关闭面板（Task 2 carry） */
  useEffect(() => {
    if (!panelOpen) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const goTo = useCallback((id: string) => {
    if (activeIdRef.current === id) return
    activeIdRef.current = id
    window.history.pushState(null, '', `#${id}`)
    history.push(id)
    setActiveId(id)
    if (!seenRef.current.has(id)) {
      seenRef.current.add(id)
      writeSeenScenes(config.title, seenRef.current)
      setFirstActivation((m) => (m[id] ? m : { ...m, [id]: true }))
    }
    setPanelOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history])

  const back = useCallback(() => {
    const prev = history.pop()
    if (prev) {
      window.history.pushState(null, '', `#${prev}`)
      setActiveId(prev)
      setPanelOpen(false)
    }
  }, [history])

  const jumpTo = useCallback((idx: number) => {
    history.jumpTo(idx)
    /* jumpTo 内部 setStack 是异步的——用同步维护的 ref 读截断后的栈顶 */
    const last = stackRef.current[idx]?.sceneId ?? config.entry
    window.history.pushState(null, '', `#${last}`)
    setActiveId(last)
    setPanelOpen(false)
  }, [history, config.entry])

  const onActivate = useCallback((id: string, skip: () => void) => {
    if (id !== activeId) return
    skipRef.current = skip
  }, [activeId])

  const runtime = useMemo<ExploreRuntime>(() => ({
    activeId,
    goTo,
    onActivate,
    firstActivation: !!firstActivation[activeId],
  }), [activeId, goTo, onActivate, firstActivation])

  /* 出幕主线/支线（HistoryPanel slot 渲染）：yaml 顺序下一幕 = 主线；features/questions = 支线 */
  const exitsWithMain = useMemo(() => {
    const idx = config.scenes.findIndex((s) => s.id === activeId)
    const scene = idx >= 0 ? config.scenes[idx] : null
    const next: ExploreScene | undefined = idx >= 0 ? config.scenes[(idx + 1) % config.scenes.length] : undefined
    const main = next ? [{ text: `▸ 继续：${next.label}`, to: next.id, main: true }] : []
    return [
      ...main,
      ...(scene?.features ?? []),
      ...(scene?.questions ?? []),
    ]
  }, [activeId, config])

  return (
    <ExploreConfigContext.Provider value={config}>
      <ExploreRuntimeContext.Provider value={runtime}>
        <div
          className="explore-router"
          onClick={(e) => {
            if ((e.target as Element).closest(SKIP_IGNORE_SELECTOR)) return
            skipRef.current()
          }}
        >
          {children}
          <HistoryFAB stack={history.stack} onBack={back} onOpenPanel={() => setPanelOpen(true)} />
          <HistoryPanel open={panelOpen} onClose={() => setPanelOpen(false)}
            stack={history.stack} onJumpTo={jumpTo}>
            <div className="exits-tree">
              <span className="history-panel__sub">─ 主线/支线 ─</span>
              <ul className="exits-tree__list">
                {exitsWithMain.filter((e): e is { text: string; to: string } & { main?: boolean } => typeof e.to === 'string').map((e, i) => (
                  <li key={`${e.text}-${i}`}>
                    <a href={`#${e.to}`}
                      onClick={(ev) => { ev.preventDefault(); goTo(e.to) }}>
                      {e.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </HistoryPanel>
        </div>
      </ExploreRuntimeContext.Provider>
    </ExploreConfigContext.Provider>
  )
}