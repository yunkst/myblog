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
  for (let i = 1; i <= text.length; i++) {
    tl.call(() => {
      const el = document.getElementById(selector)
      if (el) el.textContent = text.slice(0, i)
    })
    tl.to({}, { duration: stepSec })
  }
}
