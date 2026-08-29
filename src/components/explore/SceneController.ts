import type { ComponentType } from 'react'
import type {} from 'gsap'

export interface Scene {
  name: string                       // 与 yaml scenes[].demo 对齐
  Stage: ComponentType               // 静态 DOM 框架（GSAP 操纵的真实元素都在里面）
  build(): gsap.core.Timeline        // 事件序列编排；每个 demo 独立 timeline
}

export interface DemoHandle {
  play(): void
  pause(): void
  reset(): void                      // pause + seek(0)
  replay(): void                     // seek(0) + play
  finished(): boolean
  kill(): void
}

export function createDemoHandle(tl: gsap.core.Timeline): DemoHandle {
  const reduced = () => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    play() {
      if (reduced()) { tl.pause().progress(1); return }
      tl.play()
    },
    pause() { tl.pause() },
    reset() { tl.pause().seek(0) },
    replay() {
      tl.pause().seek(0)
      if (!reduced()) tl.play()
    },
    finished() { return tl.progress() >= 1 },
    kill() { tl.kill() },
  }
}
