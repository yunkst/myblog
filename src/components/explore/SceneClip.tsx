import { useEffect, useRef } from 'react'
import type {} from 'gsap'
import type { Scene } from './SceneController'
import { createDemoHandle } from './SceneController'

/* 与 v1 同一 glob 手法，但消费 demos 字典而非 default Scene */
const demoModules = import.meta.glob<{ demos: Record<string, Scene> }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

function findDemo(slug: string | null, demo: string): Scene | null {
  if (!slug) return null
  const key = Object.keys(demoModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  const mod = key ? demoModules[key] : null
  return mod?.demos?.[demo] ?? null
}

/**
 * v2：唯一 demo 播放入口（spec §4.3）。
 * - slug 反查祖先 [data-article-slug]（沿用 v1 约定）
 * - 首次进入视口（threshold 0.3）：build timeline + 自动 play；播完停终态
 * - 离开视口：未播完则 pause；再进入从未播完处继续
 * - 播完后渲染 ↻ 重看按钮；点击 replay()
 * - reduced-motion：play() 直达终态（createDemoHandle 内处理）
 * - demo 不存在（yaml/正文引用了未定义的键）：空容器降级，控制台 warn
 */
export default function SceneClip({ demo }: { demo: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const host = el.closest('[data-article-slug]')
    const slug = host?.getAttribute('data-article-slug') ?? null
    const scene = findDemo(slug, demo)
    if (!scene) {
      console.warn(`[SceneClip] ${slug} 没有 demo "${demo}"`)
      return
    }

    const tl = scene.build()
    const handle = createDemoHandle(tl)
    let started = false

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          if (!started) { started = true; handle.play() }
          else if (!handle.finished()) handle.play()
        } else if (started && !handle.finished()) {
          handle.pause()
        }
      }
    }, { threshold: 0.3 })

    observer.observe(el)
    const btn = btnRef.current
    btn?.addEventListener('click', handle.replay)

    return () => {
      observer.disconnect()
      btn?.removeEventListener('click', handle.replay)
      handle.kill()
    }
  }, [demo])

  return (
    <div ref={ref} className="scene-clip" data-scene-clip-demo={demo} aria-label={`动画：${demo}`}>
      <button ref={btnRef} type="button" className="scene-replay" aria-label="重看">↻ 重看</button>
    </div>
  )
}
