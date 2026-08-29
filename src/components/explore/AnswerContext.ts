import { createContext } from 'react'
import type { ExploreConfig } from '../../lib/types'

/** exploreConfig Context 注入通道（Post.tsx 提供，Answer 消费）。
 * 单独抽出文件避免 Answer.tsx 被 Answer.test.tsx 用 `import Answer, { ExploreConfigContext }`
 * 一并消费时把演出层 useEffect 拉到测试作用域。 */
export const ExploreConfigContext = createContext<ExploreConfig | null>(null)
