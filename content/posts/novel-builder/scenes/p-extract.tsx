import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：p-extract（yaml label：原理：Headless WebView 与预加载调度） */
export default function PExtract() {
  return (
    <>
      <SceneClip />
      <p>阅读流畅度依赖一套优先级调度：前台阅读请求为 high 优先级，可以抢占后台 low 优先级的预加载任务，用户翻章的请求始终排在预加载之前。</p>
      <p>PreloadService 在当前章渲染完成后将后续章节入队，FIFO 处理，每个任务限速 30 秒，命中缓存则重置计数。限速用于避免对站点造成请求压力。</p>
      <p>另有一条保护规则：标记为 is_user_inserted 的章节（用户插入或改写过的）不会被自动更新覆盖。</p>
    </>
  )
}
