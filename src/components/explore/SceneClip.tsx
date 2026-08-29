import { useEffect, useRef } from 'react'
import type {} from 'gsap' // 加载 gsap 全局类型 namespace（declare namespace gsap）
import type { Scene } from './SceneController'

interface Props {
  from: string
}

/* 构建期：所有文章目录下的 scene.tsx 都编译进来（与 Explore.tsx 同一份 glob 的复制）。
 * eager 是为了 SSR 同步可用。文章没建 scene.tsx 时该 key 不存在 → 降级为空容器。 */
const sceneModules = import.meta.glob<{ default: Scene }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

function findSceneForSlug(slug: string | null): Scene | null {
  if (!slug) return null
  const key = Object.keys(sceneModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  return sceneModules[key].default
}

/**
 * 阅读视图里的动画嵌入（Task 8：GSAP 时间线截断）。
 *
 * - slug 来源：反查祖先节点的 data-article-slug（Task 7 约定，Post.tsx <main> 上；
 *   单一真理，本组件不做路由识别）。
 * - 进入视口（threshold 0.3）时播放 scene timeline 的 [from, nextLabel) 段：
 *   seek 到 from 起播，setTimeout 到段末 seek(endTime) + pause 收尾。
 * - prefers-reduced-motion：不播动画，直接 seek 到段末呈现终态静帧。
 * - 找不到 scene（文章没建 scene.tsx）：降级为空容器，不跑 IntersectionObserver。
 * - 只播一次（tlRef 已有实例则忽略后续 intersect）。
 */
export default function SceneClip({ from }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // jsdom / 旧环境无 IntersectionObserver：静默跳过（测试只渲染占位 DOM）
    if (typeof IntersectionObserver === 'undefined') return

    const host = el.closest('[data-article-slug]')
    const slug = host?.getAttribute('data-article-slug') ?? null
    const scene = findSceneForSlug(slug)
    if (!scene) return // controller 裁决 1：scene undefined → 空容器，不跑 observer

    const reduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let timer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        if (tlRef.current) return // already played
        const full = scene.build()
        // GSAP 3 Timeline.labels 是 { label: time } 的对象
        const labels = full.labels || {}
        const sorted = Object.entries(labels).sort((a, b) => a[1] - b[1])
        const fromIdx = sorted.findIndex(([k]) => k === from)
        if (fromIdx === -1) return
        const [, fromTime] = sorted[fromIdx]
        const next = sorted[fromIdx + 1]
        const endTime = next ? next[1] : full.duration()
        const sub = full.seek(fromTime, false).pause()
        if (reduced) {
          // reduced motion：不播动画，直接呈现段末终态静帧
          sub.pause().seek(endTime, true)
        } else {
          sub.play()
          timer = setTimeout(() => { sub.pause().seek(endTime) }, (endTime - fromTime) * 1000 + 50)
        }
        tlRef.current = sub
        return
      }
    }, { threshold: 0.3 })

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timer !== null) clearTimeout(timer)
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [from])

  return <div ref={ref} className="scene-clip" data-scene-clip-from={from} aria-label={`动画：${from}`} />
}
