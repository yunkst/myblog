import { useContext } from 'react'
import type { ExploreConfig, ExploreExit } from '../../lib/types'
import { resolveExploreHref } from '../../lib/explore'
import { ExploreRuntimeContext } from './AnswerContext'

interface Props {
  group: 'features' | 'questions'
  exits: ExploreExit[]
  config: ExploreConfig
  /** 本组在当前幕出口平铺序（features→questions）中的起始下标——键盘焦点态判定用（v5 Task 3） */
  baseIdx: number
}

/** 场景下方出口按钮组。
 * v4（Task 5）：本地跳转不再 scrollIntoView，改走 ExploreRouter.goTo
 * （pushState + 激活 + 履历入栈）；跨文章照旧 `<a href>` 整页跳转。
 * v3 chip 文本前装饰前缀——features ▸、questions ？（aria-hidden，纯视觉）。
 * v5（Task 3）：runtime.focusedExitIdx === baseIdx + i 的 chip 挂 exit-chip--focused
 * （键盘 ↑↓ 循环焦点、Enter 跳转的可视反馈）。 */
export default function ExitChips({ group, exits, config, baseIdx }: Props) {
  const runtime = useContext(ExploreRuntimeContext)
  if (exits.length === 0) return null
  const prefix = group === 'features' ? '▸' : '？'
  return (
    <div className={`exit-chips exit-chips-${group}`}>
      {exits.map((e, i) => {
        const focused = runtime?.focusedExitIdx === baseIdx + i ? ' exit-chip--focused' : ''
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
              <span className="chip-prefix" aria-hidden="true">{prefix}</span>
              {e.text} →
            </a>
          )
        }
        return (
          <a key={e.text} className={`exit-chip${focused}`} href={resolveExploreHref(e.to, config)}>
            <span className="chip-prefix" aria-hidden="true">{prefix}</span>
            {e.text} →
          </a>
        )
      })}
    </div>
  )
}