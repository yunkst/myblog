import { Outlet } from 'react-router-dom'
import Topbar from './components/Topbar'

export default function App() {
  return (
    <div className="app-shell">
      <Topbar />
      <Outlet />
    </div>
  )
}
