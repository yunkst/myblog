import { createContext } from 'react'
import type { ExploreConfig } from '../../lib/types'

/** exploreConfig Context 注入通道（Post.tsx 提供，Answer 消费）。
 * 单独抽出文件避免 Answer.tsx 被 Answer.test.tsx 用 `import Answer, { ExploreConfigContext }`
 * 一并消费时把演出层 useEffect 拉到测试作用域。 */
export const ExploreConfigContext = createContext<ExploreConfig | null>(null)

/** 当前 Answer 场景的 demo 名（v6 review 单源收敛）。
 *
 * Answer 渲染时把自身 scene.demo（来自 yaml scenes[].demo）注入，
 * 幕内的 SceneClip 消费它——q-*.tsx 单幕文件不再写死 `<SceneClip demo="...">`，
 * demo 名只在 yaml 一处声明，杜绝「yaml 改了 demo、q-*.tsx 没跟改」的结构性漂移。
 * 无 Answer 包裹（测试直渲 SceneClip + 显式 demo prop）时为 null，SceneClip 回退读 prop。
 */
export const SceneDemoContext = createContext<string | null>(null)

/** v10：本幕是否处于 Director 演出编排中（perform = 激活且首次激活）。
 *
 * SceneClip 消费它关闭 IntersectionObserver 自动播放——修「mode 2 文字和动画
 * 一起播」：Director 编排期间 demo 只允许经 registry 的 api.play() 触发
 * （mode 1 进场即播 / mode 2 打字机后全屏播），IO 不得抢跑。
 * 非编排场景（flat-post 平铺页 / 回看幕 / reduced-motion / 测试直渲）为 false，
 * IO 自动播放保持原行为。 */
export const SceneDirectedContext = createContext<boolean>(false)

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
  /* v5 新增 */
  /** 栈≤1 no-op；否则 pop + pushState + 切激活 */
  back: () => void
  /** stack.length > 1 */
  canBack: boolean
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  /** Stage 传入的退出回调（ref 透传） */
  onExit: () => void
  /* v5 Task 3：当前幕出口（features→questions 平铺）焦点下标；null = 无焦点。
   * 键盘 ↑↓ 循环切换，Enter 跳到焦点出口。ExitChips 据此给对应 chip 加 exit-chip--focused。 */
  focusedExitIdx: number | null
}

export const ExploreRuntimeContext = createContext<ExploreRuntime | null>(null)