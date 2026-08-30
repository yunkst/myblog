# Task 3 报告：v7 三原则 3 — demo API promise 化

**worktree**: `D:\myspace\myblog-v7`（branch `v7-stage-shell`）
**commit**: `4058da1` refactor(explore): v7 三原则 3 demo API promise 化——registry v2 + Director.playDemo 收敛

## 改了什么

### 1. `src/components/explore/sceneClipRegistry.ts`
- `SceneClipApi` 接口扩展：`play(): Promise<void>` + 新增 `finished(): boolean`
- 头部注释更新，明确 onComplete / cleanup（GSAP onKill 不触发，由 cleanup 手动 resolve 兜底）的 resolve 语义

### 2. `src/components/explore/SceneClip.tsx`
- `tl.eventCallback('onComplete', ...)` → `setFinishedAndResolve`：落 `data-finished`（CSS 选择器契约保留）+ resolve 挂起的 play promise
- 新增 cleanup 兜底：useEffect return 闭包手动 resolve `playResolver`，防止 Director await 悬挂（实测 GSAP 的 `eventCallback('onKill', ...)` 在 `tl.kill()` 时不触发，只能走 cleanup 手动 resolve）
- `play()` 函数：已 finished 直接 `Promise.resolve()`；否则挂 resolver 再 `handle.play()`（reduced-motion 下内部 `progress(1)` 触发 onComplete → 自然 resolve）
- 注册 API 形状更新：`{ play, pause, replay, finished }`

### 3. `src/components/explore/Director.tsx`
- 删除 `FINISHED_SELECTOR` 常量
- 删除 `demoWait` 对象（observer/timer 句柄）
- 删除 MutationObserver 监听 + 15s `setTimeout` 整块
- `playDemo` 收敛为：
  ```ts
  waitForApi(2000)
    .then(api => {
      if (cancelled) return
      if (!api) return
      if (api.finished()) return  // 已 finished 不重播
      return api.play()           // await Promise，onComplete/cleanup resolve
    })
  ```
- 保留 `waitForApi` 2s rAF 轮询上限（注册竞态兜底）
- 保留 `!scene.demo` 短路（纯文字幕早返）
- 保留 cancelled 守卫（cleanup 后 playDemo 不得再推进）
- cleanup 函数同步精简：移除 `demoWait.observer?.disconnect()` 与 `window.clearTimeout(demoWait.timer)`

### 4. `src/components/explore/SceneClip.test.tsx`
- 新增三条 promise 断言：
  - `play() 返回 Promise<void>（类型契约）`：验证返回 Promise 实例 + `then` 方法存在
  - `unmount（cleanup 兜底）后挂起的 play promise 也 resolve`：验证 cleanup 路径 resolve 兜底
  - `finished()=true 时 play() 立即 resolve，不重播 timeline`：验证 finished 早返路径

### 5. `src/components/explore/Director.test.tsx`
- 新增一条早返路径断言：
  - `api.finished()=true 时 playDemo 不调 api.play()（early-return 路径）`：注册 `finished: () => true` 的假 API + `play` 返回永不 resolve 的 promise + `vi.advanceTimersByTimeAsync(2500)` 走完 rAF 轮询 → 断言 `playSpy` 从未被调用
- 顶部新增 `registerSceneClip` import

### 6. `src/components/explore/sceneClipRegistry.test.ts`
- `makeApi()` 工厂：返回新形状 API（`play` 返回 `Promise.resolve()` + `finished` 返回 false），消除四处 `{ play: vi.fn(), pause: vi.fn(), replay: vi.fn() }` 重复

### 7. `src/components/explore/Answer.test.tsx`
- 「缩窗完成后 data-fullscreen 消失」测试的假 API 注册更新为新形状（`play: () => Promise.resolve()` + `finished: () => true`）

## 三原则验收

- ✅ 原则 3「demo API promise 化」达成：`await api.play()` 一处接管「等 demo 完成」
- ✅ Director 不再有 MutationObserver / setTimeout(15s) / FINISHED_SELECTOR 查询
- ✅ SceneClip 内部 play 流程收敛为 promise + 兜底 resolve
- ✅ `data-finished` 属性保留（CSS 重看按钮契约）
- ✅ `waitForApi` 2s rAF 轮询上限保留（注册竞态兜底）
- ✅ `onKill` 思路保留但改用 cleanup 手动 resolve（GSAP `eventCallback('onKill')` 实际不触发，实测验证）

## 验证

```
Test Files  26 passed (26)
Tests       164 passed (164)
npx tsc --noEmit   零错误
```

约束遵守：
- 未动 scene.tsx / scene-stages.tsx / scene-builds.tsx / explore.yaml / scenes/q-*.tsx
- `data-finished` 属性保留
- `waitForApi` 2s 轮询上限保留
- cleanup 兜底 resolve（取代不可靠的 onKill 事件）
- 沿用 Edit 改文件，未起 dev server / Playwright / subagent

## 联动项验证

`Answer.test.tsx` 缩窗测试当前用 `registerSceneClip('demo-fs', apiMock)` 注册假 API + 预置 `data-finished`——按 brief 提示的「apiMock.play() 返回的 promise 你可手动 resolve」路径适配，把 `play: () => Promise.resolve()` + `finished: () => true` 一并补齐。原 setup（预置 `data-finished` 触发早返）保留语义，演出纯 GSAP 推进到缩窗完成。

## 文件清单

- `D:\myspace\myblog-v7\src\components\explore\sceneClipRegistry.ts`
- `D:\myspace\myblog-v7\src\components\explore\SceneClip.tsx`
- `D:\myspace\myblog-v7\src\components\explore\Director.tsx`
- `D:\myspace\myblog-v7\src\components\explore\SceneClip.test.tsx`
- `D:\myspace\myblog-v7\src\components\explore\Director.test.tsx`
- `D:\myspace\myblog-v7\src\components\explore\sceneClipRegistry.test.ts`
- `D:\myspace\myblog-v7\src\components\explore\Answer.test.tsx`

---

# Task 3 Review Fix 报告：M1 同步 onComplete 竞态 + M2 注释对齐

**worktree**: `D:\myspace\myblog-v7`（branch `v7-stage-shell`）
**commit**: 见末尾 git log

## 审查发现

复审 v7-3 demo API promise 化实现，发现 1 个需要修的隐藏缺陷 + 1 个注释漂移：

### M1 — `SceneClip.tsx:119-123` play() 内部同步 onComplete 竞态（隐藏缺陷）

**症状**：reduced-motion 路径下 `tl.pause().progress(1)` 同步触发 `onComplete` → `setFinishedAndResolve` 在 `playResolver` 赋值前就调用 `playResolver?.()`——resolver 仍为 null，promise 永挂。外部 `await api.play()` 永不返回。

**旧代码**：
```ts
const play = (): Promise<void> => {
  if (handle.finished()) return Promise.resolve()
  handle.play()                       // ← 同步触发 onComplete
  return new Promise<void>((resolve) => { playResolver = resolve })  // ← 此时 resolver 还是 null
}
```

**修法**（swap 两行，先挂 resolver 再 play）：
```ts
const play = (): Promise<void> => {
  if (handle.finished()) return Promise.resolve()
  return new Promise<void>((resolve) => {
    playResolver = resolve   // ← 先挂
    handle.play()            // ← 再触发，可能同步 resolve
  })
}
```

注释同步更新，明示「顺序关键」+「reduced-motion 同步触发 onComplete」动机。

### M2 — `SceneClip.test.tsx` 注释漂移（与 SceneClip.tsx 内部注释对齐）

**问题**：旧测试注释写「unmount 时 handle.kill 触发 onKill → resolve」，与 SceneClip.tsx 内已勘正的「GSAP eventCallback('onKill') 不会在 tl.kill() 触发，cleanup 路径由 useEffect return 闭包手动 resolve」矛盾。

**修法**：两处注释改写为「unmount → useEffect cleanup 闭包 → 手动 resolve（GSAP onKill 实际不触发）」。

## 新增回归测试

`SceneClip.test.tsx` 新增 1 条 M1 专项用例（`play() 返回的 Promise 能 resolve（即使已 finished），防止 M1 同步 onComplete 竞态`）：先把 timeline 推进到 1 触发 onComplete 落 data-finished，再 `await api.play()`——验证 promise 不会永挂、`then` 回调能观察到 resolved=true。

## 验证

```
Test Files  26 passed (26)
Tests       165 passed (165)   ← 164 baseline + 1 new
npx tsc --noEmit   零错误
```

约束遵守：
- 未动 scene.tsx / scene-stages.tsx / scene-builds.tsx / explore.yaml / scenes/q-*.tsx
- `data-finished` 属性保留
- `waitForApi` 2s 轮询上限保留
- cleanup 兜底 resolve（取代不可靠的 onKill 事件）—— M2 注释对齐此结论
- 沿用 Edit 改文件，未起 dev server / Playwright / subagent

## 联动项

- `SceneClip.tsx:116-118` 注释更新（明示顺序关键）
- `SceneClip.test.tsx:106-108` 注释更新（cleanup 路径描述）
- `SceneClip.test.tsx:121-123` 注释更新（cleanup 路径描述）
- `SceneClip.test.tsx:142-162` 新增 M1 回归用例

## 文件清单

- `D:\myspace\myblog-v7\src\components\explore\SceneClip.tsx`
- `D:\myspace\myblog-v7\src\components\explore\SceneClip.test.tsx`
- `D:\myspace\myblog-v7\task-3-report.md`
