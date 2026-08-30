# 探索视图（Explore View）v4 · 幕式导航 + 演出编排

**作者**: yedazhi（与 AI 助手协作）
**最后更新**: 2026-08-30
**状态**: 已确认设计 + 已实施（2026-08-30，6 任务 SDD 完成 + final review clean）
**前置**: [v3 spec](./2026-08-29-explore-view-design-v3.md)（CRT 剧场视觉 + IO 错峰演出，本 spec 改**导航形态与编排**）
**关联**: [v2 spec](./2026-08-29-explore-view-design-v2.md)（Scene 协议 / yaml schema 大部分继承）

---

## 0. v4 要解决什么

v3 仍然按"博客滚动阅读"的方式把所有场景平铺在一页里。读者实际使用时常出现两类摩擦：

1. **路径无意识**：作者精心编排的"先看问题 → 看前提 → 看方案 → 看边界"的递进，被读者用 chips 一跳就破坏——结果先看方案再看问题，看到前提时已经忘了为什么；
2. **演出一锅炖**：所有场景的动画 + 打字机在视口进入时一齐播放，缺乏「按幕启动」的电影节奏感。

v4 改成**幕式导航**：单幕单屏，去掉滚动，所有演出在「幕激活」时按既定编排播放。同时：

- **主线 = 文章顺序**（yaml `scenes[]` 顺序），支线 = 现有 features/questions 出口；
- **每幕可配 3 种演出模式**（全屏动画先行 / 文字先行 / 纯文字）；
- **履历栈**记录点击路径，可一步回退或打开列表跳转；
- **点击页 = 跳过当前演出**（PPT 翻页）。

## 1. 不变的东西（v2 + v3 继承，逐条列出防止误改）

| 层 | 不变项 |
|---|---|
| 路由 | `/blog/<slug>/` 单页；无 explore 子路由；`#<scene-id>` 原生锚点 |
| yaml schema | `ExploreConfig { title, entry, scenes[] }` 大部分字段不动；本 spec 只**加** `scenes[].mode` 一个字段 |
| Scene 协议 | `Scene { name, Stage, build() }` + `DemoHandle` 不动 |
| demo 动画 | 11 + 1 个 GSAP timeline **一行不改**（Stage DOM / 选择器 / 坐标全部不动） |
| SceneClip 内部 | `ref` 容器、IO 监听、play/pause/replay/data-finished 机制**内部代码不动**；v4 改为「外部程序式触发」→ `play()` 调用入口 |
| `<Answer id>` MDX 用法 | 不变；v4 仍按 children 分区渲染（act-head / stage / dialogue / choices） |
| 无 explore 文章 | 其余 3 篇博客版式**零影响**（.post-wrap 720px 照旧） |
| CRT 剧场视觉（v3） | 暗底 / 暗角 / 扫描线 / 名字牌 / 選択肢 前缀样式不动 |
| reduced-motion | 跳过播放直达终态的行为不动 |

## 2. 导航模型：幕式（act-based）

### 2.1 从滚动 → 幕切换

**v3 行为**：所有 Answer 渲染在同一页，纵向平铺，靠 IO 进入视口触发演出。

**v4 行为**：

- **同时只有一屏可见**：当前幕占满视口；其它幕以 `display: none` 或 `hidden` 隐藏（SSG HTML 全保留，仅 CSS 隐藏——JS 关时所有幕仍可阅读）；
- **跳幕 = 切换可见性 + 激活演出**：URL hash 改变 → CSS 切换 + Director 触发当前幕演出；
- **无滚动条**：body `overflow: hidden`（探索页）；preview 内仍可在 dev tools 内看到 DOM 层级。

### 2.2 主线 / 支线

- **主线**：yaml `scenes[]` 顺序。每幕底部固定出现「▸ 继续（主线）」按钮，指向 `scenes[(idx+1) % scenes.length].id`（最后一幕绕回首幕，可后续换成"结束提示"）；
- **支线**：现有 features/questions 出口，与主线同级出现在選択肢区。支线区首位置加「─ 主线 ─」分隔与「▸ 继续」按钮，支线区再加分隔「─ 支线 ─」；
- **场景目录**：v3 右侧 fixed toc 不适合幕式（不是滚动定位了）→ 改为底栏「履历」按钮，点击弹出**面板**：上半部是当前幕的「出口树」（主线 + 支线）；下半部是**访问历史**（履历栈），点任意一条跳回该幕。

### 2.3 履历（History Stack）

- **栈项**：`{ sceneId, mode, ts }`，点击任一出口 / 「继续」时 push；
- **回退**：底栏「◀ 返回」按钮 = `pop`（一步）；履历面板里点击某项 = 跳转（不算回退，可视为"快进/倒带"）；
- **持久化**：sessionStorage 缓存，刷新页面不丢；关闭标签页清空；
- **降级**：无 JS 时履历不存在，浏览靠 hash 直达（与 v3 锚点行为一致）。

### 2.4 入口与跨文章跳转

- **首屏**：页面 mount 后读 `window.location.hash`（fallback 到 yaml `entry`）→ 激活该幕；
- **首屏无 hash 且无 entry**：默认激活 scenes[0]；
- **跨文章跳转**：仍按 v2/v3 行为——`/blog/<other>/#scene-id` 整页跳转，新页面 mount 后激活该幕。

## 3. 幕内演出编排（Director）

### 3.1 三种 mode

每幕可显式指定 `mode: 1 | 2 | 3`；未指定则默认 2。

| mode | 名称 | 序列 |
|---|---|---|
| 1 | 全屏动画先行 | CRT 舞台从 100vh 全屏显示 demo → 播完 → 缩小到 theatre 区域 → dialogue 打字 → choices 浮现 |
| 2 | 文字先行（默认） | dialogue 打字 → demo 舞台播 → choices 浮现 |
| 3 | 纯文字 | dialogue 打字 → choices 浮现（无 demo） |

注：v3 一直用 `mode 2`（但 v3 没有 mode 概念，CSS 一律文字先行 + demo 同时）。

### 3.2 演出链（Director）

新增 `useSceneDirector(scene, mode)`：

```
入场 ──► [mode 1] 全屏 demo play → 缩窗 transition → dialogue 打字 → choices
       └► [mode 2] dialogue 打字 → demo play → choices
       └► [mode 3] dialogue 打字 → choices
                                      ↓ 全部就位
                                幕激活完成（停终态）
```

**事件驱动**：每段用 `gsap.timeline`；段间 `tl.eventCallback('onComplete', next)`；Director 持有所有 timeline refs，**统一在 cleanup 里 kill**。

**点击跳过（PPT 模式）**：Director 在幕容器挂一个 `click` 监听（不冒泡到 children 交互元素——`e.target` 是非交互元素时触发）：「跳过」把所有进行中的 timeline `progress(1)` 到终态，再触发下一段。视觉上：当前演出瞬间到位，下一段立即开始。多次点击依次跳过。

不打算做一个"跳过"按钮——读者心智是「我点了页面 = 翻页」。

### 3.3 跨幕演出隔离

- **单例演出**：当前幕演出期间，新点击切幕 → 立即 `kill()` 当前幕所有 timeline + IO observer，进入下一幕；
- **保留终态**：滚回去 / 履历跳回旧幕时，**该幕已播过则直出终态**（不重播）；用 sessionStorage 存 `seenScenes: Set<sceneId>`；
- **重看按钮**：`<SceneClip>` 的 `↻ 重看` 按钮单独保留，**只重播 demo**（不影响打字机和 choices——这是 demo 自身的重看，不是幕回放）；
- **降级**：reduced-motion → mode 1 的全屏动画与 mode 2 的 demo 都直出终态；mode 3 文字直出无打字机。

## 4. yaml schema 增项

```yaml
scenes:
  - id: q-problem
    label: 公司的技术问题，都是谁在解决？
    demo: message-flood
    mode: 1                  # 新增可选字段；未指定默认 2
    features:
      - { text: AI 分身怎么安全上岗？, to: q-badge-metaphor }
      ...
```

字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `scenes[].mode` | 否 | `1` / `2` / `3` 之一；缺省 `2`（文字先行） |

**构建校验更新**（scripts/validate-explore.ts）：`mode` 必须在 {1,2,3} 内；非法值报错构建失败。

## 5. 组件结构

```
src/
  pages/
    Post.tsx                    # 改动：探索页加 <ExploreRouter/> 包整页 + body className 锁滚
  components/
    explore/
      Director.tsx              # 新建：useSceneDirector 钩子 + 编排 mode 1/2/3
      ExploreRouter.tsx         # 新建：hash 监听 + 履历栈 + 激活幕 + 给 Answer 注入导演指令
      HistoryPanel.tsx          # 新建：履历面板（出口树 + 访问历史）
      HistoryFAB.tsx            # 新建：底栏「履历」「◀ 返回」按钮
      Answer.tsx                # 改动：去掉 IO 触发；接收 Director 的 ref 句柄；改按 mode 触发演出
      SceneClip.tsx             # 改动：保留内部 IO 不动，但暴露 imperative `playSceneDemo()` / `pauseSceneDemo()` / `replaySceneDemo()` 给 Director
      ExitChips.tsx             # 改动：本地跳转走 hash + ExploreRouter.pushHistory；不再 scrollIntoView
      SceneToc.tsx              # **删除**（v3 右侧 fixed toc 不适用）
      useTypewriter.ts          # 不动（v3 已在 T5 评审修复过单位）
      useHistoryStack.ts        # 新建：sessionStorage 持久化的 push/pop/jumpTo API
      ...其余 mock-ui 原子不动
  styles/
    global.css                  # 改动：post-wrap--stage 下加 [data-active-scene] 切换；body.stage-locked overflow:hidden；新增 .history-fab/.history-panel；幕全屏样式
```

## 6. 演出链具体实现要点

### 6.1 mode 2 文字先行（默认）

```
[幕激活]
  ├─► act-head fade-in 0.4s
  ├─► dialogue 打字链：前段 onComplete → 下一段（与 v3 同款）
  ├─► StageClip 内部 IO 触发 demo play（v3 已存在的 IO 行为保留；进入视口时 play）
  ├─► choices 浮现（stagger 0.18, y 8→0）
  └─► 标记 seenScenes += sceneId
```

### 6.2 mode 1 全屏动画先行

```
[幕激活]
  ├─► act-head fade-in（缩短到 0.2s，快进感）
  ├─► StageClip 外部 playSceneDemo() 立即触发（全屏效果靠 CSS：.stage--fullscreen { position:fixed; inset:0; z-index:50 }）
  ├─► demo onComplete → 全屏退场 + 缩小动画 0.6s（power3.inOut）
  ├─► dialogue 打字链
  ├─► choices 浮现
  └─► 标记 seenScenes += sceneId
```

注：CRT 扫描线/暗角叠层在 `.stage` 内定位 = relative，所以全屏时叠层跟随全屏。

### 6.3 mode 3 纯文字

```
[幕激活]
  ├─► act-head fade-in
  ├─► dialogue 打字链
  ├─► choices 浮现（不渲染 .stage 容器，SceneClip 不存在）
  └─► 标记 seenScenes += sceneId
```

### 6.4 点击跳过

`ExploreRouter` 给当前幕容器加 `onClick={(e) => { if (interactive(e.target)) return; director.skip() }}`：

```ts
function interactive(t: EventTarget | null): boolean {
  return t instanceof Element && t.closest('a, button, [role="button"], .chip-prefix, .scene-replay') !== null
}
```

`director.skip()` 实现：

```ts
function skip() {
  // 当前段 timeline progress(1)
  for (const tl of activeTimelines) tl.progress(1)
  // 触发下一段
  stage?.then?.(() => stageDone())
}
```

不打断 SceneClip demo（demo 自己有 `↻ 重看` 按钮），但全屏退场（mode 1 缩窗 transition）会被跳过——视觉上：全屏 demo 直达终态 + dialogue 立即开始打字。

## 7. 无 JS 降级（SSG 安全）

探索页必须**无 JS 时完整可读**。CSS-only 方案：

```html
<main class="post-wrap post-wrap--stage" data-stage-nojs>
  <div class="scene" id="q-problem">…完整内容（act-head + stage + dialogue + choices）…</div>
  <div class="scene" id="q-why-not-openclaw">…</div>
  ...
</main>
```

CSS：

```css
/* 有 JS 时：单幕可见 */
.post-wrap--stage[data-has-router] .scene:not([data-active]) { display: none; }

/* 无 JS 时：所有幕可见，竖向平铺滚动 */
.post-wrap--stage:not([data-has-router]) .scene { display: block; }
```

JS hydration 时给 `<main>` 加 `data-has-router` 属性。SSR/SSG 渲染时**不带**该属性（默认无 JS 体验）。

履历栈、跳过演出、main 锁滚——全部 JS-only，无 JS 时退化到 v3 行为（平铺滚动）。

## 8. 测试策略

### 8.1 单元

- `toChineseOrdinal` 不动（v3 已在）；
- `useHistoryStack`：push / pop / jumpTo / sessionStorage 序列化往返；
- `Director.skip()`：进行中的 timeline 立刻 progress(1) + 下一段触发；
- yaml 校验：mode 字段合法（1/2/3/缺省）。

### 8.2 组件

- `ExploreRouter`：
  - 初次激活 = `location.hash` || `entry` || `scenes[0].id`；
  - 切幕时旧幕 timeline.kill()；
  - 回退 = 履历栈 pop；
  - seenScenes 直出终态不重播；
- `HistoryPanel`：出口树 + 访问历史渲染；
- `Answer`：去掉 IO 后渲染结构不变（回归 v3 测试）；
- `Post`：有 explore 时 main 含 `data-has-router` + body 含 `stage-locked` class。

### 8.3 端到手测清单（Playwright）

- 入口 hash 直达对应幕；
- 「继续」按 yaml 顺序前进；履历栈正确 push；
- 支线（features）跳转后点「◀ 返回」回到父幕；
- mode 1 / 2 / 3 实际演出链验证（观察全屏/文字/纯文字差异）；
- 点击页面空白处跳过当前演出，下一段立即开始；
- 「↻ 重看」只重播 demo，不影响打字机；
- reduced-motion：所有演出直出终态；
- 1400px 断点（v3 沿用）；
- 移动 390px：履历面板可点击展开；
- 关 JS（Playwright `javaScriptEnabled: false`）：所有幕平铺可读。

## 9. 文件改动清单

| 文件 | 动作 |
|---|---|
| `src/lib/types.ts` | + `Scene.mode?: 1 \| 2 \| 3` |
| `content/posts/ai-digital-employee/explore.yaml` | 给 q-problem 加 `mode: 1`（其余默认 2）；给 q-tiered-confirm 加 `mode: 1` |
| `src/lib/explore.ts` | + mode 字段校验 |
| `src/components/explore/useHistoryStack.ts` | 新建 |
| `src/components/explore/Director.tsx` | 新建（编排器 + skip） |
| `src/components/explore/ExploreRouter.tsx` | 新建（hash/履历/激活幕） |
| `src/components/explore/HistoryPanel.tsx` | 新建 |
| `src/components/explore/HistoryFAB.tsx` | 新建 |
| `src/components/explore/Answer.tsx` | 改：去掉 IO useEffect，接收 Director 句柄；CSS class 配合 mode 显示 |
| `src/components/explore/SceneClip.tsx` | 改：暴露 imperative API 给 Director；保留内部 IO |
| `src/components/explore/ExitChips.tsx` | 改：本地跳转走 hash + pushHistory |
| `src/components/explore/SceneToc.tsx` | **删除** |
| `src/pages/Post.tsx` | 改：探索页包 `<ExploreRouter/>`；mount 时给 main 加 `data-has-router`、body 加 `stage-locked` class |
| `src/styles/global.css` | 改：单幕可见性 / 全屏 mode 1 / FAB / 履历面板 |
| `content/posts/**` 其余 | **零改动**（铁律） |
| `content/posts/*/scene.tsx` | **零改动**（demo 一行不改铁律） |

## 10. 明确不做（本期范围外）

- 章节标题（h2/h3）放在 Answer 外（v3 现状）→ v4 保留；
- 履历持久化到 localStorage（sessionStorage 已够）；
- 键盘快捷键（左右键 / Esc）；
- 全屏 mode 1 的「剧场音效」（明确拒绝）；
- 移动端 swipe 切幕（明确拒绝，违反"线索跳转"心智）；
- v2/v3 遗留 minor 项（共 17 + 6 = 23 项）的清偿（另行处理）。

## 11. 验收标准

- 入口页打开：默认展示 entry 幕（无 hash 时）；
- 点击「继续」按 yaml 顺序前进；点击「◀ 返回」一步回退；点履历面板任一项跳回；
- mode 1 全屏动画入场；mode 2 文字先行；mode 3 纯文字；
- 点击页面空白处立即跳到当前演出终态并开始下一段；
- 「↻ 重看」只重播 demo；
- 关 JS：所有幕竖向平铺可读（与 v3 一致）；
- 无 explore 文章 4 项**零影响**；
- 测试 72 + 新增 ≥ 20 全绿；typecheck 0；validate 0/0；build 9 路由。