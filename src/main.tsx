import { ViteReactSSG } from 'vite-react-ssg'
import { routes } from './routes'
import './styles/global.css'

export const createRoot = ViteReactSSG(
  { routes },
  ({ isClient }) => {
    // MDX 内嵌动画组件通过 registry 提供
    void isClient
  },
)
