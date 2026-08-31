import type { ComponentType } from 'react'
import type {} from 'gsap'
import { prefersReducedMotion } from '../../lib/motion'

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
  /** pause + progress(1)：立即跳到终态（Director skip 用；progress(1) 同步触发 onComplete） */
  finish(): void
  finished(): boolean
  kill(): void
}

export function createDemoHandle(tl: gsap.core.Timeline): DemoHandle {
  /* v5 review fix:reduced 检测收敛到 lib/motion(prefersReducedMotion 内含 SSR 守卫) */
  const reduced = () => prefersReducedMotion()

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
    finish() { tl.pause().progress(1) },
    finished() { return tl.progress() >= 1 },
    kill() { tl.kill() },
  }
}
