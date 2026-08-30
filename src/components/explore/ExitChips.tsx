import { useContext } from 'react'
import type { ExploreConfig, ExploreExit } from '../../lib/types'
import { resolveExploreHref } from '../../lib/explore'
import { ExploreRuntimeContext } from './AnswerContext'

interface Props {
  group: 'features' | 'questions'
  exits: ExploreExit[]
  config: ExploreConfig
}

/** 场景下方出口按钮组。
 * v4（Task 5）：本地跳转不再 scrollIntoView，改走 ExploreRouter.goTo
 * （pushState + 激活 + 履历入栈）；跨文章照旧 `<a href>` 整页跳转。
 * v3 chip 文本前装饰前缀——features ▸、questions ？（aria-hidden，纯视觉）。 */
export default function ExitChips({ group, exits, config }: Props) {
  const runtime = useContext(ExploreRuntimeContext)
  if (exits.length === 0) return null
  const prefix = group === 'features' ? '▸' : '？'
  return (
    <div className={`exit-chips exit-chips-${group}`}>
      {exits.map((e) => {
        if (typeof e.to === 'string') {
          const id = e.to
          return (
            <a key={e.text} className="exit-chip" href={`#${id}`}
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
          <a key={e.text} className="exit-chip" href={resolveExploreHref(e.to, config)}>
            <span className="chip-prefix" aria-hidden="true">{prefix}</span>
            {e.text} →
          </a>
        )
      })}
    </div>
  )
}