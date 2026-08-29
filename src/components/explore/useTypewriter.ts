import gsap from 'gsap'

/**
 * v3 打字机（spec §4.3）：对已渲染 DOM 的文本做 GSAP 逐字揭示。
 * - 读 textContent 切字符，timeline 内 tl.call 逐字符回写——与 mock-ui
 *   Typewriter 同款手法（GSAP core，无 TextPlugin）。
 * - 内联标记（strong/em…）：打字时只回写纯文本，打完后恢复原
 *   innerHTML——标记视觉一次性回归（样张 D 验证）。
 * - reduced-motion：返回 null，调用方跳过演出。
 * - SSG 安全：本函数只在 hydration 后被调用；SSG HTML 直出原文。
 *
 * 单位约定：charMs 是毫秒；GSAP timeline position 单位是秒——内部换行
 * stepSec = charMs * 0.001（T5 评审发现的 Task 1 单位错位已修：此前
 * 28 被当 28 秒/字、restore 尾巴 +60s，导致 restore 在浏览器中永不触发）。
 */
export function buildTypewriterTimeline(
  el: HTMLElement,
  opts: { charMs?: number } = {},
): gsap.core.Timeline | null {
  const reduced =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return null

  const original = el.innerHTML
  const chars = Array.from(el.textContent ?? '')
  if (chars.length === 0) return null
  const stepSec = (opts.charMs ?? 28) * 0.001

  el.innerHTML = ''
  const tl = gsap.timeline()
  for (let i = 1; i <= chars.length; i++) {
    tl.call(() => {
      el.textContent = chars.slice(0, i).join('')
    }, undefined, i * stepSec)
  }
  tl.call(() => { el.innerHTML = original }, undefined, chars.length * stepSec + 0.06)
  return tl
}
