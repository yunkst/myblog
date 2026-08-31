/**
 * MockCursor：模拟鼠标——经典白色箭头（深色描边），absolute 定位。
 * 箭头尖端在 SVG 的 (2,1) 处；GSAP 用 tl.to(el, { x, y, duration }) 移动时
 * 以尖端对准目标（scene.tsx 的 cursorTarget 会减去尖端偏移）。
 */
export function MockCursor({ id }: { id?: string }) {
  return (
    <div id={id} className="mock-cursor" aria-hidden="true">
      <svg viewBox="0 0 16 22" width="16" height="22">
        <path
          d="M2 1 L2 17 L6.2 13.2 L9 20 L11.5 18.8 L8.7 12 L14 12 Z"
          fill="#fff"
          stroke="#1A1A1A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
