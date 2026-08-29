interface Props {
  from: string
}

/**
 * 阅读视图里的动画嵌入。Task 5 在 scene 协议落地后接入 GSAP，
 * 用 IntersectionObserver + scene.build() 实例截取 [from, nextLabel) 段。
 * 现阶段：渲染占位，data-scene-clip-from 标记，方便 Task 5 曥换。
 */
export default function SceneClip({ from }: Props) {
  return (
    <div className="scene-clip" data-scene-clip-from={from} aria-label={`动画：${from}`}>
      <span className="scene-clip-label">▶ 动画片段 · {from}</span>
    </div>
  )
}