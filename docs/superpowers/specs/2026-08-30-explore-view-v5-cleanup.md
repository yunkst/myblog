# 探索视图 v5 追加 · 演进清理（Director 拆 hook + 修真 bug）

**作者**: yedazhi（与 AI 助手协作）
**日期**: 2026-08-30
**状态**: 设计中,待批准后实施
**前置**: [v5 spec](./2026-08-30-explore-view-design-v5.md) 主线（v5 已落地）

---

## 0. 这一追加要解决什么

v5 主线已落地,但演出链路出现了**演进困难**——读改任何一个 mode 都要在 261 行的 `Director.tsx` 里翻找,模式测试不能单独跑,新增场景作者要跨三份 scene 文件拼心智表。这是演进障碍,不是单点 bug。

具体表现:

1. **真 bug**: mode 1 全屏→缩窗演出在用户会话里**看不到**。根因待定(seenScenes 状态/stageRef 时机/StrictMode 三选一)。
2. **架构债**: `Director.tsx` 一个 `useLayoutEffect` 内塞了 mode 1/2/3 三条编排链 + skip 注入 + cleanup,改动一处要全文通读。
3. **设计债**: firstActivation × seenScenes × sessionStorage 让"刷新就再也看不到演出",没有任何入口重置。
4. **场景文件三分**: `scene.tsx` (123 行) + `scene-builds.tsx` (201 行) + `scene-stages.tsx` (232 行)——三份文件命名让人猜不到分工。**不在本次追加范围**(历史遗留,留作单独任务)。

---

## 1. 不在范围(明确放弃)

| 项 | 原因 |
|---|---|
| scene.tsx / scene-builds.tsx / scene-stages.tsx 三合一 | 历史遗留,合成要重写 11 个 demo,代价高,留作 cleanup task |
| `setCurrentSlug` 模块级变量 → Context | 改起来要动 Post/Stage/SceneClip 三个挂载点,不属于本次"演进清理"的核心 |
| `sceneClipRegistry` Map → 其他形式 | 单测覆盖完整,同名 demo 名冲突在生产里不会发生,YAGNI |
| `partition` 浅递归再加 hooks 防御 | JSDoc 已说明约束,加防御代码不解决根本问题 |
| 重新设计 mode 视觉(左右分栏) | 设计讨论,不是清理;单独 spec |

---

## 2. 范围(本次要做)

### 2.1 修真 bug: mode 1 在当前会话不可见

**调查方法**(顺序执行,任一命中即修):

1. **seenScenes 状态嫌疑**: `ExploreRouter.tsx:52-56` 用 `useState(() => readSeenScenes(...))` lazy init——首次渲染时 sessionStorage 已有内容则 firstActivation = false → Director 不挂载。**修复方向**: 加 UI 重置入口(见 §2.4),或者把 seenScenes 从 sessionStorage 改成**内存态**(刷新即重置)。
2. **stageRef 时机嫌疑**: `Director.useLayoutEffect` deps 含 `stageRef`,但 `stageRef` 是 useRef——引用稳定,理论上不该 stale。**修复方向**: 在 useLayoutEffect 第一行 `if (!stageRef?.current) { onReady noop; return }`,确认 hook 在 ref 还没挂时早退。
3. **StrictMode 嫌疑**: v4 mount effect 把 entry 写 seen 是**双渲染**(StrictMode dev 模式),可能导致 hash change 路径误触。**修复方向**: mount effect 的 seen 写入加 `if (import.meta.env.DEV)` 守卫——不,这不解决生产问题,真实修复是把 seen 写入移出 mount effect 放进 goTo 内。

**先验证根因再修**: 在 dev mode 控制台执行 `console.log(window.matchMedia('(prefers-reduced-motion: reduce)').matches)`——如果 true,Director.tsx:74 早返才是真因(用户系统开了"减少动效")。这是最便宜的一查。

### 2.2 Director 拆 hook

**目标**: Director 从 261 行减到 50 行以下,每个 mode 单独 hook,模式可独立测/改。

**新结构**:

```
src/components/explore/
  Director.tsx              ← 50 行,选择器
  useMode1Director.ts       ← mode 1 编排:全屏 demo → 缩窗 → 文字 → choices
  useMode2Director.ts       ← mode 2 编排:文字 → demo → choices
  useMode3Director.ts       ← mode 3 编排:纯文字
  useDirectorBase.ts        ← 共享:reduced 守卫 + hidden 揭示 + skip API + cleanup
```

**`useDirectorBase` 职责**:
- reduced-motion 守卫 → 早返 + onReady({skip: noop})
- 演出前 gsap.set 把 SSR 直出的"终态"压回隐藏(head / dialogue 段落 / choices chips)
- 提供 `reveal(head)` / `typewriterChain(dlg)` / `playDemo(demo, stageRef)` / `choicesRise(choices)` 四个 Promise 工具
- tls 收集 + cleanup kill
- onReady 注入 skip(skip 实现:快照迭代 tls.current 全部 progress(1) + 摘全屏 class)

**`useMode1Director(scene, refs)` 职责**:
- 加 FULLSCREEN_CLASS → useDirectorBase.playDemo() → gsap.fromTo(stage, {scale:1.4}, {scale:1, 0.6s}) → 摘全屏 class → reveal(head) → typewriterChain(dlg) → choicesRise(choices)
- 测试可以只 mock refs 跑这条链

**`useMode2Director(scene, refs)` 职责**:
- reveal(head) → typewriterChain(dlg) → useDirectorBase.playDemo() → choicesRise(choices)
- 测试可以只测这条链

**`useMode3Director(scene, refs)` 职责**:
- reveal(head) → typewriterChain(dlg) → choicesRise(choices)
- 极简,纯文字链

**`Director.tsx` 退化形态**:

```tsx
export function Director({ scene, headRef, dlgRef, choicesRef, stageRef, children, onReady }) {
  const common = { headRef, dlgRef, choicesRef, stageRef, onReady }
  switch (scene.mode) {
    case 1: useMode1Director({ scene, ...common }); break
    case 2: useMode2Director({ scene, ...common }); break
    case 3: useMode3Director({ scene, ...common }); break
  }
  return <>{children}</>
}
```

### 2.3 抽出共用常量/选择器

`MEDIA_SELECTOR` / `FINISHED_SELECTOR` / `FULLSCREEN_CLASS` 移到 `useDirectorBase.ts`(三个 mode hook 都用)。

### 2.4 补 ▶ 重演本幕 按钮

**问题**: 用户错过演出或想再看一次,目前没有任何入口。firstActivation 锁在 sessionStorage 里出不来。

**方案**:

- `seenScenes` 从 sessionStorage **降级为内存态**(module-level `Set<string>` 或组件 state)。刷新页面自动重看——代价是同一标签页多次刷会有演出,但用户在 Spec §3.3 已经被告知"演出可能在多次浏览中重复"——这是显式取舍。
- 在 stage 容器右上角新增按钮 `▶ 重演本幕`(位置不与 `↻ 重看` 重叠):
  - `↻ 重看`: 只重播 demo 时间线(v4 行为,保留)
  - `▶ 重演本幕`: 重置 firstActivation 让当前幕重演整幕(head fade + 打字 + choices 浮起)。demo 也会从头跑。
- **实现**: `Director` 通过 `onReady` 上抛 `replay()` API,Answer 把按钮挂上,点击调 `replay()` 重置 firstActivation 标记 + 触发重演。ExploreRouter 的 runtime 暴露 `replayActive()`。

### 2.5 不做的事(防止范围漂移)

- 不动 `scene.tsx` / `scene-builds.tsx` / `scene-stages.tsx`(留给 cleanup task)
- 不动 `partition`(已在 v5 final fix 收敛)
- 不动 Director 之外的任何 explore 组件(SceneClip / Answer / ExitChips / HistoryPanel 等结构稳定)
- 不动 CSS(v5 final review 已收尾)

---

## 3. 接口契约(给后续 plan 用)

### ExploreRuntime 新增

```ts
export interface ExploreRuntime {
  // ... 既有字段 ...
  /** v5.5：重演当前幕（重置 firstActivation 标记，触发整幕演出重跑） */
  replayActive: () => void
}
```

### useDirectorBase

```ts
interface DirectorRefs {
  headRef: RefObject<HTMLElement | null>
  dlgRef: RefObject<HTMLElement | null>
  choicesRef: RefObject<HTMLElement | null>
  stageRef?: RefObject<HTMLElement | null>
}

interface DirectorTools {
  reveal: (el: HTMLElement | null, dur?: number) => Promise<void>
  typewriterChain: (dlg: HTMLElement | null) => Promise<void>
  playDemo: (demo: string, container: HTMLElement | null) => Promise<void>
  choicesRise: (choices: HTMLElement | null) => Promise<void>
}

export function useDirectorBase(
  refs: DirectorRefs,
  onReady: (api: { skip: () => void }) => void,
): DirectorTools
```

### useMode1Director / 2 / 3

```ts
export function useMode1Director(args: {
  scene: DirectorScene
  refs: DirectorRefs
  onReady: (api: { skip: () => void }) => void
}): void
```

---

## 4. 测试策略

### 单元

- `useDirectorBase.test.tsx`: reduced 守卫返回 noop skip + 隐藏 gsap.set 调用 + reveal/typewriter/playDemo/choicesRise 四个工具的 Promise 行为
- `useMode1Director.test.tsx`: 模拟 mode 1 全套编排链调用顺序(fullsceen class add → playDemo → scale tween → remove → reveal → typewriter → choices)
- `useMode2Director.test.tsx`: 文字 → demo → choices 调用顺序
- `useMode3Director.test.tsx`: 文字 → choices 调用顺序

### 集成

- `Director.test.tsx`: Director 选择器按 scene.mode 正确分派(useMode1 / 2 / 3 hook 被调用)
- `Answer.test.tsx` 加一条覆盖"幕重演"路径(replayActive 被调 → firstActivation 重置)

### 端到端(浏览器实测)

- mode 1(q-problem)能看到全屏 demo → 缩窗 → 文字 → 出口 完整演出
- mode 2(q-future 等)能看到文字 → demo → 出口
- mode 3(暂未用,跳过)
- ↻ 重看按钮只重播 demo,不动文字/chips
- ▶ 重演本幕按钮重置整幕演出
- 刷新页面后重新看到 mode 1 演出(seenScenes 不再持久化)

---

## 5. 文件改动清单

| 文件 | 动作 |
|---|---|
| `src/components/explore/Director.tsx` | 大幅瘦身(261→~50 行,纯选择器) |
| `src/components/explore/useDirectorBase.ts` | 新建 |
| `src/components/explore/useMode1Director.ts` | 新建 |
| `src/components/explore/useMode2Director.ts` | 新建 |
| `src/components/explore/useMode3Director.ts` | 新建 |
| `src/components/explore/AnswerContext.ts` | runtime 增 `replayActive` |
| `src/components/explore/ExploreRouter.tsx` | `replayActive` 实现(重置 firstActivation[id] + 触发重挂载,seenScenes 改为内存态) |
| `src/components/explore/seenScenes.ts` | 改为内存 `Set<string>`(或 ExploreRouter 内 useState,删除 sessionStorage) |
| `src/components/explore/Answer.tsx` | stage 右上角加 `▶ 重演本幕` 按钮,wire `replayActive` |
| `src/styles/global.css` | 新增 `.stage-replay-all` 按钮样式(直角 + 1px --sline + hover sacc) |
| `src/components/explore/Director.test.tsx` | 改写为选择器测试 |
| `src/components/explore/useDirectorBase.test.tsx` | 新建 |
| `src/components/explore/useMode1Director.test.tsx` | 新建 |
| `src/components/explore/useMode2Director.test.tsx` | 新建 |
| `src/components/explore/useMode3Director.test.tsx` | 新建 |
| `src/components/explore/Answer.test.tsx` | 加重演入口测试 |
| `src/components/explore/ExploreRouter.test.tsx` | 加 replayActive 测试 + seenScenes 内存化适配 |

---

## 6. 验收标准

- `pnpm typecheck` 0 错
- `pnpm test` 全绿
- `pnpm validate:explore` 0 错 0 警告
- `pnpm build` 成功
- 浏览器实测:
  - mode 1 完整演出可见(全屏 → 缩窗 → 文字 → 出口)
  - 刷新后**仍能看到** mode 1 演出(seenScenes 内存化生效)
  - ↻ 重看按钮只重播 demo
  - ▶ 重演本幕按钮重演整幕
- Director.tsx 不超过 60 行
- 三个 mode hook 各 ≤ 80 行
- useDirectorBase.ts ≤ 80 行