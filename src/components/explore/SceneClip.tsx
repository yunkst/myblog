import { useContext, useEffect, useRef } from 'react'
import type {} from 'gsap'
import type { Scene } from './SceneController'
import { createDemoHandle } from './SceneController'
import { registerSceneClip } from './sceneClipRegistry'
import { SceneDemoContext } from './AnswerContext'

/* 与 v1 同一 glob 手法，但消费 demos 字典而非 default Scene */
const demoModules = import.meta.glob<{ demos: Record<string, Scene> }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

/** 按 slug 反查该文章 demos 模块；找不到返回 null。 */
function moduleForSlug(slug: string | null) {
  if (!slug) return null
  const key = Object.keys(demoModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  return key ? demoModules[key] : null
}

/**
 * v6 review 单源收敛：demo 名解析 = prop > SceneDemoContext（Answer 注入的 yaml scenes[].demo）> 空。
 *
 * - prop：SceneClip 显式传入（测试直渲形态），显式最高。
 * - SceneDemoContext：q-*.tsx 单幕文件在 Answer 内渲染时，Answer 注入
 *   scene.demo——demo 名只在 yaml scenes[].demo 一处声明，与 demos 字典键、
 *   q-*.tsx 文件名三者同源，杜绝「yaml 改了 demo、q-*.tsx 没跟改」的结构性漂移。
 * - 都拿不到（SSR 无 Answer、孤儿 SceneClip）→ 空：SceneClip 降级为静态 DOM
 *   （Stage 仍渲染，不建 timeline），不 warn（属正常态，非错误）。
 */
function resolveDemoName(prop: string | undefined, ctxDemo: string | null): string {
  if (prop) return prop
  return ctxDemo ?? ''
}

/**
 * SSG/SSR 同步反查 slug：Post.tsx 渲染 main[data-article-slug] 时，
 * 同步把 slug 写进 module-level 状态；SceneClip 在 render 期同步读。
 * 这保证 SSR 输出的 HTML 与 hydration 期望完全一致（避免 React hydration mismatch）。
 *
 * 客户端 hydration 完成后这个值会被清掉（避免污染别的页面）——但同一文章内
 * SceneClip 多次渲染期间必须保持。
 */
let currentSlug: string | null = null
export function setCurrentSlug(slug: string | null) {
  currentSlug = slug
}

/**
 * v2：唯一 demo 播放入口（spec §4.3）。
 *
 * 实现要点：
 * - slug 同步反查：渲染期读模块级 currentSlug（Post.tsx 同步设置）。
 * - demo 名解析：prop > SceneDemoContext（resolveDemoName，见上）——q-*.tsx 单幕文件
 *   不再写死 demo 名，由 Answer 注入 yaml scenes[].demo 单一真相。
 * - Stage 必须由本组件渲染进容器：GSAP 靠选择器找 DOM。
 * - 然后 useEffect 里 build timeline + 视口观察（仅浏览器端有 IntersectionObserver）。
 * - 首次进入视口（threshold 0.3）：自动 play；播完停终态
 * - 离开视口：未播完则 pause；再进入从未播完处继续
 * - 播完后渲染 ↻ 重看按钮；点击 replay()
 * - reduced-motion：play() 直达终态（createDemoHandle 内处理）
 * - demo 不存在（yaml/正文引用了未定义的键）：空容器降级，控制台 warn
 */
export default function SceneClip({ demo }: { demo?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const ctxDemo = useContext(SceneDemoContext)

  const demoName = resolveDemoName(demo, ctxDemo)
  const scene = moduleForSlug(currentSlug)?.demos?.[demoName] ?? null
  if (!scene && currentSlug && demoName && typeof console !== 'undefined') {
    console.warn(`[SceneClip] ${currentSlug} 没有 demo "${demoName}"`)
  }

  // Stage 挂载后 build timeline + 视口观察（仅浏览器）
  useEffect(() => {
    const cur = scene
    const el = ref.current
    if (!cur || !el) return
    if (typeof IntersectionObserver === 'undefined') return

    const tl = cur.build()
    /* v7 Task 3（demo API promise 化）：用 ref 持有待 resolve 的 play promise——
     * onComplete（自然完成）/ cleanup（卸载/切幕兜底）时 resolve；
     * Director 经 `await api.play()` 一处接管「等 demo 完成」语义，
     * 不再用 MutationObserver + data-finished + 15s 超时兜底。
     * 注：GSAP 的 eventCallback('onKill', ...) 不会在 tl.kill() 时触发，
     * 所以 cleanup 路径由 useEffect return 闭包手动 resolve（兜底）。
     */
    let playResolver: (() => void) | null = null
    const setFinishedAndResolve = () => {
      el.setAttribute('data-finished', '')
      const r = playResolver
      playResolver = null
      r?.()
    }
    tl.eventCallback('onComplete', setFinishedAndResolve)
    const handle = createDemoHandle(tl)
    let started = false

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          if (!started) { started = true; handle.play() }
          else if (!handle.finished()) handle.play()
        } else if (started && !handle.finished()) {
          handle.pause()
        }
      }
    }, { threshold: 0.3 })

    observer.observe(el)
    const btn = btnRef.current
    btn?.addEventListener('click', handle.replay)

    /* v7 Task 3（demo API promise 化）：play() 返回 Promise<void>——
     * 已 finished 直接 resolve；否则先挂 resolver 再触发 handle.play()
     * （顺序关键：reduced-motion 下 progress(1) 同步触发 onComplete →
     *  setFinishedAndResolve 必须能拿到 playResolver，所以必须先挂再 play） */
    const play = (): Promise<void> => {
      if (handle.finished()) return Promise.resolve()
      return new Promise<void>((resolve) => {
        playResolver = resolve
        handle.play()
      })
    }

    // v4：把播放控制权暴露给 Director（同名覆盖旧值，注销闭包只在 cleanup 调用）
    const unregister = registerSceneClip(demoName, {
      play,
      pause: () => handle.pause(),
      replay: () => handle.replay(),
      finished: () => handle.finished(),
    })

    return () => {
      unregister()
      observer.disconnect()
      btn?.removeEventListener('click', handle.replay)
      /* v7 Task 3：cleanup 兜底——手动 resolve 挂起的 play promise
       * （GSAP 的 eventCallback onKill 不会在 tl.kill 触发，
       *  切幕/卸载时若 play() 还挂着，需手动 resolve 防止 Director await 悬挂） */
      const r = playResolver
      playResolver = null
      r?.()
      handle.kill()
    }
  }, [scene, demoName])

  const Stage = scene?.Stage
  return (
    <div ref={ref} className="scene-clip" data-scene-clip-demo={demoName} aria-label={`动画：${demoName}`}>
      {Stage && <Stage />}
      <button ref={btnRef} type="button" className="scene-replay" aria-label="重看">↻ 重看</button>
    </div>
  )
}
