import type { ExploreConfig, ExploreExit } from '../../lib/types'
import { resolveExploreHref } from '../../lib/explore'

interface Props {
  group: 'features' | 'questions'
  exits: ExploreExit[]
  config: ExploreConfig
}

/** 场景下方出口按钮组。本地：smooth 滚动 + pushState（前进后退可用）；跨文章：整页跳转。 */
export default function ExitChips({ group, exits, config }: Props) {
  if (exits.length === 0) return null
  return (
    <div className={`exit-chips exit-chips-${group}`}>
      {exits.map((e) => {
        if (typeof e.to === 'string') {
          const id = e.to
          return (
            <a key={e.text} className="exit-chip" href={`#${id}`}
              onClick={(ev) => { ev.preventDefault(); history.pushState(null, '', `#${id}`); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}>
              {e.text} →
            </a>
          )
        }
        return (
          <a key={e.text} className="exit-chip" href={resolveExploreHref(e.to, config)}>
            {e.text} →
          </a>
        )
      })}
    </div>
  )
}