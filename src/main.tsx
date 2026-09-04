import { ViteReactSSG } from 'vite-react-ssg'
import { routes } from './routes'
/* 三层样式：theme = 皮肤（token/主页/版式，使用者定制区）；
 * framework = 引擎（探索舞台/架构图/路线图，通用逻辑）；
 * 文章专属样式在 content/posts/<slug>/post.css，由文章的 scene-stages.tsx 自行 import */
import './styles/theme.css'
import './styles/framework.css'

export const createRoot = ViteReactSSG(
  { routes },
  ({ isClient }) => {
    // MDX 内嵌动画组件通过 registry 提供
    void isClient
  },
)
