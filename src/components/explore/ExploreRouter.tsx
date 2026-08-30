import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ExploreConfigContext,
  ExploreRuntimeContext,
  type ExploreRuntime,
} from './AnswerContext'
import { useHistoryStack } from './useHistoryStack'
import { readSeenScenes, writeSeenScenes } from './seenScenes'
import HistoryPanel from './HistoryPanel'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { resolveExploreHref } from '../../lib/explore'
import type { ExploreConfig, ExploreScene } from '../../lib/types'

interface Props {
  config: ExploreConfig
  children: ReactNode
  /** Stage 传入的退出回调：面板开则关面板，否则调 onExit（useKeyboardShortcuts onEsc 接管） */
  onExit?: () => void
}

/** 从 URL hash 解析当前幕（无效 hash 回落 entry）。SSR/无 window 安全。 */
function currentSceneId(config: ExploreConfig): string {
  if (typeof window === 'undefined') return config.entry
  const h = window.location.hash.replace(/^#/, '')
  if (h && config.scenes.some((s) => s.id === h)) return h
  return config.entry
}

/** spec §3.3：点空白处调 skip——交互元素不触发。 */
const SKIP_IGNORE_SELECTOR = 'a, button, [role="button"], .scene-replay, .chip-prefix, .stage-nav, .history-panel'

/**
 * v4 探索视图路由器（plan Task 5）。
 *
 * 职责：
 * - hash 监听（双向：用户改 URL / goTo 出口点击 / popstate）→ setActiveId；
 * - 履历栈（useHistoryStack）：goTo 时 push；back() pop；面板 jumpTo 截断；
 * - 已看幕集合（seenScenes）：firstActivation=true 时 Director 挂演出、回看不挂；
 * - FAB + 履历面板挂载；
 * - 容器 onClick 非交互目标 → 调激活幕注入的 skip（Director.onReady 注入）；
 * - 键盘接线（v5 Task 3，spec §3.2）：useKeyboardShortcuts——← → 切幕、↑↓ 焦点出口、
 *   Enter 跳转、Esc 关面板或退出；面板开时非 Esc 键失效。
 *
 * 出幕主线/支线（在 HistoryPanel slot 里渲染）：yaml 顺序下一幕 = 主线，其余 features/questions = 支线。
 *
 * Provider 嵌套：ExploreConfigContext 包外、ExploreRuntimeContext 包内——
 * Answer 既能读 exploreConfig 也能读 runtime。
 */
export function ExploreRouter({ config, children, onExit }: Props) {
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
  /** Stage onExit ref（模式同 skipRef/stackRef）：useRef(onExit) + useEffect 同步最新值 */
  const onExitRef = useRef(onExit)
  useEffect(() => { onExitRef.current = onExit }, [onExit])
  /** 履历栈 ref（用于 jumpTo 同步取最新栈顶——见 jumpTo 实现注释） */
  const stackRef = useRef(history.stack)
  useEffect(() => { stackRef.current = history.stack }, [history.stack])
  /** activeId ref（goTo 判重用——副作用不能放 setState updater，StrictMode 会 double-invoke） */
  const activeIdRef = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  /** panelOpen ref（useKeyboardShortcuts onEsc 用——handlers 走 ref 不重挂，需同步取最新面板态） */
  const panelOpenRef = useRef(panelOpen)
  useEffect(() => { panelOpenRef.current = panelOpen }, [panelOpen])

  /* 初次挂载：无条件以 activeId 重置履历栈 + 给 main 加 data-has-router + body 加 stage-locked
   * （C1 fix round：sessionStorage 残留旧栈会让 ◀ 返回跳到上次会话的旧幕，
   *  履历栈语义是「本次会话的点击路径」，跨会话残留必须清空） */
  useEffect(() => {
    history.reset(activeId)
    if (!seenRef.current.has(activeId)) {
      seenRef.current.add(activeId)
      writeSeenScenes(config.title, seenRef.current)
    }
    document.querySelector('main.stage-frame, main.post-wrap--stage')?.setAttribute('data-has-router', '')
    document.body.classList.add('stage-locked')
    return () => {
      document.body.classList.remove('stage-locked')
      document.querySelector('main.stage-frame, main.post-wrap--stage')?.removeAttribute('data-has-router')
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

  /* v5 键盘接线（spec §3.2）：
   * - ← → 主线上一/下一幕；↑↓ 焦点出口循环；Enter 跳到焦点；Esc 关面板或退出。
   * - 面板开时非 Esc 键失效（hook enabled=false），Esc 始终活着——保证面板可关。
   * - handlers 走 ref 同步取最新 activeId/panelOpen（hook 已用 ref.current 转发）。 */
  const [focusedExitIdx, setFocusedExitIdx] = useState<number | null>(null)
  /* 切幕时清焦点：避免上一幕的 idx 落到新幕出口数组中越界 */
  useEffect(() => { setFocusedExitIdx(null) }, [activeId])

  /* 当前幕出口平铺序：features → questions（与 Answer.tsx 渲染顺序一致）。
   * 跨文章目标（to: { post, scene }）保留原形态，Enter 调 window.location.assign 整页跳。 */
  const flatExits = useMemo(() => {
    const idx = config.scenes.findIndex((s) => s.id === activeId)
    const scene = idx >= 0 ? config.scenes[idx] : null
    return [...(scene?.features ?? []), ...(scene?.questions ?? [])]
  }, [activeId, config])

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

  /* activeIdRef 守卫替代闭包依赖：onActivate 引用稳定，
   * 跳幕时不因 onActivate 新引用把 runtime（连带全部 Answer）拉进重渲染（T5 评审 I1） */
  const onActivate = useCallback((id: string, skip: () => void) => {
    if (id !== activeIdRef.current) return
    skipRef.current = skip
  }, [])

  /* v5 键盘接线（spec §3.2）：
   * - ← → 主线上一/下一幕；↑↓ 焦点出口循环；Enter 跳到焦点；Esc 关面板或退出。
   * - 面板开时非 Esc 键失效（hook enabled=false），Esc 始终活着——保证面板可关。
   * - handlers 走 ref 同步取最新 activeId/panelOpen（hook 已用 ref.current 转发）。 */
  useKeyboardShortcuts({
    onBack: () => back(),
    onNext: () => {
      const idx = config.scenes.findIndex((s) => s.id === activeIdRef.current)
      if (idx >= 0) goTo(config.scenes[(idx + 1) % config.scenes.length].id)
    },
    onArrowUp: () => setFocusedExitIdx((i) =>
      flatExits.length === 0 ? null : ((i ?? 0) - 1 + flatExits.length) % flatExits.length),
    onArrowDown: () => setFocusedExitIdx((i) =>
      flatExits.length === 0 ? null : ((i ?? -1) + 1) % flatExits.length),
    onEnter: () => {
      if (focusedExitIdx == null || !flatExits[focusedExitIdx]) return
      const to = flatExits[focusedExitIdx].to
      if (typeof to === 'string') goTo(to)
      else window.location.assign(resolveExploreHref(to, config))
    },
    onEsc: () => (panelOpenRef.current ? setPanelOpen(false) : onExitRef.current?.()),
  }, !panelOpen)

  const runtime = useMemo<ExploreRuntime>(() => ({
    activeId,
    goTo,
    onActivate,
    firstActivation: !!firstActivation[activeId],
    back,
    canBack: history.stack.length > 1,
    panelOpen,
    setPanelOpen,
    /* Esc 处理已由 useKeyboardShortcuts.onEsc 接管（T2 临时内联分支删除）；
     * runtime.onExit 保留为 Stage 直接退出入口（面板/Esc 决策只在 hook 一处）。 */
    onExit: () => onExitRef.current?.(),
    focusedExitIdx,
  }), [activeId, goTo, onActivate, firstActivation, back, history.stack.length, panelOpen, focusedExitIdx])

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

  /* v5 动作镜像（HistoryPanel props）：从 activeId 算主线下一幕的 id 与 label */
  const nextSceneId = useMemo(() => {
    const idx = config.scenes.findIndex((s) => s.id === activeId)
    if (idx < 0) return null
    const next = config.scenes[(idx + 1) % config.scenes.length]
    return next?.id ?? null
  }, [activeId, config])
  const nextSceneLabel = useMemo(() => {
    const idx = config.scenes.findIndex((s) => s.id === activeId)
    if (idx < 0) return ''
    const next = config.scenes[(idx + 1) % config.scenes.length]
    return next?.label ?? ''
  }, [activeId, config])

  return (
    <ExploreConfigContext.Provider value={config}>
      <ExploreRuntimeContext.Provider value={runtime}>
        <div
          className="explore-router"
          onClick={(e) => {
            // 文本选择守卫：拖选文字复制时 mousedown→mouseup 会触发 click，
            // 误触 skip。getSelection 非空说明用户在做选区动作，放弃本次 skip（I3 fix round）。
            if (typeof window !== 'undefined' && window.getSelection?.()?.toString() !== '') return
            if ((e.target as Element).closest(SKIP_IGNORE_SELECTOR)) return
            skipRef.current()
          }}
        >
          {children}
          <HistoryPanel open={panelOpen} onClose={() => setPanelOpen(false)}
            stack={history.stack} onJumpTo={jumpTo}
            canBack={history.stack.length > 1}
            onBack={back}
            nextLabel={`⏵ 继续：${nextSceneLabel}`}
            onNext={() => nextSceneId && goTo(nextSceneId)}
            onExit={() => { setPanelOpen(false); onExitRef.current?.() }}>
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