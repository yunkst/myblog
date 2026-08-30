/**
 * 已看过幕集合（spec §3.3 seenScenes）：sessionStorage 按 explore title 独立一份，
 * 与履历栈同前缀（explore.seen.<title>）。
 *
 * v4 当前用途：**不重播已看过的幕**——ExploreRouter 只在幕 **首次** 激活时挂载
 * Director 演出；之后回看该幕直接渲染静态结构（点 ↻ 重看按钮仍可手动重播 demo）。
 *
 * 与 useHistoryStack 同款风格：browser-only、读异常吞掉返回空、写失败静默。
 */
const KEY = (k: string) => `explore.seen.${k}`

export function readSeenScenes(storageKey: string): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(KEY(storageKey))
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function writeSeenScenes(storageKey: string, seen: Set<string>) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(KEY(storageKey), JSON.stringify([...seen]))
  } catch {
    /* 写失败静默（隐私模式等）：演出回看语义降级为可重播，无功能损伤 */
  }
}