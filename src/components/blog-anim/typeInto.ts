import type {} from 'gsap'

/**
 * 逐字打字（向传入 timeline 追加 tween，不返回新 timeline）。
 *
 * 与 mock-ui Typewriter / useTypewriter 同一手法——GSAP core 无 TextPlugin，
 * tl.call 逐字回写 textContent 是仓库既定惯例（myblog scene.tsx、
 * ai-digital-employee scene.tsx tiered-confirm、novel-builder scene.tsx
 * rewrite-flow 三处共用，2026-09-05 从三处复制收敛为一处）。
 *
 * @param tl       现有 GSAP timeline（追加到队尾）
 * @param selector 目标元素 id（不含 #），每次回调里 getElementById 重查——
 *                 React 重挂载 Stage 后缓存引用会失效，重查是防御性写法
 * @param text     要打出的完整字符串
 * @param stepSec  每字停留时长（秒），默认 0.05（与 myblog / novel-builder 一致；
 *                 ai-digital-employee tiered-confirm 用 0.06）
 */
export function typeInto(
  tl: gsap.core.Timeline,
  selector: string,
  text: string,
  stepSec = 0.05,
) {
  /* 终态高度预留（防抖动）：构建时同步「塞全文→量高→还原」（同一帧内
   * 完成，无中间绘制），把终态 border-box 高锁进 min-height——打字期间
   * 目标高度恒定，下方内容/居中容器不再随段落增行位移。目标此刻可能未
   * 挂载（每次回调 getElementById 重查的同一原因），量不到就跳过。
   * 用 innerHTML 保存/还原，避免 textContent 回写丢掉占位标记的样式。
   * 全局 box-sizing:border-box（theme.css），rect.height 即 min-height 语义值。 */
  if (text.length > 0) {
    const el0 = document.getElementById(selector)
    if (el0) {
      const prev = el0.innerHTML
      el0.textContent = text
      const finalH = el0.getBoundingClientRect().height
      el0.innerHTML = prev
      if (finalH > 0) el0.style.minHeight = `${finalH}px`
    }
  }

  for (let i = 1; i <= text.length; i++) {
    tl.call(() => {
      const el = document.getElementById(selector)
      if (el) el.textContent = text.slice(0, i)
    })
    tl.to({}, { duration: stepSec })
  }

  // restore 收尾：清掉预留（打字中 resize 造成的 px 失真随之自愈）
  if (text.length > 0) {
    tl.call(() => {
      const el = document.getElementById(selector)
      if (el) el.style.minHeight = ''
    })
  }
}
