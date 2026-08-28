// 动画组件在 jsdom 里直接走 reduced-motion 分支，不需要真 GSAP
import '@testing-library/jest-dom/vitest'

// jsdom 缺 matchMedia，补一个始终 returns reduced 的 stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: true, media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {},
  }),
})
