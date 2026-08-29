import { useEffect, useRef, useState } from 'react'
import type { Scene, SceneHandle } from './SceneController'
import { createSceneHandle } from './SceneController'
import { SceneCtx } from './SceneContext'

interface Props {
  scene: Scene
  /** 可选：进入页面默认 seek 到的 label */
  seekTo?: string
  onReady?: (h: SceneHandle) => void
  children?: (containerRef: React.RefObject<HTMLDivElement | null>) => React.ReactNode
}

/**
 * 挂 scene，把 SceneHandle 通过 context 下发给子树（问题树）。
 * - unmount 时 kill timeline，防 GSAP 全局引用泄漏（spec §6.3）
 * - prefers-reduced-motion 时跳到 seekTo 终态，不放动画
 */
export default function SceneStage({ scene, seekTo, onReady, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [handle, setHandle] = useState<SceneHandle | null>(null)

  useEffect(() => {
    const tl = scene.build()
    const h = createSceneHandle(tl, scene.focusable)
    // 初始：暂停 + 默认 seek（探索模式是读者驱动，不自动播放；spec §6.3）
    h.pause()
    if (seekTo) h.seek(seekTo)
    setHandle(h)
    onReady?.(h)
    return () => { h.kill() }
    // 只在 mount 时构造一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className="scene-stage">
      <SceneCtx.Provider value={handle}>
        {children ? children(containerRef) : null}
      </SceneCtx.Provider>
    </div>
  )
}
