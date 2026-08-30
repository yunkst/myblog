# 全站视觉重构 · 方案 D 极简工业赛博朋克 · Spec

**作者**: yedazhi（与 AI 助手协作）
**最后更新**: 2026-08-30
**状态**: 已确认设计（4 决策已锁：D 色调 / 极简密度 / 系统字 / 探索页刷 token 保留骨架 / 全站范围）；待实施
**前置**: [v3 spec](./2026-08-29-explore-view-design-v3.md)（CRT 剧场视觉）+ [v4 spec](./2026-08-30-explore-view-design-v4.md)（幕式导航 + 演出编排）
**样张**: `dist/mockup-cyberpunk.html`（最终视觉以它为准）

---

## 0. 目标

v3 的「暗色 CRT 剧场」只覆盖探索文章页；其他页面仍是「博客浅色风格」。反馈：「博客浅色风格不适合动画核心的设计」。

本次重构把全站视觉系统统一成**方案 D · 黑 + 白 + 翠绿极简工业**（BLAME! 风）：

- **黑底**：不是「黑屏」而是「黑稿纸」——大留白 + 发丝线 + 索引编号 + 翠绿 accent
- **零光效**：不发光、不辉光、不 glitch 标题、不代码雨背景、不荧光格栅；靠结构与字号说话
- **结构感**：引用块、卡片、对话消息都像「未出版的工业文档」——块状 + 编号 + 单色边线
- **可读性第一**：翠绿 accent 只用在关键交互与编号，正文用浅灰白（#E6E6E6）保证长时间阅读不刺眼

全站范围包括首页、博客列表、博客正文、联系页、FAQ 页、探索页 6 大模块。探索页保留 v4 幕式骨架（CRT 扫描线减淡 + 名字牌/chip 前缀结构保留），只刷 token。

## 1. 不变的东西

| 层 | 不变项 |
|---|---|
| 路由 | 全部不动（/、/blog、/blog/<slug>/、/#<scene-id>） |
| v4 探索页架构 | ExploreRouter / Director / SceneClip / useHistoryStack / seenScenes / 履历面板 + FAB 全部逻辑不动 |
| v4 yaml schema | ExploreScene.mode / features / questions / Scene 协议 全部不动 |
| demo 动画 | 11 + 1 个 GSAP timeline 一行不改 |
| MDX 内容 | `content/posts/**` 零改动 |
| GSAP core only | 无新增依赖 |

## 2. 设计 token

### 2.1 配色

```css
:root {
  /* 基础色板 */
  --bg: #0A0A0A;            /* 页面底（深黑，略带哑光） */
  --panel: #101010;          /* 卡片/引用/对话块面板 */
  --raise: #141414;          /* 嵌入式子面板/对话消息条 */
  --paper: #0A0A0A;          /* 兼容 v3 旧 token（语义别名同 --bg） */
  --paper-raise: #101010;    /* 兼容 v3 旧 token */

  /* 文字 */
  --text: #E6E6E6;           /* 正文（不刺眼的浅灰白） */
  --ink: #E6E6E6;            /* 兼容 v3 别名 */
  --dim: #8F8F8F;            /* 次级文字（meta、说明、索引编号） */
  --ink-soft: #8F8F8F;       /* 兼容别名 */
  --faint: #5C5C5C;          /* 极弱文字（页脚、辅助） */
  --ink-faint: #5C5C5C;      /* 兼容别名 */

  /* 分隔线（核心视觉元素） */
  --line: #262626;           /* 1px 发丝线，分隔块的唯一武器 */
  --grid: #1A1A1A;           /* 不可见的辅助网格（极淡） */

  /* Accent（仅关键交互使用） */
  --accent: #00D26A;         /* 翠绿——CTA、hover、编号、active 状态 */
  --accent-soft: rgba(0, 210, 106, 0.10);  /* hover 背景，10% 不透明 */
  --mark: #FF6B6B;           /* 警示红，仅用于「Q/?」线索前缀 */

  /* 字体（系统字） */
  --sans: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --fang: "FangSong", "STFangsong", "FangSong_GB2312", serif;  /* 引用块 */
  --mono: ui-monospace, "Cascadia Mono", Consolas, monospace;  /* 编号、路径、代码 */

  /* 字号（不抽 token，直接写 rem） */
  /* 正文 16px / 行高 1.85 / 标题 24-32px */
}
```

### 2.2 字号规范

| 角色 | size / line-height | 字重 | 颜色 | 备注 |
|---|---|---|---|---|
| H1（hero） | clamp(28px, 3.6vw, 40px) / 1.3 | 800 | --text | 大留白上下 32px |
| H2（章节） | 22px / 1.5 | 700 | --text | 上下 16px |
| 正文 | 15px / 1.85 | 400 | --text | 段距 13px |
| Meta / Docline | 11px mono | 400 | --dim | letter-spacing .18em，全大写感 |
| 编号（CH-01 / ACT.01） | 10-11px mono | 400 | --accent | letter-spacing .3em |
| 引用块 | 15-16px / 1.95 | 400 | --text | 字体 --fang，块 padding 14px 18px |
| Caption | 12px | 400 | --dim | — |

### 2.3 间距规范

8px 网格：margin/padding 用 8 的倍数。卡片圆角统一 0（极简工业——直角）。阴影一概不用，靠发丝线分隔。

## 3. 全局样式改造

### 3.1 `body` 与背景

```css
body { background: var(--bg); color: var(--text); ... }
body::before {
  /* 删除 v3 的 24px 坐标纸格栅——赛博朋克极简风不需要 */
  /* 替代：极淡的 1px 水平扫描线 @ 200% 透明度（几乎不可见） */
  background: repeating-linear-gradient(0deg, var(--grid) 0 1px, transparent 1px 120px);
  opacity: 0.5;
}
```

### 3.2 `.app-shell` 与布局

不动 v2/v3/v4 既有结构（顶栏、main、footer）。顶栏（Header）颜色反相：深底浅字 + 翠绿 hover；去掉浅色边框。

### 3.3 元素样式（统一翻黑）

| 元素 | 改法 |
|---|---|
| `<a>` 链接 | 默认浅灰白；悬停翠绿；无下划线（hover 才出现） |
| `<strong>` | 白字 + 翠绿底边 1px |
| `<blockquote>` | 矩形方框 + 1px --line + 「QUOTE_01」右上角编号（mono --accent） |
| `<code>` | 等宽字体 + --raise 背景 |
| `<hr>` | 1px --line |
| `<table>` | 1px --line 网格，无 hover 高亮 |

### 3.4 顶栏（Header / Nav）

- 背景 `--bg`，` + 翠绿 hover；当前页 active 态：翠绿文字 + 底边 1px --accent
- 顶栏底分隔线 1px --line
- 移除 v3 浅色风格的阴影/边框

### 3.5 顶栏 + 首页 hero

```css
.hero-h1 {
  font-size: clamp(32px, 4.6vw, 56px);
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: 0.01em;
  color: var(--text);
}
.hero-h1 em { font-style: normal; color: var(--accent); }  /* 仅强调某词用 em */
.hero-eyebrow { /* mono 小字 + 编号感 */ }
```

### 3.6 首页博客列表卡片

每篇博客是一行：左侧 archive 编号（mono --dim） + 中间标题（--text） + 右侧 date（mono --dim）。条目之间 1px --line 分隔；hover 时左侧编号变翠绿，标题加底边。

## 4. 探索页（v4 改造：刷 token + 骨架减淡）

v4 探索页骨架保留：幕式单屏 + 履历栈 + Director 演出编排 + CRT 舞台 + 名字牌 + chip 前缀。**只换 token；CRT 光效（弧形暗角、扫描线强度）减淡或取消**。

### 4.1 CRT 舞台（`.stage`）

保留 v3 暗角 + 扫描线骨架，但参数调淡：

| 项 | v3 | v4 → D |
|---|---|---|
| 背景 | #060907 | #060606（更纯黑） |
| 边框 | rgba(220,229,225,0.12) | 1px solid --line |
| 圆角 | 14px | 0（直角） |
| 暗角 gradient | 强径向 | 删除（极简不需暗角） |
| 扫描线 | repeating-linear-gradient 3px 周期 + 全色 mix-blend overlay | **保留但淡到 5% opacity**（仅留 CRT 暗示） |
| 中央聚光 | radial-gradient 翠绿 9% | 删除 |
| 外投影 + inset 辉光 | 有 | 删除 |

### 4.2 文本窗（`.dialogue`）+ 名字牌

- 文本窗背景 `--panel`，边框 1px --line，圆角 0
- 名字牌（`.dlg-name`）保留 v3 形式但 token 化：翠绿底 + 黑字 + mono 字符间距（保留「解 说」骑窗框效果）
- blockquote → `.dlg-quote` 减淡左竖线（翠绿 50% → 1px --accent）

### 4.3 選択肢（`.choices`）

- 居中纵排菜单；`─ 選択肢 ─` 标签（mono 11px 宽字距 --dim）
- 边框 1px --line，hover 时背景 --accent-soft + 左侧 2px 翠绿左竖线（不是 translateX）
- features 前缀 `▸`（--accent）；questions 前缀 `？`（--mark）+ dashed 边框
- chip 结构与 v3 一致，只换 token

### 4.4 履历 FAB + 面板（v4 既有）

- FAB：暗底 + 1px --line 边框 + 翠绿 hover；按钮「◀ 返回」disabled 时 --faint
- 履历面板：z-index 70 fixed 全屏弹层；标题 mono 11px 宽字距 --dim；访问历史 ol 列表项 编号 mono --accent + sceneId 文字 --text，hover 背景 --accent-soft
- 44×44 命中目标 + focus-visible 翠绿描边（v4 final-review 修复继承）

### 4.5 mode 1 全屏

`.stage--fullscreen` 全屏样式保留 v4，但边框 / 投影减淡（取消 border-radius + inset 辉光）。

## 5. 博客正文页

- 顶栏 + h1 标题 + meta + body + 上一篇/下一篇
- 文章内 demo（ArchDiagram / CountUp / ChatPane / typewriter 等 mock-ui 组件）**保留 v3 既有样式**，不重做——但包在 `.post-wrap` 容器内，自动用全局 token 适配（demo 内部白色组件自带背景色不变）
- 上一篇/下一篇：左右两列卡片，中间 1px --line 分隔；hover 时翠绿文字

## 6. 联系 + FAQ 页

- 沿用首页布局语言（发丝线 + 编号 + 翠绿 accent）
- 联系表单输入框：透明背景 + 1px --line 底边（无矩形边框），focus 时底边变翠绿
- FAQ：左侧目录粘性列（编号 + 标题，active 态翠绿底边），右侧 answer 区

## 7. 探索文章页的额外兼容

**无 explore 文章的 4 篇博客零回归**：`.post-wrap` 不带 `.post-wrap--stage` 修饰类，原 720px 版式保留，仅替换全局 token 颜色（黑底白字）。

## 8. 无 JS / reduced-motion 兼容

- 全站 CSS-only 降级：色彩 token 不依赖 JS
- 探索页无 JS 平铺降级（v4 已落地）：所有幕直出可读 + 翠绿 token 正常显示
- reduced-motion：所有 GSAP 演出直出终态；CSS 动画（caret blink 等）由 v3 全局规则屏蔽

## 9. 文件改动清单

| 文件 | 动作 |
|---|---|
| `src/styles/global.css` | **重写**：全站 token 替换、移除坐标纸格栅、极简工业风格 |
| `src/components/blog-anim/*` | 内部样式保留，仅跟随全局 token 适配 |
| `src/pages/Home.tsx` | 顶栏 + hero + 列表卡片 token 适配 |
| `src/pages/Post.tsx` | 博客正文页样式 token 适配（仅 style 引用） |
| `src/pages/Contact.tsx` / `FAQ.tsx` | 表单/目录样式 token 适配 |
| `src/components/explore/*.tsx` | 内部 DOM 不动；仅 class 名称依赖全局 token |
| `content/posts/**` | **零改动**（铁律） |
| `content/posts/*/scene.tsx` | **零改动**（demo 铁律） |

## 10. 测试策略

- **单元**：token CSS 变量存在断言（在 global.css 文本里 grep）
- **组件**：Post / Home / Contact / FAQ / Answer 既有测试不破坏；CSS class 断言更新（如 `.paper-raise` → `.panel`）
- **视觉回归**：Playwright 截首页 + 博客正文 + 探索页幕式 + FAQ + 联系页各 1-2 张截图
- **reduced-motion**：所有页直出，演出跳到终态

## 11. 验收标准

- 6 个页面（首页、博客正文、博客列表、联系、FAQ、探索页）打开后视觉统一为方案 D
- 4 篇无 explore 文章的博客 0 视觉回归（除全局 token 自然变化）
- 无 explore 文章保持 720px 版式（v3 既有）
- 探索页 v4 幕式 + Director 演出 + 履历栈 + 履历面板 全部正常工作
- reduced-motion 路径完整
- 测试 113/113 全绿；typecheck 0；validate 0/0；build 9 路由

## 12. 明确不做（本期范围外）

- 字体子集 / 自托管（系统字已够；如未来换字体再考虑）
- 暗色/浅色主题切换（探索页固定极简工业，其他页面也固定）
- 额外动画（除 v4 既有 GSAP 演出 + caret blink）
- 移动端特别适配（v3 媒体断点 920/1400 继承，本期不动）
- v3/v4 遗留 minor 项的清偿
- favicon