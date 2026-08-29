# 探索视图（Explore View）v3 · 版式与演出 spec

**作者**: yedazhi（与 AI 助手协作）
**最后更新**: 2026-08-29
**状态**: 已确认（用户选定样张 D 方向，含用户追加要求：打字机用 GSAP）；已实施（2026-08-29，6 任务 SDD 完成）
**前置**: [v2 spec](./2026-08-29-explore-view-design-v2.md)（架构层全部继承，本 spec 只改**版式与演出**）
**样张**: `dist/mockup-v3-d.html`（构建产物，最终视觉以它为准）

---

## 0. v3 要解决什么

v2 交付后用户反馈：页面"还是博客观感"——demo 挤在 720px 窄栏里，横向空间浪费，文字与动画平铺直叙，没有"剧场感"。

v3 在**完全不动 v2 架构**（路由 / yaml schema / Scene 协议 / IntersectionObserver 触发 / 测试体系）的前提下，重做探索文章页的**版式与演出**：

1. **版式**：从"720px 博客单栏"变为"暗厅 + CRT 电视机舞台"——demo 放进全宽"屏幕"，解说变成 galgame 底部文本窗，出口 chips 变成居中選択肢菜单；
2. **演出**：所有内容元素**进入视口才播放**（打字机 / 浮现 / 弹出），视线外不浪费动画；
3. **打字机统一用 GSAP timeline 实现**（用户明确指定），与 demo 动画同一技术栈。

## 1. 不变的东西（v2 继承，逐条列出防止误改）

| 层 | 不变项 |
|---|---|
| 路由 | `/blog/<slug>/` 单页；无 explore 子路由；`#<scene-id>` 原生锚点 |
| yaml schema | `ExploreConfig { title, entry, scenes[] }`，字段与校验规则不动 |
| Scene 协议 | `Scene { name, Stage, build() }` + `DemoHandle` 不动 |
| demo 动画 | 11 + 1 个 GSAP timeline **一行不改**（Stage DOM / 选择器 / 坐标全部不动） |
| 触发机制 | SceneClip 的 IntersectionObserver threshold 0.3、play/pause/replay/data-finished 机制不动 |
| MDX 内容 | 两篇 article.mdx **一个字不改**（Answer/SceneClip 用法照旧） |
| 无 explore 文章 | 其余 3 篇博客版式**零影响**（.post-wrap 720px 照旧） |
| reduced-motion | 跳过播放直达终态的行为不动（新增文字动效同样遵守） |

## 2. 版式骨架

### 2.1 探索文章页整体（Post.tsx + CSS）

有 explore.yaml 的文章，`<main>` 加 `post-wrap--stage` 修饰类：

```
┌────────────────────────────────────────┬──────────┐
│ 顶栏（不动）                              │          │
│────────────────────────────────────────│  场景目录  │
│ 扉页标题卡（居中，仿宋，非 900 黑体）        │ (fixed,  │
│────────────────────────────────────────│  ≥1400px)│
│ 场景 theater × N（全宽 ~1020px）          │          │
│────────────────────────────────────────│          │
│ 上一篇/下一篇（720px 窄栏照旧）             │          │
└────────────────────────────────────────┴──────────┘
```

- `.post-wrap--stage`：max-width 从 720px 放宽到 1120px（标题/meta/post-nav 内部仍限 860px 居中，正文 theater 区 ~1020px）
- `.scene-toc`：保持 fixed 右侧（176px），**≥1400px 才显示**（原 920px 断点改为 1400px，因为正文变宽后 920-1400 区间会重叠——这是 v2 遗留 CSS bug 的修正）；1400px 以下隐藏（移动端 details 折叠照旧）

### 2.2 场景 theater 解剖（Answer.tsx 分区渲染）

`<Answer id>` 已持有 yaml config，把 children 按 `type === SceneClip` 分区：

```
┌─ .theater #q-xxx ──────────────────────────────┐
│ .act-head：第一幕（仿宋 accent）+ 章节标题 + 细线   │
│ .stage：CRT 电视机屏幕                            │
│   ┌──────────────────────────────────────────┐ │
│   │ DEMO · message-flood          CH-01      │ │
│   │        [demo Stage 原样渲染]               │ │
│   │        [聚光 radial-gradient]              │ │
│   │        [CRT 弧形暗角 + 扫描线叠层]           │ │
│   │                              [↻ 重看]     │ │
│   └──────────────────────────────────────────┘ │
│ .dialogue：底部文本窗（galgame）                   │
│   [解 说]←名字牌骑窗框                           │
│   解说文字（children 里非 SceneClip 的部分）       │
│   「引用金句」← blockquote 样式                   │
│ .choices：選択肢（ExitChips 重样式）               │
│   ─ 選択肢 ─                                    │
│   [▸ AI 分身怎么安全上岗？]                       │
│   [？ 第一次尝试为什么失败？]  ← dashed 边         │
└─────────────────────────────────────────────────┘
```

**分区规则**：
- children 里 `type === SceneClip` 的元素 → 全部进 `.stage > .stage-inner`；
- 其余（p / strong / img / table / blockquote / ArchDiagram…）→ 进 `.dialogue`；
- **没有 SceneClip 的 Answer**（纯文字场景）：不渲染 `.stage`，只渲染 `.act-head + .dialogue + .choices`——版式退化为"标题 + 文本窗 + 選択肢"，与 theater 风格一致；
- `act-no`（第一幕/第二幕…）由 Answer 按 yaml scenes[] 顺序计算（`index + 1` → 中文数字），不写入 MDX；
- 章节标题（h2/h3）：MDX 里写在 Answer **外**（现状如此，如 `## 背景：公司技术就我一个人` 在 `<Answer>` 内第一行）。Answer 分区时把**位于 children 最前部的 heading**提取到 `.act-head` 渲染（rehype-heading-ids 已给它 id，保留）。

### 2.3 幕序号（act-no）计算

Answer 查 `config.scenes` 中 `id === props.id` 的 index：
- `第 1 项` → `第一幕`、`第 2 项` → `第二幕`…（中文数字转换函数写在 lib/explore.ts，纯函数 + 单测）
- yaml 里找不到 id（孤儿 Answer）→ 不渲染 act-no，只渲染标题（与 v2 的孤儿容忍一致）

## 3. 视觉语言（CSS）

### 3.1 设计 token（只作用于探索文章页，用 `.post-wrap--stage` 作用域前缀隔离）

```
--bg: #0B100E        页面底（墨绿黑）
--panel: #0F1512     theater 面板
--text: #DCE5E1      正文（浅灰绿）
--dim: #8CA098       次级
--faint: #56665F     弱化
--line: rgba(220,229,225,0.12)
--acc: #4CC2A3       翠绿 accent
--mark: #E06A5A      警示红（questions 前缀）
```

**作用域隔离铁律**：所有新样式写在 `.post-wrap--stage` 前缀下；无 explore 文章的 `.post-wrap` 不受任何影响。探索页内的 `--ink`/`--paper` 系列变量在该作用域内被覆盖映射（`--ink → --text` 等），使 demo/mock-ui 现有样式无需改动即在暗底上正确显示（demo 内部白色 UI 组件自带底色，天然是"屏幕中的屏幕"）。

### 3.2 CRT 舞台（.stage，纯 CSS 叠层，0 改动 demo）

```
.stage          深黑底 #060907 + 圆角 14px + 外投影 + inset 辉光
.stage::before  弧形暗角：radial-gradient 椭圆（中心透明 → 边缘黑），z-index 3
.stage::after   扫描线：repeating-linear-gradient 3px 周期 + mix-blend-mode: overlay，z-index 3
.stage-spot     中央聚光：radial-gradient 翠绿 9% 透明度，z-index 1
.stage-inner    z-index 2，flex 居中，容纳 SceneClip
.stage-tag      左上 "DEMO · <name>"（mono 11px faint）
.stage-ch       右上 "CH-01"（mono 11px，幕序号）
```

**关键约束**：`::before/::after` 是 pointer-events:none 的纯视觉叠层，**不拦截 demo 交互、不改变 demo DOM**；SceneClip 渲染在 `.stage-inner` 内（z-index 2 在叠层之下但视觉上透过透明区可见）。

### 3.3 文本窗（.dialogue）

- 边框 + 半透明白底（rgba(255,255,255,0.025)）+ 圆角 8px；
- `.dlg-name`「解 说」名字牌：absolute 骑在窗框顶边（translateY(-50%)），翠绿底深色字，仿宋加宽字距；
- 内部 p/strong/blockquote 沿用 .post-body 现有元素样式，但颜色映射到暗色 token（`.post-wrap--stage` 作用域内覆写）；
- blockquote → `.dlg-quote` 视觉（左竖线 + accent-soft 底 + 仿宋）。

### 3.4 選択肢（.choices，改造 ExitChips 容器样式）

- 居中纵排菜单；`─ 選択肢 ─` 标签（mono 11px 宽字距）；
- `.choice`：min(500px, 100%) 宽、边框 1px 翠绿 42% 透明、圆角 4px、hover 时 translateX(7px) + 底色 accent-soft；
- features 前缀 `▸`（翠绿）、questions 前缀 `？`（警示红）+ dashed 边框——沿用 v2 的 features/questions 双组语义，只换皮；
- ExitChips.tsx 的 DOM/逻辑不动（本地 pushState+scroll / 跨文章原生 a 照旧），只改 CSS 类名对应样式 + 前缀字符。

### 3.5 扉页标题卡（.post-head--stage）

- 居中排版：meta 行（mono 宽字距 faint）→ 仿宋标题（clamp 22-30px，字重 600，非 900 黑体）→ 48px 细线（accent）→ 提示语（mono 12px）；
- meta 行格式：`<domain> · <date> · ARCHIVE <slug大写>`。

## 4. 演出层：GSAP 打字机 + IO 错峰

### 4.1 触发原则（用户核心要求）

**视线外不播放**。每个演出元素独立 IntersectionObserver 监听，进入视口才启动；已播放的保持终态（滚回去不重播）；未播完离开视口则 pause（demo 现状照旧，文字冻结进度）。

### 4.2 各元素演出规格

| 元素 | IO threshold | 演出 | 实现 |
|---|---|---|---|
| `.act-head`（幕号+标题） | 0.5 | 整块 fade-in 0.4s（opacity 0→1） | CSS transition + IO 加类 |
| demo（SceneClip） | 0.3（现状） | GSAP timeline 从头播（**现状不动**） | SceneClip 现有逻辑 |
| `.dialogue` 内文本段 | 0.4 | **GSAP 打字机**：逐字符显示，中文 28ms/字符；段与段间隔 300ms 顺序播放 | 新 `useTypewriter` hook（见 4.3） |
| `.choices` | 0.5 | 容器 fade-in + 每条 choice 依次 translateY(8px)→0 浮现，间隔 180ms | GSAP timeline + IO |
| CRT 舞台整体 | 随 demo | 不单独演出（demo 自带开场） | — |

### 4.3 GSAP 打字机（用户指定技术栈）

新增 `src/components/explore/useTypewriter.ts`：

```ts
/**
 * GSAP 驱动的逐字打字机。
 * - 对一段已渲染的 DOM 文本节点按字符揭示（不是重建字符串）：
 *   先把原文本切分为字符数组，GSAP timeline 用 tl.call 逐字符设置
 *   textContent = chars.slice(0, i).join('')——与 mock-ui Typewriter
 *   同款手法（项目 GSAP core，无 TextPlugin）。
 * - strong/em/code 等内联标记：提取时按"纯文本序列"打字（标记样式在
 *   打完后一次性恢复原 innerHTML）——样张 D 已验证此法视觉正确。
 * - reduced-motion：不建 timeline，直接显示原文。
 * - 返回 play() 句柄；组件卸载 kill()。
 */
export function buildTypewriterTimeline(el: HTMLElement): gsap.core.Timeline
```

**接入点**：Answer.tsx 的 `.dialogue` 容器挂 ref；IO 进入（threshold 0.4）后：
1. 容器 fade-in；
2. 依次对每个文本段落建 typewriter timeline，前一段 onComplete 触发下一段（`tl.eventCallback('onComplete', ...)` 链式）；
3. 段落提取规则：`.dialogue` 的直接子元素中 `p`、`.dlg-quote`（blockquote）参与打字；`img/table/ArchDiagram` 等非文本元素**不打字**，整块随容器 fade-in；
4. 打字期间段落 `min-height` 锁定（防布局跳动——样张 D 已用 min-height: 1.9em 验证）。

**回答从 children 抽文本的落地**：不需要真的"从 React children 抽字符串"——Answer 渲染 children 到 `.dialogue` 后，DOM 里文本已存在；useTypewriter 直接操作**已渲染的 DOM**（读 textContent → 打字 → 恢复 innerHTML）。SSG 首屏仍是完整原文 HTML（打字是 hydration 后的增强），SEO/无 JS 可读性不受影响。

### 4.4 選択肢浮现

`.choices` 容器 IO 进入后：GSAP timeline `tl.to(label, {opacity:1}) → tl.to(choices, {opacity:1, y:0, stagger:0.18})`。SSG 原态：CSS 里 `.choices .choice { opacity:0 }` 会导致**无 JS 时選択肢永远不可见**——改为默认可见，hydration 后 GSAP `tl.set` 立即归零再演（仅当 IO 即将触发时；reduced-motion / 无 JS 直接可见）。**采用此方案：无 JS 退化安全**。

（act-head/dialogue 容器的初始隐藏同理：默认可见，hydration 后才归零重演——保证 SSG HTML 直出可读。）

### 4.5 章节标题（act-head）

CSS transition + IO 加 `.in-view` 类即可（0.4s fade），不需要 GSAP。默认可见（同 4.4 理由），hydration 后归零重演。

## 5. 文件改动清单

| 文件 | 动作 |
|---|---|
| `src/lib/explore.ts` | + `toChineseOrdinal(n: number): string` 纯函数 |
| `src/lib/explore.test.ts` | + 幂等单测（1-12, 0, 负数边界） |
| `src/components/explore/useTypewriter.ts` | 新建：GSAP 打字机 timeline 构建器 |
| `src/components/explore/useTypewriter.test.ts` | 新建：字符揭示顺序 / reduced-motion 直出 / kill 清理 |
| `src/components/explore/Answer.tsx` | 分区渲染重构：act-head 提取 + stage/dialogue 容器 + IO 接线 + 幕序号 |
| `src/components/explore/Answer.test.tsx` | 改：分区结构断言（stage 有 SceneClip 场景 / 无 SceneClip 退化 / act-no 文案 / chips 仍渲染） |
| `src/components/explore/ExitChips.tsx` | DOM 微调：前缀字符 ▸/？（逻辑不动） |
| `src/pages/Post.tsx` | + `post-wrap--stage` 类（有 config 时）；+ 扉页标题卡结构（有 config 时替换原 h1/excerpt 区） |
| `src/pages/Post.test.tsx` | + 有/无 explore.yaml 的类断言 |
| `src/styles/global.css` | + `.post-wrap--stage` 作用域整段（设计 token 覆写 + theater/stage/dialogue/choices/title-card 全部样式）；改 `.scene-toc` 断点 920→1400 |
| `content/posts/**` | **零改动**（铁律） |

## 6. 测试策略

- **单元**：toChineseOrdinal；buildTypewriterTimeline 字符揭示数列 / reduced-motion / kill 后无泄漏；
- **组件**（jsdom + IO mock，沿用现有 SceneClip 测试手法）：
  - Answer 分区：有 SceneClip → `.stage` 存在且 SceneClip 在其中；无 SceneClip → 无 `.stage`；
  - act-no 幕序号文本（`第一幕`）；孤儿 Answer 无幕号；
  - ExitChips 前缀字符渲染；
  - Post：`post-wrap--stage` 仅当有 explore.yaml；
- **SSG 安全**：打字机/隐藏初始态必须在无 JS 下内容完整可读（默认可见 + hydration 后归零重演原则）；
- **端到端手测**（Playwright，构建产物）：滚动逐场景触发 / 滚回不重播 / 锚点直达场景（`#entry`）后该场景正常触发 / reduced-motion 直出终态 / 1400px 断点目录显隐 / 移动 390px 单列。

## 7. 明确不做（本期范围外）

- 锁滚 SPA / wheel-jacking（参考站路线，与滚动阅读原则冲突，明确拒绝）；
- WebGL 背景（博客不需要）；
- 开机屏（CONTINUE WITH/WITHOUT SOUND 那种入场门槛——demo 站的做法，博客加门槛伤读者）；
- 音效；
- 深色/浅色主题切换（探索页固定暗色）；
- v2 遗留 17 项 minor 的清偿（另行处理）。
