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

// jsdom 27 仍未实现 <dialog> 行为 API（show/showModal/close 全缺）——
// top-layer 全屏机制（clipFullscreen 的 showModal/close）在测试里需要最小
// polyfill：open 属性翻转 + close 事件。cancel（ESC）/ top layer 无需模拟
// （jsdom 无键盘驱动、无渲染层）。
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  const openDialog = function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      throw new DOMException('already open', 'InvalidStateError')
    }
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.show = openDialog
  HTMLDialogElement.prototype.showModal = openDialog
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new window.Event('close'))
  }
}
