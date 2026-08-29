/**
 * MockCursor：模拟鼠标。absolute 定位，箭头用 CSS border 三角绘制。
 * GSAP 用 tl.to(el, { x, y, duration }) 移动；为避免 layout 抖动，建议 GSAP 用 xPercent/yPercent 或 transform。
 */
export function MockCursor({ id }: { id?: string }) {
  return <div id={id} className="mock-cursor" aria-hidden="true" />
}
