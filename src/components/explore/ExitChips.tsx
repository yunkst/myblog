import { useContext, useEffect, useRef, useState } from 'react'
import type { ExploreConfig, ExploreExit } from '../../lib/types'
import { resolveExploreHref, goExternal } from '../../lib/explore'
import { getPost } from '../../lib/content'
import { ExploreRuntimeContext } from './AnswerContext'

interface Props {
  group: 'features' | 'questions'
  exits: ExploreExit[]
  config: ExploreConfig
  /** 本组在当前幕出口平铺序（features→questions）中的起始下标——键盘焦点态判定用（v5 Task 3） */
  baseIdx: number
}

/** 两段式确认自动复原的等待时长（ms）——首次点击后超时未再点即回到普通态 */
const CONFIRM_RESET_MS = 4000

/** 场景下方出口按钮组。
 * v4（Task 5）：本地跳转不再 scrollIntoView，改走 ExploreRouter.goTo
 * （pushState + 激活 + 履历入栈）；跨文章照旧 `<a href>` 整页跳转。
 * v5（Task 3）：runtime.focusedExitIdx === baseIdx + i 的 chip 挂 exit-chip--focused
 * （键盘 ↑↓ 循环焦点、Enter 跳转的可视反馈）。
 * v8：chip 内的 ▸/？ 前缀与尾部 → 移除——分组标签（▸ 深入 / ？ 提问）
 * 由 Answer 的 choices-group-label 承担，chip 只留出口文本。
 * v14（用户裁定）：跨文章出口与本地出口区分——尾部挂「↗ 另一篇」标记
 * （exit-chip--cross），且点击不立即跳转：第一次点击转确认态（警示色 +
 * 「即将跳转到另一篇《标题》· 再点一次确认」），再点才整页跳转，超时复原。
 * 标题经 getPost(slug) 反查 meta.yaml；目录里查不到时回退 slug。 */
export default function ExitChips({ group, exits, config, baseIdx }: Props) {
  const runtime = useContext(ExploreRuntimeContext)
  /* 两段式确认态：记录处于「待确认」的出口平铺序（baseIdx + i），null = 无 */
  const [confirming, setConfirming] = useState<number | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  if (exits.length === 0) return null
  return (
    <div className={`exit-chips exit-chips-${group}`}>
      {exits.map((e, i) => {
        const flatIdx = baseIdx + i
        const focused = runtime?.focusedExitIdx === flatIdx ? ' exit-chip--focused' : ''
        if (typeof e.to === 'string') {
          const id = e.to
          return (
            <a key={e.text} className={`exit-chip${focused}`} href={`#${id}`}
              onClick={(ev) => {
                ev.preventDefault()
                if (runtime?.goTo) runtime.goTo(id)
                else {
                  /* 路由未挂（早期单测）：退回 hash + 滚动（v3 行为） */
                  history.pushState(null, '', `#${id}`)
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
                }
              }}>
              {e.text}
            </a>
          )
        }
        const href = resolveExploreHref(e.to, config)
        const targetTitle = getPost(e.to.post)?.title ?? e.to.post
        const isConfirming = confirming === flatIdx
        return (
          <a
            key={e.text}
            className={`exit-chip exit-chip--cross${isConfirming ? ' exit-chip--confirm' : ''}${focused}`}
            href={href}
            aria-live="polite"
            onClick={(ev) => {
              ev.preventDefault()
              if (resetTimer.current) clearTimeout(resetTimer.current)
              if (isConfirming) {
                setConfirming(null)
                goExternal(href)
              } else {
                setConfirming(flatIdx)
                resetTimer.current = setTimeout(() => setConfirming(null), CONFIRM_RESET_MS)
              }
            }}
          >
            {isConfirming ? `即将跳转到另一篇《${targetTitle}》· 再点一次确认` : e.text}
            <span className="exit-chip-cross" aria-hidden="true">↗ 另一篇</span>
          </a>
        )
      })}
    </div>
  )
}
