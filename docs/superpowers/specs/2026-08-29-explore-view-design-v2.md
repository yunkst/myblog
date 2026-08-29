# 探索视图（Explore View）v2 · 设计 spec

**作者**: yedazhi（与你协作的 AI 助手）
**最后更新**: 2026-08-29
**状态**: 起草，待评审（替换 v1）
**目标读者**: 你本人（产品决策者）+ 后续接手实现的 AI / 工程师
**关联文档**: [个人求职博客 · 设计 spec](./2026-08-28-personal-job-blog-design.md)

---

## 1. 背景与目标

同一篇博客需要两种叙事形态，服务两类阅读方式：

1. **阅读视图**（现状，`/blog/<slug>/`）：线性文章，从头读到尾，动画嵌在章节里随文播放。
2. **探索视图**（新增 `/blog/<slug>/explore/`）：以"场景"为单位，读者从某个悬念问题进入，**自动观看一段仿真 UI demo**（不是流程图、不是鸟瞰图，是一段可重看的 mock 交互录像），看完后右侧列出"系统特性 + 延伸问题"，点哪一个就跳到对应的下一个场景，递归展开。

**v1 失败回顾（明确不重蹈）**：

- v1 把舞台当"流程示意图"，动画只是淡入淡出——观众看完既没"被震撼"也没"被说服"。
- v1 允许 `status: placeholder` 的节点上树——观众点开是空的，信任崩溃。
- v1 的 yaml 是扁平问题列表，`seek` 指针指向同一根 timeline 上的不同 label——多场景切换和"重看一次"都被这层耦合堵死。
- v1 的 GSAP timeline 是"一篇文章一整条"，无法容纳"AI 数字员工"这类**多分支剧本**（不同的观众触发不同的剧本流）。

**北极星原则（不变）**：探索视图和博客是**同一份资源的不同渲染模式**。

三条铁律（保留并加强）：

- **内容只写一遍**：所有叙述文字只存在于 `article.mdx`；探索视图的解说文字从正文 `<Answer>` 块抽取，不写第二遍。
- **结构一份**：场景图（哪个场景跳到哪个场景）只在 `explore.yaml`；阅读视图不维护自己的场景列表。
- **动画一份**：场景（scene）按"剧本"组织，每篇可拥有多个独立 scene 组件；阅读视图的 `<SceneClip>` 与探索视图的 `SceneStage` 引用同一个 scene。

**本版新增的关键约束**：

- **场景是唯一单元**。探索视图 = 一张由"场景"构成的图（scene graph），递归深度不限。
- **demo 是"嵌入式应用模拟"，不是示意图**。剧本的视觉元素是真实的 DOM（IM 对话框、按钮、loading 圈、模拟鼠标指针），不是抽象符号。
- **进入即播放**。进入某个场景就从头播放该场景的 demo，结束停在终态；点 ↻ 重看。
- **placeholder 彻底废除**。没有 demo 或没有 Answer 的场景不进入场景图。

**非目标（明确不做）**：

- 全景场景关系图（visual graph overview）：本期不画"全局地图"，由场景之间的跳转关系自然构成路径
- 阅读足迹 / 节点解锁状态 / 进度统计
- 让读者在 mock UI 里真实操作（本期是纯播放，鼠标动作是动画的一部分）
- 开源骨架整理（用户明确暂缓）

---

## 2. 核心概念：场景（Scene）

**一个场景 = 一次完整的"演示 + 解说 + 出口"**。观众进入某个场景，看到的就是这一块内容：

```
┌────────────────────────────────────────────────────┐
│  场景：我是如何制作一个数字员工的？                      │
├──────────────────────────────┬─────────────────────┤
│                              │  解说（来自正文 Answer）  │
│   演示舞台（自动播放）           │  "左边演示的是 AI 数字员工的 │
│   · IM 对话框弹出               │   日常用法——从需求到执行         │
│   · 打字机输入需求              │   的完整闭环……"               │
│   · AI loading 运行            │                     │
│   · 确认卡片弹出                │  系统特性             │
│   · 模拟鼠标点击"确认"           │  · 权限复用    → 场景A │
│   · "已完成"                   │  · 自报家门    → 场景B │
│                              │  · 分级执行    → 场景C │
│   [↻ 重看]                    │                     │
│                              │  深入了解              │
│                              │  · 为什么不用 openclaw? → D │
│                              │  · 项目业绩   → E     │
│                              │  · 技术栈选择 → F     │
└──────────────────────────────┴─────────────────────┘
```

- **演示（demo）**：作者编写的"虚构剧本"，由 GSAP 编排的真实 DOM 动画。进入场景时**自动从头播放**，播放结束停在终态；点 ↻ 可重看。**纯播放型**，读者不参与交互。
- **解说**：右侧上方，等于正文 `<Answer id="...">` 包裹的那一段（详见 §4）。同一份内容，阅读视图原位渲染、探索视图抽到解说面板。
- **系统特性 + 深入了解**：两组跳转出口，结构完全相同（都是"跳到另一个场景"），只是语义分组——前者是"刚看过的 demo 里有哪些值得展开的能力点"，后者是"读者下一步可能想问的事"。两者**共享一种数据结构**，UI 上视觉区分。
- **递归无限制**：场景 A → 场景 B → 场景 C → 场景 A 也合法。跨文章跳转只是"目标场景在另一篇文章里"，URL 上多一层 `post=<slug>`。

---

## 3. 路由与信息架构

### 3.1 URL 形态

| 视图 | URL | 说明 |
|---|---|---|
| 阅读 | `/blog/<slug>/` | 现状沿用 |
| 探索（入场） | `/blog/<slug>/explore/` | 进入 `explore.yaml` 的 `entry` 场景，自动播放 |
| 探索（场景落地） | `/blog/<slug>/explore/#<scene-id>` | 同上但落地在指定场景（`#q-why-not-openclaw`） |
| 探索（跨文章） | `/blog/<other-slug>/explore/#<scene-id>` | 跳转其他文章的场景 |

### 3.2 入口

- **首页/文章卡片**：每篇博客至少展示一个"悬念问题"按钮（按钮文字 = `entry` 场景的 `label`），点击落到探索视图。
- **阅读视图**：保留"走进探索视图"链接（与 v1 一致）；正文中 `<QuestionAnchor>` 胶囊继续指向探索视图的具体场景。
- **场景间跳转**：右侧"特性"和"深入了解"列表点击后，**更新 URL hash** 并触发对应场景加载/播放；浏览器前进后退可用。
- **顶栏导航**：不加探索入口（保持「博客 / 联系」）。

---

## 4. 内容协议：article.mdx 的新增块

### 4.1 `<Answer id="...">` —— 探索视图引用的解说文字

```mdx
<Answer id="q-make-digital-employee">
左边演示的是 AI 数字员工的日常用法：从 IM 接收需求、按分级策略执行
并向人确认，到最后完成操作。这里重点展示"分级执行 + 权限复用"
两个核心特性……
</Answer>
```

- **阅读视图**：照常渲染为正文流（带左侧标记线的轻微样式），不打断阅读；
- **探索视图**：该块整体抽出，渲染进对应场景的解说面板；
- 同一段文字两种视图各自渲染，**只写一遍**。

### 4.2 `<QuestionAnchor>` —— 阅读视图里的探索入口胶囊（v1 沿用）

```mdx
正文某段…… <QuestionAnchor id="q-make-digital-employee" />
```

- 渲染为小型胶囊按钮「◈ 探索 · 我是如何制作一个数字员工的？」；
- label 文字取自 `explore.yaml` 对应场景的 `label`；
- 点击跳 `/blog/<当前slug>/explore/#<id>`。

### 4.3 `<SceneClip demo="...">` —— 阅读视图里的动画嵌入

```mdx
<SceneClip demo="make-employee" />
```

- 引用本文 scene.tsx 里的某个 demo（不是 timeline label）；
- 进入视口时播放一次，播完停在结束帧；
- 一篇文章里可放多个 `<SceneClip>`，也可以不放；
- `prefers-reduced-motion` 时直接呈现终态静帧。

---

## 5. explore.yaml schema（v2：场景图）

```yaml
# 一个例子的完整 yaml
title: 怎么让公司 ALL IN AI
entry: q-make-digital-employee

scenes:
  - id: q-make-digital-employee
    label: 我是如何制作一个数字员工的？
    demo: make-employee            # → scene.tsx 里导出的同名 demo
    features:
      - { text: 权限复用,   to: q-permission-reuse }
      - { text: 自报家门,   to: q-protocol-repo }
      - { text: 分级执行,   to: q-tiered-execution }
    questions:
      - { text: 为什么不用 openclaw?, to: q-why-not-openclaw }
      - { text: 项目业绩,            to: { post: bi-agent-7-days-saved-200k, scene: entry } }
      - { text: 技术栈选择,          to: q-tech-stack }

  - id: q-permission-reuse
    label: 权限复用：如何继承人的权限？
    demo: permission-reuse
    features: []
    questions:
      - { text: 看完整流程, to: q-make-digital-employee }    # 回到入口场景

  - id: q-why-not-openclaw
    label: 为什么不用 openclaw？
    demo: why-not-openclaw
    features: []
    questions: []
```

### 5.1 字段表

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 探索视图页面标题 |
| `entry` | 是 | 入口场景 id。打开 `/explore/` 时自动落地的场景 |
| `scenes[]` | 是 | 所有场景列表（不分层，图结构，递归） |
| `scenes[].id` | 是 | 唯一；对应正文 `<Answer id>` |
| `scenes[].label` | 是 | 树上 / 胶囊按钮显示文字 |
| `scenes[].demo` | 是 | scene.tsx 导出的 demo 名；**缺省即校验失败**（无 demo 的场景禁止存在） |
| `scenes[].features[]` | 否 | "系统特性"出口列表 |
| `scenes[].questions[]` | 否 | "深入了解"出口列表 |
| `features[].text` / `questions[].text` | 是 | 按钮文字 |
| `features[].to` / `questions[].to` | 是 | 跳转目标；见 5.2 |

**已废除字段（v1 → v2）**：

- ❌ `seek` / `seek_root`——v2 每个场景有独立 timeline，不再需要全局 seek 指针
- ❌ `status: placeholder`——彻底废除，详见 §5.3
- ❌ `kind: cross-link` / `to.post` / `to.anchor`——所有跳转都是"跳到某个场景"，跨文章也只是目标的 `post` 不同；不再有"跳到阅读锚点"这种二等公民跳转
- ❌ `preview` / `detail`——解说文字统一从 `<Answer>` 抽，不在 yaml 里写文案

### 5.2 跳转目标 `to` 的三种形态

```yaml
# 形态 1：本文章内跳转
to: q-permission-reuse

# 形态 2：跨文章，跳到另一个 entry 场景
to: { post: bi-agent-7-days-saved-200k, scene: entry }

# 形态 3：跨文章，跳到指定场景
to: { post: ai-it-system, scene: q-search-pipeline }
```

形态 2 是常用的"读完整段之后，回到原文主线"出口；形态 3 用于"两个场景确实相关"的相互跳转。

### 5.3 占位（施工中）政策：彻底废除

- 一个场景没有 demo 动画或没有 `<Answer>` 文字 → **校验直接报错**，构建失败；
- 想预告"我正在写" → **正文里写施工预告段落**（与 v1 一致，沿用），不在探索视图留空节点；
- 旧 v1 的 `status: placeholder` 节点在迁移过程中**整体删掉**，不保留。

---

## 6. 场景协议与 mock UI

### 6.1 Scene 接口（v2：每个场景一个独立 demo）

```ts
// src/components/explore/SceneController.ts

/** 一个 demo = 一段可独立播放的 mock UI 动画 */
export interface Scene {
  /** demo 名称（与 yaml `demo` 字段对齐，构建时校验） */
  name: string
  /** 渲染静态 mock UI 框架（无动画）—— DOM 真实存在，GSAP 操纵它 */
  Stage: ComponentType
  /** 构建按事件序列编排的 GSAP timeline（无 label 需求） */
  build(): gsap.core.Timeline
}

export interface SceneHandle {
  play(): void         // 从头播放
  pause(): void
  reset(): void        // 回到时间 0
  kill(): void         // 组件卸载时调用，防内存泄漏
}

/** scene.tsx 导出一个 demos 字典 */
export const demos: Record<string, Scene>
```

**与 v1 关键差异**：

- 每个场景**独立 timeline**，不再共享一根大 timeline；
- 无 `seek(label)` / `focus()` 接口（这两个语义已不存在：场景切换是"换 scene"而不是"切 label"）；
- 无 `labels()` —— 校验 demo 名是否存在改成静态扫描 scene.tsx 导出键。

### 6.2 mock UI 的真实 DOM 约定

**demo 舞台不是 SVG 流程图，是真实的 HTML/CSS 组件树**。所有视觉元素都是 DOM：

| 视觉元素 | 实现 | 动画手法 |
|---|---|---|
| IM 对话框 | `<div class="chat-pane">` + 嵌套消息行 | GSAP 操纵 opacity / translateY |
| 打字机文字 | `<span class="typing">` | `tl.call(() => appendChar())` 逐字追加 |
| Loading 圈 | `<div class="spinner">` | CSS rotation 或 GSAP rotation |
| 确认按钮 | `<button class="confirm-btn">` | GSAP 弹入（scale 0 → 1） |
| 模拟鼠标指针 | `<div class="cursor-mock">` | `tl.to(cursor, { x, y, duration })` 移动 |
| 状态灯 | `<div class="status-light state-pending">` | class 切换 + CSS transition |

**关键设计原则**：每个元素在 `Stage` 里就是真实 DOM（不是抽象符号），GSAP 通过 ref 选择器操纵它；动画的本质是"操纵一个真实网页"，而不是"画一张抽象图"。

### 6.3 生命周期与可访问性

- 进入场景：组件 mount 后 GSAP timeline 自动 `play()`（从头播放）；
- 播放完成：停在终态，timeline 不循环；
- ↻ 重看：`tl.seek(0).play()`；
- 组件 unmount：`tl.kill()`；
- `prefers-reduced-motion`：`tl.pause(0)` + 跳过所有 `tl.to`，直接渲染终态静帧。

### 6.4 demo 的两档复杂度

| 档 | 视觉语言 | 适用 | 成本 |
|---|---|---|---|
| **体验型** | mock UI：IM 对话框、打字机、确认按钮、模拟鼠标指针——观众"亲眼看一遍操作" | 演示系统真实交互流程（如分级执行的确认闭环） | 高（需要 mock UI 原子组件） |
| **概念型** | 图形叙事：元素逐条出现、对比并置、堆积溢出、状态翻转——有叙事节拍但非 UI 拟真 | 论证一个观点（如"三个坑逐个砸下来""消息轰炸淹没一个人"） | 低（每段 3-6 秒） |

一篇博客的 demo 组合策略：**入口场景和核心方案场景用体验型，其余论证场景用概念型**。两类共享同一套 mock UI 原子（IM 框、消息气泡、打字机、按钮、模拟光标），使"问题提出"与"方案演示"能形成视觉呼应（开场消息轰炸淹没 → 结尾消息井然有序被处理）。

**论证优先原则**：无论哪一档，demo 里每一个动作必须对应正文里的一个论点——动画不是配图，是**观点的可视化证明**。画面讲不出论点的段落，不配动画（正文文字自足即可）。

---

## 7. 组件结构

```
src/
  pages/
    Post.tsx                    # 阅读视图（<Answer>/<QuestionAnchor>/<SceneClip> 适配）
    Explore.tsx                 # 探索视图入口（读 entry / hash、注入 AnswerProvider）
  components/
    blog-anim/                  # 全站动画原子（不动）
    explore/                    # 探索机制
      ExploreView.tsx           # 场景页骨架：左舞台 + 右解说/特性/问题
      SceneStage.tsx            # mount scene、持 SceneHandle、自动 play
      SceneController.ts        # Scene/SceneHandle 接口 + demos 注册
      SceneGraph.tsx            # 渲染右侧 features/questions 列表 + 跳转
      SceneClip.tsx             # 阅读视图嵌入
      Answer.tsx                # <Answer> 块渲染（两视图共用）
      QuestionAnchor.tsx        # 阅读视图胶囊
  lib/
    content.ts                  # 改：目录结构迁移
    explore.ts                  # 重写：v2 schema 解析 + 校验
    explore.client.ts           # 浏览器侧（与 v1 同模式）
```

---

## 8. 构建管线

1. **内容扫描**：`content/posts/*/article.mdx` + 同目录 `explore.yaml` + `scene.tsx`；
2. **scene 模块注册**：`import.meta.glob('../content/posts/*/scene.tsx', { eager: true })`，导出 `demos` 字典；
3. **资源同步**：构建时把 `assets/` 拷到 `public/posts/<slug>/`（保持现有图片引用不失效）；
4. **构建时校验**（`scripts/validate-explore.ts`，prebuild/predev/prepreview）：
   - yaml `entry` 指向存在的场景；
   - 所有 `scenes[].id` 在正文 `<Answer id>` 中存在（**且非 placeholder——placeholder 已废除**）；
   - 正文 `<Answer id>` 均被某个场景引用（否则警告：探索视图用不上）；
   - 所有 `scenes[].demo` 在 scene.tsx 导出中存在；
   - 所有 `to` 指向真实存在的场景（`{ post, scene }` 时跨文章校验）；
   - 循环引用允许（v2 显式支持递归），但同一 `post:scene` 路径不能无限（不强制深度限制，让作者自负责任）。

---

## 9. 响应式布局

- **桌面（≥920px）**：左右分栏——左 demo 舞台（大）、右解说 + 特性 + 问题（窄列）；
- **移动（<920px）**：上下布局——demo 在上（全宽）、解说什么的在下面；点击跳转后自动滚动到顶部，舞台重新播放。

---

## 10. 首篇内容

### 10.1 场景图（`ai-digital-employee`）

> 入口选择 **问题提出** 而非方案演示：观众看到结果前要先建立问题感，否则不解“为什么这样做”。打字机在 IM 窗口里逐条弹出消息，堆积、溢出、淹没——本身就是论证“痛点不是问题多，是一个人处理不过来”。

```yaml
title: 一个 AI 数字员工平台
entry: q-problem

scenes:
  # ─── 入口（体验型 demo）───
  - id: q-problem
    label: 公司的技术问题，都是谁在解决？
    demo: message-flood             # IM 窗口里消息逐条打字机弹出→堆积溢出→点题
    features:
      - { text: AI 分身怎么安全上岗？, to: q-badge-metaphor }
      - { text: 直接看确认流程,       to: q-tiered-confirm }
    questions:
      - { text: 第一次尝试为什么失败？, to: q-why-not-openclaw }
      - { text: 这套方案的边界,       to: q-limits }
      - { text: 未来还能怎么扩展？,   to: q-future }

  # ─── 方案核心场景（部分体验型 + 部分概念型）───
  - id: q-why-not-openclaw
    label: 第一次尝试：为什么没用 openclaw？
    demo: openclaw-pitfalls           # 概念型：三个坑（凭证/权限/审计）逐条砸下来
    questions:
      - { text: 正确的前提是什么？, to: q-four-prerequisites }

  - id: q-four-prerequisites
    label: AI 安全上岗的四个前提
    demo: four-prerequisites          # 概念型：四前提依次点亮
    questions:
      - { text: 看整体设计, to: q-badge-metaphor }

  - id: q-badge-metaphor
    label: 一句话方案：把工牌借给 AI
    demo: badge-metaphor              # 概念型：员工刷门动画，门=接口权限
    features:
      - { text: 协议仓库,  to: q-protocol-repo }
      - { text: 统一身份,  to: q-unified-identity }
      - { text: 分级执行,  to: q-tiered-execution }
    questions:
      - { text: 直接看分级确认流程, to: q-tiered-confirm }

  - id: q-protocol-repo
    label: 第一层：让接口自报家门
    demo: protocol-repo               # 概念型：接口标注 → 导出协议仓库
    questions:
      - { text: 上一层：工牌比喻, to: q-badge-metaphor }
      - { text: 下一层：统一身份, to: q-unified-identity }

  - id: q-unified-identity
    label: 第二层：AI 走人一样的权限通道
    demo: unified-identity            # 概念型：请求流向，身份透传标记
    questions:
      - { text: 上一层：协议仓库, to: q-protocol-repo }
      - { text: 下一层：分级执行, to: q-tiered-execution }

  - id: q-tiered-execution
    label: 第三层：分级执行（总览）
    demo: tiered-execution            # 概念型：四级策略决策树动画
    questions:
      - { text: 看一段真实确认流程, to: q-tiered-confirm }

  - id: q-tiered-confirm
    label: 一段确认流程（体验型 demo）
    demo: tiered-confirm              # 体验型：IM 打字→AI loading→确认卡→模拟鼠标点确认→完成
    features:
      - { text: 回到问题入口, to: q-problem }
      - { text: 看分级策略总览, to: q-tiered-execution }
    questions:
      - { text: 这套方案解决不了什么？, to: q-limits }

  # ─── 延伸场景 ───
  - id: q-threat-model
    label: 威胁模型：平台约束的是 AI，不是人
    demo: threat-model                # 概念型：增量层叠加示意
    questions:
      - { text: 回到入口, to: q-problem }

  - id: q-limits
    label: 这套方案解决不了什么
    demo: limits                      # 概念型：五条边界逐条浮现
    questions:
      - { text: 未来还能怎么扩展？, to: q-future }
      - { text: 回到入口, to: q-problem }

  - id: q-future
    label: 未来拓展：让 AI 替我接需求
    demo: dev-flow                    # 概念型：需求→方案→触发→落地→CI/CD→发布
    questions:
      - { text: 回到入口, to: q-problem }
```

### 10.2 demo 档位分布

| 场景 | demo 类型 | 关键画面 |
|---|---|---|
| q-problem（入口） | **体验型** | IM 窗口、消息气泡、打字机、堆积溢出 |
| q-why-not-openclaw | 概念型 | 三坑逐条出现 |
| q-four-prerequisites | 概念型 | 四前提依次点亮 |
| q-badge-metaphor | 概念型 | 员工刷门动画，门 = 接口权限 |
| q-protocol-repo | 概念型 | 接口标注 → 协议仓库导出 |
| q-unified-identity | 概念型 | 请求流向图，身份透传标记 |
| q-tiered-execution | 概念型 | 四级策略决策树 |
| q-tiered-confirm | **体验型** | IM 框、确认卡、模拟鼠标 |
| q-threat-model | 概念型 | 增量层叠加 |
| q-limits | 概念型 | 五条边界逐条浮现 |
| q-future | 概念型 | 开发流节点 |

### 10.3 正文改造范围

1. **Answer 包裹**：现有 8 个核心章节叙述（背景/openclaw/前提/工牌/三层/威胁/边界/未来）改为 `<Answer id="q-xxx">` 包裹；
2. **入口 Answer**：新增一个体验视角的入口 Answer（IM 视角，与现有"设计视角"引言互补，可放在引言之后）；
3. **问题未覆盖的，先不上树**：「项目业绩 / 项目进展」正文无对应内容，按 v2 规则（§5.3）不上树；后续补写正文章节后再加场景；
4. **胶囊与嵌入**：每个核心章节放 `<QuestionAnchor>`（阅读→探索跳转）和 `<SceneClip>`（章节内嵌 demo 播一遍），阅读视图体验增强但线性结构不动。

### 10.4 其他文章

| 文章 | 处理 |
|---|---|
| **`ai-it-system`**（重做） | 入口场景改为"一条 badcase 报告的旅程" mock（IM 报告 → AI commit → CI 灯变绿 → MR 合并 → 全程 6 步几乎零沟通）。废掉所有 v1 placeholder 节点，正文施工预告段落保留 |
| 其他 3 篇 | 不动（无 explore.yaml，受 v2 影响为零） |

---

## 11. 测试策略

- **单元**：v2 yaml 解析与校验规则（每条规则一个用例）；SceneHandle play/pause/reset/kill；SceneGraph 跳转目标解析（本地 / 跨文章）；mock UI 组件渲染；
- **组件**：ExploreView 渲染场景、AnswerProvider 注册链路、SceneGraph 列表渲染、跨文章 URL 拼接；
- **端到端手测清单**：入场自动播放、↻ 重看、跨文章跳转、reduced-motion 降级、浏览器前进后退、移动端跳转后滚动。

---

## 12. 里程碑（建议实现顺序）

1. **基础设施**：`lib/explore.ts` v2 schema 解析 + 校验、`Scene/SceneHandle` 接口调整、demo 模块注册机制（沿用 v1 的 `?raw` glob 模式）；
2. **场景图组件**：SceneGraph（特性 / 问题列表 + 跳转）+ ExploreView 重写（场景页骨架，左 demo 右解说/出口）；
3. **mock UI 原型**：做一个 demo 原子库（IM 对话框、按钮、loading、模拟鼠标等），先在 ai-digital-employee 第一个场景落地，验证 mock UI 真实 DOM + GSAP 编排可行；
4. **首篇内容**：ai-digital-employee 全场景按你给的剧本原样落地（4 个深入问题中能写出 Answer + demo 的全部上树）；
5. **迁移**：ai-it-system 重做（删 placeholder、改入口场景为 badcase 旅程）；
6. **回归**：v1 旧测试与 fixture 全部重写以匹配 v2 schema；旧 yaml 在迁移过程中删掉。

每步独立可交付，前 3 步完成后现有网站行为不变（无 explore.yaml 的文章不受影响）。