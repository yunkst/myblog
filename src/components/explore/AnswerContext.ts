import { createContext } from 'react'
import type { ExploreConfig } from '../../lib/types'

/** exploreConfig Context 注入通道（Post.tsx 提供，Answer 消费）。
 * 单独抽出文件避免 Answer.tsx 被 Answer.test.tsx 用 `import Answer, { ExploreConfigContext }`
 * 一并消费时把演出层 useEffect 拉到测试作用域。 */
export const ExploreConfigContext = createContext<ExploreConfig | null>(null)

/** v4（Task 5）幕式导航 Context：ExploreRouter 在 Provider 挂 activeId/goTo/onActivate，
 * Answer/ExitChips 消费——退出演出 IO useEffect、改走路由化跳转。
 *
 * - activeId 当前激活幕 id（与 config.entry 同步初始化，hash 变化时更新）；
 * - goTo(id) 由 ExploreRouter 实现：pushState + setActiveId + history.push；
 * - onActivate(id, skip) 激活的 Answer 通过 Director.onReady 注入 skip
 *   （ExploreRouter 存到 skipRef，点击空白时调）。 */
export interface ExploreRuntime {
  activeId: string
  goTo: (id: string) => void
  onActivate: (id: string, skip: () => void) => void
  /** 本幕（activeId）是否首次激活——false = 回看，Answer 不挂 Director */
  firstActivation: boolean
}

export const ExploreRuntimeContext = createContext<ExploreRuntime | null>(null)