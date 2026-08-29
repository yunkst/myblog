import type { ExploreConfig, ExploreScene } from '../../lib/types'

function scrollTo(id: string, e?: React.MouseEvent) {
  e?.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 右侧悬浮场景目录（桌面）+ 顶部折叠目录（移动）。顺序 = yaml 场景顺序。不改 hash。 */
export default function SceneToc({ config }: { config: ExploreConfig | null }) {
  if (!config) return null
  const items = (s: ExploreScene) => (
    <li key={s.id}>
      <a href={`#${s.id}`} onClick={(e) => scrollTo(s.id, e)}>{s.label}</a>
    </li>
  )
  return (
    <>
      <nav className="scene-toc" aria-label="场景目录"><ul>{config.scenes.map(items)}</ul></nav>
      <details className="scene-toc-mobile">
        <summary>场景目录</summary>
        <ul>{config.scenes.map(items)}</ul>
      </details>
    </>
  )
}