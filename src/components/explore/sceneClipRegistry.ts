/**
 * SceneClip imperative API 注册表（v4 Task 3）。
 *
 * SceneClip 挂载后在 useEffect 里把自己的播放控制权（play/pause/replay）注册进来，
 * Director（v4 Task 4）按 demo 名取回并编排演出顺序。
 *
 * - 同名多实例防御：Map 覆盖旧值；注销闭包只在 cleanup 时调用，
 *   后注册者先注销时，Map 里留的是先注册者的 API——但因为同名多实例
 *   在实际 DOM 结构里不该发生（同一 demo 键在文章里只出现一次），
 *   这里不做「只有最新者才允许删」的复杂仲裁，保持语义简单可测。
 */
export interface SceneClipApi {
  play(): void
  pause(): void
  replay(): void
}

const map = new Map<string, SceneClipApi>()

/** 注册（或覆盖）demo 名到 API 的映射；返回注销闭包。 */
export function registerSceneClip(demo: string, api: SceneClipApi): () => void {
  map.set(demo, api)
  return () => map.delete(demo)
}

/** 显式注销（单测 beforeEach 清理用；SceneClip 自身走 registerSceneClip 返回的闭包）。 */
export function unregisterSceneClip(demo: string): void {
  map.delete(demo)
}

export function getSceneClipApi(demo: string): SceneClipApi | undefined {
  return map.get(demo)
}
