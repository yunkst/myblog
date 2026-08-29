import type {} from 'gsap' // 加载 gsap 全局类型 namespace（declare namespace gsap）
import type { ComponentType } from 'react'

export interface Scene {
  build(): gsap.core.Timeline
  focusable: string[]
  /**
   * 探索视图舞台内容组件（必填，无场景时 ExploreView 不会走 SceneStage 分支）。
   * 多数文章会渲染一个静态 SVG 概览（如 ai-it-system 的 PipelineSvg），
   * 复杂动画（GSAP）由 SceneHandle.seek() 触发。
   */
  Stage: ComponentType
}

export interface SceneHandle {
  seek(label: string): void
  play(): void
  pause(): void
  focus(ids: string[]): void
  reset(): void
  labels(): string[]
  currentLabel(): string | null
  kill(): void
}

export function createSceneHandle(tl: gsap.core.Timeline, focusable: string[]): SceneHandle {
  const focused = new Set<string>()

  const applyFocus = () => {
    focusable.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      el.classList.toggle('scene-focus', focused.has(id))
    })
  }

  const reduced = () => typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    seek(label) {
      if (reduced()) {
        // reduced motion：直接调到 label 终态，不放动画
        // GSAP seek(position, suppressEvents) 第二参是 boolean"是否跳过中间回调"
        tl.pause().seek(label, true)
      } else {
        tl.pause()
        tl.seek(label)
      }
    },
    play() { if (!reduced()) tl.play() },
    pause() { tl.pause() },
    focus(ids) {
      focused.clear()
      ids.forEach((id) => focused.add(id))
      applyFocus()
    },
    reset() { tl.pause().seek(0); focused.clear(); applyFocus() },
    labels() {
      // GSAP 3 timeline.labels 是 {label: time} 的对象
      const map = tl.labels || {}
      return Object.keys(map).filter((k) => k)
    },
    currentLabel() {
      const labels = tl.labels || {}
      const t = tl.time()
      // 找到 <= 当前时间 的最近 label
      const entries = Object.entries(labels).sort((a, b) => a[1] - b[1])
      let cur: string | null = null
      for (const [k, v] of entries) {
        if (v <= t + 0.001) cur = k
        else break
      }
      return cur
    },
    kill() { tl.kill() },
  }
}
