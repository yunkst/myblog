import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import ExitChips from './ExitChips'
import type { ExploreConfig } from '../../lib/types'

/**
 * exploreConfig 经 Context 注入（Post.tsx 提供，Answer 消费）——MDX 端只写
 * `<Answer id="...">`，chips 由 Answer 依据 yaml scenes[].id === props.id 自动渲染，
 * 文案只在 yaml 一处（spec §1 三铁律「内容只写一遍」）。
 */
export const ExploreConfigContext = createContext<ExploreConfig | null>(null)

/**
 * v2：原位渲染块。阅读与探索是同一页面的两种用法，Answer 不再有
 * "注册到 Provider、被探索面板抽取"的第二渲染路径——id 即锚点，
 * 场景目录 / 出口 chips / 首页悬念按钮都指向 #<id>。
 */
export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  const config = useContext(ExploreConfigContext)
  const scene = config?.scenes.find((s) => s.id === id)
  return (
    <div className="answer-block" id={id}>
      {children}
      {scene && (scene.features?.length || scene.questions?.length) ? (
        <div className="answer-exits">
          <ExitChips group="features" exits={scene.features ?? []} config={config!} />
          <ExitChips group="questions" exits={scene.questions ?? []} config={config!} />
        </div>
      ) : null}
    </div>
  )
}