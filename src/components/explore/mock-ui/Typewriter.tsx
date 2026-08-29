/**
 * Typewriter：打字机目标。
 * GSAP 通过 tl.call(() => { el.textContent = next }, [], '+=0.05') 逐字推进；
 * 必须渲染为原生 <span> 而非受控组件，避免 React 重渲冲掉 GSAP 设置的 textContent。
 */
export function Typewriter({ text, id }: { text: string; id?: string }) {
  return <span id={id} className="mock-typing" data-typing-target>{text}</span>
}
