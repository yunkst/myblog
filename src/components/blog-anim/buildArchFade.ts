import gsap from 'gsap'
import { ARCH_REPLAY_EVENT } from './ArchDiagram'

/**
 * 架构图 demo 统一演出（三篇文章共用，2026-09-01 从三份复制收敛为一处）：
 * stage 容器淡入 + 轻微上移；同时向图内 figure 派发 ARCH_REPLAY_EVENT，
 * 打通 ArchDiagram 内部的 CSS 揭示动画——灯箱「从头播放」/ ↻ 重看 重启
 * 本时间线时，图的节点/描边/标签动画同步重播。
 *
 * call 放在 0.01 而非 0：GSAP 对恰好位于播放头起点的零时长回调在
 * seek(suppressEvents) 后不保证重触发，0.01 保证「经过即触发」。
 */
export function buildArchFade(rootSel: string) {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set(rootSel, { opacity: 0, y: 16 })
  tl.call(
    () => {
      document.querySelector(`${rootSel} .ba-arch`)
        ?.dispatchEvent(new Event(ARCH_REPLAY_EVENT))
    },
    [],
    0.01,
  )
  tl.to(rootSel, { opacity: 1, y: 0, duration: 0.7 })
  return tl
}
