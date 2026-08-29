import { useEffect, useRef } from 'react'
import type {} from 'gsap'
import type { Scene } from './SceneController'
import { createDemoHandle } from './SceneController'

/* 与 v1 同一 glob 手法，但消费 demos 字典而非 default Scene */
const demoModules = import.meta.glob<{ demos: Record<string, Scene> }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

/** 按 slug 反查该文章 demos 模块；找不到返回 null。 */
function moduleForSlug(slug: string | null) {
  if (!slug) return null
  const key = Object.keys(demoModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  return key ? demoModules[key] : null
}

/**
 * SSG/SSR 同步反查 slug：Post.tsx 渲染 main[data-article-slug] 时，
 * 同步把 slug 写进 module-level 状态；SceneClip 在 render 期同步读。
 * 这保证 SSR 输出的 HTML 与 hydration 期望完全一致（避免 React hydration mismatch）。
 *
 * 客户端 hydration 完成后这个值会被清掉（避免污染别的页面）——但同一文章内
 * SceneClip 多次渲染期间必须保持。
 */
let currentSlug: string | null = null
export function setCurrentSlug(slug: string | null) {
  currentSlug = slug
}

/**
 * v2：唯一 demo 播放入口（spec §4.3）。
 *
 * 实现要点：
 * - slug 同步反查：渲染期读模块级 currentSlug（Post.tsx 同步设置）。
 * - Stage 必须由本组件渲染进容器：GSAP 靠选择器找 DOM。
 * - 然后 useEffect 里 build timeline + 视口观察（仅浏览器端有 IntersectionObserver）。
 * - 首次进入视口（threshold 0.3）：自动 play；播完停终态
 * - 离开视口：未播完则 pause；再进入从未播完处继续
 * - 播完后渲染 ↻ 重看按钮；点击 replay()
 * - reduced-motion：play() 直达终态（createDemoHandle 内处理）
 * - demo 不存在（yaml/正文引用了未定义的键）：空容器降级，控制台 warn
 */
export default function SceneClip({ demo }: { demo: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const scene = moduleForSlug(currentSlug)?.demos?.[demo] ?? null
  if (!scene && currentSlug && typeof console !== 'undefined') {
    console.warn(`[SceneClip] ${currentSlug} 没有 demo "${demo}"`)
  }

  // Stage 挂载后 build timeline + 视口观察（仅浏览器）
  useEffect(() => {
    const cur = scene
    const el = ref.current
    if (!cur || !el) return
    if (typeof IntersectionObserver === 'undefined') return

    const tl = cur.build()
    tl.eventCallback('onComplete', () => el.setAttribute('data-finished', ''))
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

  const Stage = scene?.Stage
  return (
    <div ref={ref} className="scene-clip" data-scene-clip-demo={demo} aria-label={`动画：${demo}`}>
      {Stage && <Stage />}
      <button ref={btnRef} type="button" className="scene-replay" aria-label="重看">↻ 重看</button>
    </div>
  )
}
