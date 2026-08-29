# 探索视图（Explore View）v2 · 设计 spec

**作者**: yedazhi（与你协作的 AI 助手）
**最后更新**: 2026-08-29
**状态**: 起草，待评审（替换 v1）
**目标读者**: 你本人（产品决策者）+ 后续接手实现的 AI / 工程师
**关联文档**: [个人求职博客 · 设计 spec](./2026-08-28-personal-job-blog-design.md)

---

## 1. 背景与目标

同一篇博客有**两种使用方式**，服务两类阅读习惯，但**只有一套页面**：

1. **顺序阅读**：从头滚到尾，demo 随章节内嵌播放；
2. **跳转探索**：从首页的"悬念问题"按钮或页面右侧的"场景目录/出口 chips"跳到任意场景，递归展开。

**v1 失败回顾（明确不重蹈）**：

- v1 把舞台当"流程示意图"，动画只是淡入淡出——观众看完既没"被震撼"也没"被说服"。
- v1 允许 `status: placeholder` 的节点上树——观众点开是空的，信任崩溃。
- v1 的 yaml 是扁平问题列表，`seek` 指针指向同一根 timeline 上的不同 label——多场景切换和"重看一次"都被这层耦合堵死。

**v2 第一次失败回顾（明确不重蹈）**：

- 把"同一份资源，两种渲染模式"误读成"维护两个页面"——结果是双视图同步、双文件 lib、hash 时序 hydration 等一整层复杂度，而收益（单场景沉浸模式）不值得。

**v2 终态设计**：

- **只有一套页面**：所有场景按 `article.mdx` 章节顺序竖向平铺，每个场景内嵌 `<SceneClip>`；
- **探索 = 跳转**：右侧场景目录 + 每个场景下方的出口 chips，让读者在不离开当前页面的前提下"跳跃式探索"，跨文章跳页；
- **入场**：首页/文章卡片的"悬念问题"按钮指向 `#<entry-id>`，浏览器原生 anchor scroll + IntersectionObserver 触发播放。

**北极星原则（保留并强化）**：**同一份资源，两种使用方式**——通过导航形状（顺序 vs 跳转）区分，不再通过页面形态区分。

三条铁律：

- **内容只写一遍**：所有叙述文字只存在于 `article.mdx`；场景目录、出口 chips 全部引用 `<Answer>` 的 `id` 与 demo 名，**不写第二遍文案**。
- **结构一份**：
  - 场景图（哪些场景存在、彼此如何跳转）只在 `explore.yaml`；
  - 阅读顺序由 `article.mdx` 章节顺序 + `<SceneClip>` 位置决定；
  - 两者引用同一批 demo + 同一批 Answer。
- **动画一份**：每篇可拥有多个独立 demo 组件；`<SceneClip>` 是唯一播放入口。

**非目标（明确不做）**：

- 全景场景关系图（visual graph overview）：本期不画"全局地图"，由场景之间的跳转关系自然构成路径
- 阅读足迹 / 节点解锁状态 / 进度统计
- 让读者在 mock UI 里真实操作（本期是纯播放，鼠标动作是动画的一部分）
- 单场景沉浸模式（全屏只放一个场景的剧场感）：与 v2 第一次设计相比的取舍，换取架构简化
- 开源骨架整理（用户明确暂缓）

---

## 2. 核心概念：场景（Scene）

**一个场景 = 章节 + demo + 出口**。一篇文章的全部场景按章节顺序竖向平铺在一个页面里：

```
┌─────────────────────────────────────────────────────┐
│  文章标题 / 「顺序阅读或点击出口探索」提示语              │
├─────────────────────────────────────────────────────┤
│ ▸ 场景 1：公司的技术问题，都是谁在解决？  (#q-problem)   │
│ ┌─────────────────────────┐                         │
│ │ demo: message-flood      │  正文（Answer 原位渲染）  │
│ │ IM 窗口消息轰炸→淹没       │  "公司的技术人员只有…      │
│ │ （滚入视口自动播放）        │  ……能不能做一个 AI 分身？" │
│ └─────────────────────────┘  [↻ 重看]                │
│   出口: [AI 分身怎么安全上岗 →] [第一次尝试为什么失败 →]   │
├─────────────────────────────────────────────────────┤
│ ▸ 场景 2：第一次尝试为什么失败？  (#q-why-not-openclaw)  │
│ ┌─────────────────────────┐                         │
│ │ demo: openclaw-pitfalls  │  正文……                  │
│ └─────────────────────────┌  出口: [正确的前提是什么 →] │
├─────────────────────────────────────────────────────┤
│   …… 全部场景依章节顺序铺开 …                           │
└─────────────────────────────────────────────────────┘
        ▲
        │ 右侧悬浮：场景目录（有序，点击滚动到对应场景）
```

- **demo**：作者编写的"虚构剧本"，由 GSAP 编排的真实 DOM 动画。滚动入视口时自动从头播放一次，播完停终态；↻ 重看随时可用。**纯播放型**。
- **正文（解说）**：`<Answer id>` **原位渲染**——不再有"抽取到右侧面板"的机制；顺序阅读与跳转探索看到的都是同一段落。
- **出口 chips**：每个场景下方一排按钮，分两组视觉（特性 / 深入问题），点击**站内滚动**到目标场景并触发其播放；跨文章则**整页跳转**并落 `#<scene-id>` 锚点。
- **场景目录**：右侧悬浮目录（桌面）/ 顶部折叠（移动），列表项 = yaml 场景顺序，点击滚动定位（不改 hash）。
- **递归无限制**：出口可以指向任何场景（包括跨文章、指回入口），图结构合法即可。

---

## 3. 路由与信息架构

### 3.1 URL 形态

| 视图 | URL | 说明 |
|---|---|---|
| 文章（唯一页面） | `/blog/<slug>/` | 全部场景竖向平铺 |
| 场景锚点落地 | `/blog/<slug>/#<scene-id>` | 浏览器原生 anchor scroll；首页"悬念问题"按钮即指向此 |
| 跨文章跳转 | `/blog/<other-slug>/#<scene-id>` | 出口 chips 的跨文章形态 |

- `/explore/` 路由**废除**。没有第二个页面。
- `entry` 字段的语义：首页"悬念问题"按钮指向哪个锚点。页面本身渲染全部场景，不存在"默认场景"概念。

### 3.2 入口

- **首页/文章卡片**：每篇博客展示"悬念问题"按钮（文字 = `entry` 场景的 `label`），`<a href="/blog/<slug>/#<entry-id>">`；
- **文章页顶部**：一行提示语说明"本文可顺序阅读，也可点击各场景下的出口跳转探索"；
- **右侧场景目录**：点击滚动定位（`scrollIntoView`），不改 hash（与出口 chips 区分：出口产生 hash 历史，支持前进后退）；
- **出口 chips**：站内跳转更新 hash（前进后退可用）；跨文章跳转整页跳转并落目标锚点；
- **顶栏导航**：不加探索入口（保持「博客 / 联系」）。

### 3.3 浏览器行为

- 原生 anchor scroll 负责定位——SSG HTML 自带 `id`，无需 hydration 时序补丁；
- IntersectionObserver 负责触发该场景 demo 播放：进入视口从头播放一次，离开视口 pause；
- `prefers-reduced-motion`：跳过播放，直接渲染 demo 终态静帧。

---

## 4. 内容协议：article.mdx 的新增块

### 4.1 `<Answer id="...">` —— 场景解说文字（原位渲染）

```mdx
<Answer id="q-problem">
公司的技术人员只有我一个。软件出问题找我、后台不会用找我……
能不能做一个 AI 数字分身，替我答疑、替我处理这些重复劳动？
</Answer>
```

- **唯一渲染形态**：原位渲染为正文流中一个带左侧标记线的块；
- 探索用法（目录 / 出口 chips / 首页悬念按钮）定位到该块的锚点 `#<id>`，**不存在"抽取到别处渲染"的第二渲染路径**；
- 同一段文字被两种用法消费，**只写一遍**。

### 4.2 （废除）原 `<QuestionAnchor>` 胶囊不再使用

> **v2 修订决定**：阅读视图改为"场景平铺"后，原文中嵌入的 `<QuestionAnchor>` 胶囊不再保留。理由：
> - 阅读模式的导航语言是滚轮（线性），硬塞问题胶囊打断阅读流；
> - 内容跳转的唯一形态统一为"两种渲染模式"本身：同一份 demo + 同一份 Answer，探索模式用图导航、阅读模式用顺序浏览；
> - 去除一个组件意味着阅读视图的内嵌动画天然就是`<SceneClip>`，组件职责更清晰。

### 4.3 `<SceneClip demo="...">` —— demo 嵌入（唯一播放入口）

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
    Post.tsx                    # 文章页（<Answer>/<SceneClip> 适配 + 场景目录 + 出口 chips）
  components/
    blog-anim/                  # 全站动画原子（不动）
    explore/                    # 探索机制（v2 大幅缩水）
      SceneController.ts        # Scene/SceneHandle 接口 + demos 注册
      SceneClip.tsx             # demo 嵌入：IntersectionObserver 触发从头播放
      SceneToc.tsx              # 右侧场景目录（yaml 顺序 → 滚动定位）
      ExitChips.tsx             # 每个场景下的出口按钮组（站内滚动 / 跨文章跳页）
      Answer.tsx                # <Answer> 块渲染（原位唯一形态）
      mock-ui/                  # 体验型 demo 复用原子（IM 框、打字机、按钮、模拟光标）
        ChatPane.tsx
        Typewriter.tsx
        MockButton.tsx
        MockCursor.tsx
        ...
  lib/
    content.ts                  # 读 article.mdx frontmatter + explore.yaml（统一接口，build/浏览器同源）
    explore.ts                  # 解析 + 校验（不再需要 .client.ts 双文件——见 §8）
```

**与 v1 相比删除**：`Explore.tsx`、`ExploreView.tsx`、`SceneStage.tsx`、`QuestionTree.tsx`、`QuestionNode.tsx`、`QuestionAnchor.tsx`、`AnswerProvider.tsx`、`explore.client.ts`、vite alias `lib/explore.client.ts`。

理由：单页面方案不需要"单场景切换"机制，自然消解 v1 一整层复杂度（双视图同步、hash 时序 hydration、双文件 lib）。

---

## 8. 构建管线

1. **内容扫描**：`content/posts/*/article.mdx` + 同目录 `explore.yaml` + `scene.tsx`；
2. **scene 模块注册**：`import.meta.glob('../content/posts/*/scene.tsx', { eager: true })`，导出 `demos` 字典；
3. **资源同步**：构建时把 `assets/` 拷到 `public/posts/<slug>/`（保持现有图片引用不失效）；
4. **统一数据源**（v2 简化）：`lib/explore.ts` 用 `js-yaml` 解析 yaml 字符串，`?raw` glob 把 yaml 文本直接拿到，**build 与浏览器 hydration 走同一份代码**——`lib/explore.client.ts` 与 vite alias 整体删除；
5. **构建时校验**（`scripts/validate-explore.ts`，prebuild/predev/prepreview）：
   - yaml `entry` 指向存在的场景；
   - 所有 `scenes[].id` 在正文 `<Answer id>` 中存在（**且非 placeholder——placeholder 已废除**）；
   - 正文 `<Answer id>` 均被某个场景引用（否则警告：目录与首页入口用不上）；
   - 所有 `scenes[].demo` 在 scene.tsx 导出中存在；
   - 所有 `to` 指向真实存在的场景（`{ post, scene }` 时跨文章校验）；
   - 循环引用允许（v2 显式支持递归），不强制深度限制，让作者自负责任。

---

## 9. 响应式布局

- **桌面（≥920px）**：右侧悬浮场景目录，固定定位，正文流式滚动；
- **移动（<920px）**：场景目录折叠到顶部一个 `<details>` 块，点击展开后是滚动定位；出口 chips 自适应宽度。

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
3. **每个场景章节内嵌 `<SceneClip>`**（11 个场景 × 1 demo，滚动入视口自动播放）；
4. **每个场景块下方挂出口 chips**（`features` / `questions` 两组）；
5. **问题未覆盖的，先不上树**：「项目业绩 / 项目进展」正文无对应内容，按 v2 规则（§5.3）不上树；后续补写正文章节后再加场景。纯文字章节（「知识库问答」「AI 侧审计」）保持纯文字，不为平铺硬凑动画。

### 10.4 其他文章

| 文章 | 处理 |
|---|---|
| **`ai-it-system`**（重做） | 入口场景改为"一条 badcase 报告的旅程" mock（IM 报告 → AI commit → CI 灯变绿 → MR 合并 → 全程 6 步几乎零沟通）。废掉所有 v1 placeholder 节点，正文施工预告段落保留 |
| 其他 3 篇 | 不动（无 explore.yaml，受 v2 影响为零） |

---

## 11. 测试策略

- **单元**：v2 yaml 解析与校验规则（每条规则一个用例）；SceneHandle play/pause/reset/kill；ExitChips 跳转目标解析（本地站内滚动 / 跨文章跳页）；SceneToc 目录顺序与 yaml 一致；
- **组件**：Post 页 `<Answer>` 原位渲染、`<SceneClip>` IntersectionObserver 触发、ExitChips 链接 href 正确（站内 `#id` / 跨文章 `/blog/<slug>/#id`）、SceneToc 点击滚动定位、mock-ui 原子组件；
- **端到端手测清单**：滚动入视口播放、↻ 重看、跨文章跳转、reduced-motion 降级、浏览器前进后退、移动端目录折叠展开、桌右侧悬浮目录。

---

## 12. 里程碑（建议实现顺序）

1. **基础设施**：`lib/explore.ts` 重写为 v2 schema 解析 + 校验；`Scene/SceneHandle` 接口简化为 play/pause/reset/kill；demo 模块 `?raw` glob 注册；删除 `lib/explore.client.ts` 与 vite alias；
2. **删除双视图层**：移除 `Explore.tsx`、`ExploreView.tsx`、`SceneStage.tsx`、`QuestionTree.tsx`、`QuestionNode.tsx`、`QuestionAnchor.tsx`、`AnswerProvider.tsx`、`routes.tsx` 中的 explore 子路由；
3. **mock UI 原子**：在 `components/explore/mock-ui/` 落 ChatPane / Typewriter / MockButton / MockCursor 等复用组件；
4. **Post 页集成**：`<Answer>` 改为原位渲染（保留少量样式：左侧标记线）；`<SceneClip>` 接入 IntersectionObserver 触发播放；
5. **SceneToc + ExitChips**：右侧悬浮目录 + 每个场景下方的出口按钮组（站内滚动 / 跨文章跳页）；
6. **首篇内容**：ai-digital-employee 11 个场景全部按 §10 场景图落地（Answer + demo + 出口），章节顺序与 yaml 一致；
7. **迁移**：ai-it-system 重做（删 placeholder、改入口场景为 badcase 旅程）；
8. **回归**：v1 旧测试与 fixture 全部重写以匹配 v2 schema；旧 yaml 与 v1 路由相关代码在迁移过程中清理。

每步独立可交付，前 4 步完成后现有网站行为不变（无 explore.yaml 的文章不受影响）。