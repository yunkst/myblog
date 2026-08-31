# Explore 舞台壳 v7 重构：三原则收敛（布局显式化 / 全屏单点所有权 / demo API promise 化）

日期：2026-08-30 · 范围：舞台壳 + demo 体系（用户裁定） · 不含：demos 内容/GSAP 编排/yaml/q-*.tsx

## 背景（为什么重构）

v4→v6 演进中，同一个 `.stage` 元素上叠了 6 套机制（grid `:has()` 布局、入场动画、
`stage--fullscreen` class、Director classList 操纵、registry 轮询、MutationObserver
data-finished 抓取）。实际事故：`.theater` 入场动画的 `translateY` transform 劫持了
`position:fixed` 包含块 → mode 1 全屏退化半屏。修复靠排查，无法靠阅读发现——
需要结构性收敛。

## 设计：三原则（本计划的 spec）

1. **布局显式化**：单列/双列由组件声明（`theater--dual` / `theater--solo` modifier class），
   CSS 禁止用 `:has()` 探测 DOM 形状。
2. **全屏单点所有权**：全屏是**一个 data 属性**（`.theater[data-fullscreen]`）+ **一条 CSS 规则**。
   状态归 Answer（React state），Director 只通过回调申请，禁止 classList 直接操纵。
3. **动画不跨层 + demo API promise 化**：theater 入场只 opacity；demo GSAP 只在 SceneClip
   容器内；Director 等 demo 用 `await api.play()`（Promise），废除 MutationObserver +
   data-finished 抓取 + 15s 超时（`onKill` 兜底卸载）。

**拒绝的替代方案**（记录裁定理由）：Portal 覆盖层 + FLIP 测量归位虽然让全屏包含块
结构性免疫 transform 祖先，但引入 remount 后 demo 终态保持、测量时序等**新的脆弱时序
代码**——正是本次要治的病。v7 用「属性单点 + 契约注释」达到可审计性：全屏正确性依赖的
不变量只有一条（祖先链无 transform），在两处 CSS 锚点写死注释契约。

## Global Constraints（审查镜头）

- `npx vitest run` 全绿（当前 151 tests）、`npx tsc --noEmit` 零错误。
- **不动**：`content/posts/ai-digital-employee/scene.tsx`、`scene-stages.tsx`、
  `scene-builds.tsx`、`explore.yaml`、`scenes/q-*.tsx`（demo 内容与编排冻结）。
- 保留 `data-finished` 属性（重看按钮 CSS `.scene-clip[data-finished] .scene-replay` 依赖）。
- 全屏包含块不变量注释必须同时存在于：`v4-scene-in` keyframes 处 + `[data-fullscreen]` 规则处。
- 环境 Windows + bash；用 Edit/Write 工具改文件，不要 sed 批量改 src 代码。
- subagent 不起 dev server、不用 Playwright；浏览器验证由 controller 负责。
- 注释风格沿用现有中文注释 + 版本标记（v7）。

## Task 1：布局显式化——Answer 声明 `theater--dual/solo`，CSS 删 `:has()`

**Answer.tsx**：
- `const dual = clips.length > 0`
- section className：`` `theater answer-block ${dual ? 'theater--dual' : 'theater--solo'}` ``

**global.css**（6 处选择器替换，语义不变）：
- `.stage-frame .theater:has(> .stage)` → `.stage-frame .theater--dual`（双列 grid 规则）
- `.stage-frame .theater:has(> .stage) > .stage|.act-head|.dialogue|.choices` 4 条 →
  `.stage-frame .theater--dual > .stage` 等
- `@media (max-width:920px)` 内 `.stage-frame .theater:has(> .stage)` → `.stage-frame .theater--dual`
- 原 `:has()` 上的解释注释改写为「布局由 Answer 的 modifier class 声明（三原则 1）」

**Answer.test.tsx**：新增断言——有 SceneClip 的场景 section 含 `theater--dual`；
无 SceneClip（孤儿）场景含 `theater--solo` 且不含 `theater--dual`。

## Task 2：全屏所有权收敛——`data-fullscreen` 属性替代 `stage--fullscreen` class

**Answer.tsx**：
- `const [fullscreen, setFullscreen] = useState(false)`
- section 加 `data-fullscreen={fullscreen ? '' : undefined}`
- Director 传 `onFullscreen={setFullscreen}`（仅 `clips.length > 0` 时传，与 stageRef 同条件）

**Director.tsx**：
- Props 增 `onFullscreen?: (on: boolean) => void`；删 `FULLSCREEN_CLASS` 常量
- mode 1：`stage` 存在时 `onFullscreen(true)`（替代 classList.add）
- 缩窗完成后：`clearProps` 然后 `onFullscreen(false)`（替代 classList.remove）
- `skip` 与 cleanup：`onFullscreen(false)`
- onFullscreen 走 ref（模式同 onReadyRef，避免身份变化重建演出）
- 时序注意：useLayoutEffect 内同步调 `onFullscreen(true)` → Answer setState →
  React 在 paint 前同步 flush → 首帧即全屏（现有注释已说明为什么必须 layout 阶段）

**global.css**：
- `.stage-frame .stage--fullscreen` 规则删除，改为：
  `.stage-frame .theater[data-fullscreen] > .stage { position: fixed; inset: 0; z-index: 50; ... }`
  （直角/无投影等声明照搬），并在此处写包含块不变量注释（三原则 2 + 「祖先链
  .theater/.stage-stage/.explore-router 禁止 transform，会劫持 fixed 包含块」）
- `v4-scene-in` keyframes 处已有 v6 注释，追加一句指向该契约

**测试**：
- Director.test：`stage--fullscreen` 相关断言全部改为 onFullscreen mock 断言
  （mode 1 挂载即调 `onFullscreen(true)`；缩窗完成后 `false`；skip 调 `false`；
  mode 3 从不调用；reduced-motion 从不调用）
- Answer.test：断言 section 的 `data-fullscreen` 属性随 Director 回调出现/消失
  （mode 1 + 空 demo 路径可用 `vi.waitFor` 等演出走完）

## Task 3：demo API promise 化——registry v2 + Director.playDemo 收敛

**sceneClipRegistry.ts**：
- `SceneClipApi` 改为 `{ play(): Promise<void>; pause(): void; replay(): void; finished(): boolean }`

**SceneClip.tsx**：
- `tl.eventCallback('onComplete')` 里：设 `data-finished`（保留）+ resolve 挂起的 play promise
- `tl.eventCallback('onKill')`：resolve play promise（卸载/切幕兜底，防止 Director await 悬挂）
- `play()`：若已 finished 直接 resolve；否则挂 resolve 再 `handle.play()`
  （reduced-motion 下 `handle.play()` 内部 `progress(1)` 触发 onComplete → 自然 resolve）
- 注册时带上新 API 形状

**Director.tsx**：
- `playDemo` 收敛为：`waitForApi`（保留 rAF 轮询 2s 上限，注册竞态兜底）→
  `if (cancelled || !api || api.finished()) return` → `await api.play()`
- 删除：`FINISHED_SELECTOR`、`demoWait`（MutationObserver + 15s timer）整块
- `container` 变量若仅剩 finished 查询用途则一并删除（保留 `!scene.demo` 短路）

**测试**：
- SceneClip.test：新增「play() 返回 promise 且 onComplete 时 resolve」、
  「unmount（tl kill）后挂起的 play promise 也 resolve」
- Director.test：现有用例应全部继续通过（mock 或真实 registry 路径均可）；
  新增「api.finished() 时 playDemo 不再 play」（可用假 registry 注册已完成的 API）

## Final Review

全分支 review 用最强模型；重点检查三原则是否成立：CSS 里不再有 `:has(> .stage)`、
不再有 `stage--fullscreen`、Director 不再有 classList/MutationObserver；契约注释两处齐全。
