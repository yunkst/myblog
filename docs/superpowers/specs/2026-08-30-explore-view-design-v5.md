# 探索视图（Explore View）v5 · 全屏单幕 + 显式导航

**作者**: yedazhi（与 AI 助手协作）
**最后更新**: 2026-08-30
**状态**: 已确认设计，待实施
**前置**: [v4 spec](./2026-08-30-explore-view-design-v4.md)（单幕可见 + 全屏 mode 1 + 履历栈 + Director 三种演出）
**关联**: [v3 spec](./2026-08-29-explore-view-design-v3.md)、[v2 spec](./2026-08-29-explore-view-design-v2.md)

---

## 0. v5 要解决什么

v4 已经做到「同一时间只有一屏可见」，但**仍然是文章页的延伸**：

1. **文章框架仍在**：domain 标签、日期、`<h1>` 标题、excerpt、`post-nav` 上一篇/下一篇全部保留——舞台只是塞进文章页的一块拼图，不是文章本身；
2. **非幕内容仍在 DOM**：`article.mdx` 里 `<Answer>` 之外的引导 blockquote、章节标题（h2/h3）、`<ArchDiagram>` 静态图、`![alt](.webp)` 配图等都在 DOM 里——只是被 CSS `display: none` 隐藏，没有被清除；
3. **DOM 里同时存在多个 `<Answer>`**：每个幕即使不可见也占着结构（act-head / stage / dialogue / choices 全部静态直出），违反「一篇文章 = 一个场景 + 导航」的构想；
4. **没有键盘**：跳幕、跳过演出、回退全靠鼠标，体验割裂；
5. **没有显式退出**：读者不知道「这是一个独立视图」，以为还在文章页里。

v5 把探索视图**彻底从文章页剥离**：

- 进入探索文章 = **进入一个独立舞台**；舞台里只有当前幕 + 导航条；
- 退出舞台 = 回到文章列表 / 上一路由；
- 舞台**没有滚动**：当前幕铺满视口（mode 1 全屏 demo 也铺满视口，自然无滚动）；
- 舞台**只有一种状态**：激活幕；其他幕不渲染；
- 导航能力全部**显式**（FAB / 履历面板 / 键盘 / 出口 chips）。

---

## 1. 不变的东西（v1 ~ v4 继承，逐条列出防止误改）

| 层 | 不变项 |
|---|---|
| 路由 | `/blog/<slug>/` 单页；`#<scene-id>` 原生锚点；不改 URL 结构 |
| yaml schema | `ExploreConfig { title, entry, scenes[] }` 不变；`scenes[].mode`（v4 新增）继续使用 |
| Scene 协议 | `Scene { name, Stage, build() }` + `DemoHandle` 不动 |
| demo 动画 | 11 + 1 个 GSAP timeline **一行不改** |
| SceneClip 内部 | `ref` / IO / `data-finished` 机制**内部代码不动**；imperative API（v4 暴露）继续沿用 |
| `<Answer id>` MDX 用法 | 不变；v5 仍按 children 分区渲染（act-head / stage / dialogue / choices） |
| 无 explore 文章 | 其余 4 篇博客版式**零影响** |
| Director 三种演出 | mode 1/2/3 编排逻辑（v4 已实现）不动 |
| Director.skip() | 点击空白跳过演出继续 |
| 履历栈 | sessionStorage 持久化 + pop / jumpTo（v4）不动 |
| CRT 剧场视觉 | 暗底 / 暗角 / 扫描线 / 名字牌 / 選択肢样式不动 |

---

## 2. 视图模型：从「文章页里的舞台」→ 「独立舞台」

### 2.1 路由 → 视图

| URL | 视图 | 渲染策略 |
|---|---|---|
| `/` | 首页（不变） | Hero + PostList + WIP + FAQ + Contact |
| `/blog/<slug>/` 且 `post.hasExplore === false` | **文章页**（不变） | 720px 文档流：post-meta / h1 / excerpt / `<article>` / post-nav |
| `/blog/<slug>/` 且 `post.hasExplore === true` | **舞台**（v5 重做） | 整页 = 舞台容器，只渲染当前激活的幕，无 post-meta / h1 / excerpt / post-nav |

**判断逻辑**：在 `Post.tsx` 顶部根据 `post.hasExplore` 分流——这是构建期数据，路由层不需要新增路径。

### 2.2 舞台容器结构

```
<main class="stage-frame" data-has-router data-stage-locked>
  <ExploreRouter>
    <div class="stage-stage">            ← 100vw × 100vh，无滚动
      <Answer id={activeId}>              ← 只有一幕 DOM
        {act-head / stage / dialogue / choices}
      </Answer>
    </div>
    <nav class="stage-nav">               ← 底部 FAB 条
      <button class="nav-back">◀ 返回</button>
      <button class="nav-next">⏵ 继续</button>     ← 主线下一幕
      <button class="nav-history">履历 ▾</button>
      <button class="nav-exit">✕ 退出</button>
    </nav>
    <HistoryPanel>                       ← 点开挂载
      ├─ 出口树（主线 + features + questions）
      └─ 访问历史
    </HistoryPanel>
  </ExploreRouter>
</main>
```

**关键差异**（v5 vs v4）：

- 没有 `<article class="post-body">`，没有 `post-meta` / `h1` / `excerpt` / `post-nav`；
- `<Answer>` **只有一个**（activeId），其余不渲染——不是 CSS 隐藏，是 React 不挂载；
- body **不滚动**（mode 1 全屏也铺满视口，不溢出）；
- 导航从「浮在内容里的 FAB」升级为**底部导航条**（更明确是 UI 而不是悬浮元素）；
- 新增「继续」（主线下一幕）、「退出」（回上一路由）按钮。

### 2.3 非幕内容的清理

`article.mdx` 里 `<Answer>` 之外的内容**不再需要保留**：

| 当前 MDX 内容 | v5 处理 |
|---|---|
| 开场 blockquote 引导文 | 删除（由 yaml `entry` 幕的 `label` 替代） |
| 章节标题（h2/h3） | 删除（幕本身就是节，act-head 已有标题） |
| `<ArchDiagram>` 静态图 | 删除（已有 demo 动画替代） |
| `![alt](.webp)` 配图 | 删除（demo 内嵌 SVG 已表达） |
| 普通段落 | 删除 |
| `<Answer>` 内的全部内容 | **保留**（这是 yaml `scenes[]` 对应的正文） |

**铁律**：v5 起探索文章的 `article.mdx` **必须**只包含 `<Answer id=...>` 块；其它任何内容**不渲染**（不是 CSS 隐藏，是 React 不挂载）。validate-explore.ts 加一条校验：探索文章里 `<Answer>` 之外有非空文本 / 元素时报错。

> 例外：`import` 块必须保留（MDX 模块语法需要）；空行/whitespace 忽略。

---

## 3. 导航能力（v5 全部显式）

### 3.1 鼠标导航

| 元素 | 行为 |
|---|---|
| 底栏 ◀ 返回 | 履历栈 `pop()`；空栈时禁用 |
| 底栏 ⏵ 继续 | 跳到 `scenes[(idx+1) % scenes.length]`（主线下一幕） |
| 底栏 履历 ▾ | 打开 HistoryPanel |
| 底栏 ✕ 退出 | `navigate(-1)`；无历史时回 `/` |
| 履历面板里的出口树 | `goTo(id)` |
| 履历面板里的访问历史 | `jumpTo(idx)` |
| 幕内出口 chips | `goTo(id)`（与 v4 一致） |
| 点击空白 | `director.skip()`（与 v4 一致） |

### 3.2 键盘快捷键（v5 新增）

| 键 | 行为 | 启用条件 |
|---|---|---|
| `←` | 履历栈 `pop()`（等同 ◀ 返回） | 履历非空 |
| `→` | 主线下一幕（等同 ⏵ 继续） | 永远启用 |
| `↑` | 当前幕出口 chips 焦点上移 | chips ≥ 1 |
| `↓` | 当前幕出口 chips 焦点下移 | chips ≥ 1 |
| `Enter` | 跳到当前焦点 chip | chips ≥ 1 且有焦点 |
| `Esc` | 关闭履历面板 / 退出舞台（双击） | 永远启用 |

**实现位置**：`ExploreRouter` 内 `useEffect` 注册 `window.addEventListener('keydown', ...)`，cleanup 注销。

**文本输入冲突守卫**：当 `event.target` 是 `<input>` / `<textarea>` / `[contenteditable]` 时所有快捷键失效。

**焦点环**：键盘 ↑↓ 选中的 chip 必须有可见 `focus-visible` 样式（CSS `outline: 2px solid var(--sacc)`）；鼠标 hover 不抢焦点。

**Esc 双击退出**：履历面板关闭时按 Esc = 退出舞台；履历面板打开时按 Esc = 只关面板（不退出）。避免误触。

### 3.3 履历面板（升级）

保留 v4 出口树 + 访问历史的双栏结构；**新增「继续 / 返回 / 退出」三个动作的镜像按钮**（面板顶部），鼠标不便时键盘可走面板。

```
─ 探索履历 ─                           [×]
[◀ 返回]  [⏵ 继续]  [✕ 退出]
─ 主线/支线 ─
  ▸ 继续：xxx
  ▸ yyy
  ？zzz
─ 访问历史 ─
  01 q-problem
  02 q-badge-metaphor
  ...
```

### 3.4 入口路径

| 入口 | 行为 |
|---|---|
| 从 PostList 卡片点 `▶ {entry.label}` | 直接进入舞台，激活 `entry` 幕（v4 已有，保留） |
| 从 PostList 卡片点标题 | 进文章页（720px 文档流），**不再进舞台**——v5 起探索文章**没有普通文章视图**，标题区改文案：`▶ 进入舞台` |
| URL `/blog/<slug>/`（无 hash） | 进舞台，激活 `entry` 幕 |
| URL `/blog/<slug>/#<id>` | 进舞台，激活 `<id>` 幕（无效 id 回落 entry） |
| 从外部链接（如主页 footer / 其他博客正文） | 进舞台，激活目标幕 |

**PostList 卡片变更**：

- 有 explore 的文章：只显示一个按钮 `▶ {entry.label}`，**没有「点标题进文章」**（标题变成不可点的 h3 装饰，或保留 clickable 但跳同一目标——选 clickable 维持可达性）；
- 无 explore 的文章：标题 clickable 进文章页（不变）。

---

## 4. 演出编排（继承 v4）

### 4.1 三种 mode（保留 v4 显式 yaml 标注）

| mode | 行为 | 触发场景 |
|---|---|---|
| 1 | 全屏 demo 先 → 缩窗 → 文字 → choices | 开场 / 关键演示（yaml 显式标注） |
| 2 | 文字 → demo → choices | 默认 / 中段过渡 |
| 3 | 纯文字（无 demo） | 总结 / 边界讨论 |

**yaml 现状**：q-problem mode 1、q-tiered-confirm mode 1，其余默认 mode 2。**v5 不强制改 yaml**——已存在的 mode 标注沿用。

### 4.2 Director 行为不变

- 演出 = GSAP timeline 链（fadeIn / typewriter / demo play / choicesRise）；
- skip = 当前段 `progress(1)`，下一段接力；
- seenScenes 已看过的幕直出终态；
- reduced-motion 直出终态。

### 4.3 视觉约束（新增）

舞台容器必须满足：

- `position: fixed; inset: 0; width: 100vw; height: 100vh;`；
- `body` 加 `stage-locked` class → `overflow: hidden`（v4 已有，保留）；
- `.theater`（Answer 的 section）占满容器内可用空间，居中；
- mode 1 全屏 demo：`.stage--fullscreen` 直接等于舞台本身（v5 没有「缩窗到 theater 区域」的过渡——全屏 = 整页）；
- 字号、断点、行宽沿用 v4（CRT 剧场视觉）。

---

## 5. yaml schema

v5 不改 schema。仅校验增强：

```ts
// scripts/validate-explore.ts 新增
if (exploreArticle) {
  // article.mdx 解析后，<Answer> 之外的非空文本节点报错
  // <import> 块除外
}
```

---

## 6. 组件结构

```
src/
  pages/
    Post.tsx                        # 重大改动：薄路由壳；按 hasExplore 分流 Stage / ArticlePage
    Stage.tsx                       # 新建：舞台壳（main + ExploreRouter + SceneRoute + StageNav）
    ArticlePage.tsx                 # 抽自 Post.tsx 的非 explore 分支（保留 720px 文档版式）
  components/
    PostList.tsx                    # 改动：探索文章卡片只显示「▶ 进入舞台」，无普通文章路径
    explore/
      Director.tsx                  # 不动
      ExploreRouter.tsx             # 改动：去掉 <article> 包整页；加键盘监听；加 onExit prop；runtime 暴露 back/canBack
      HistoryPanel.tsx              # 改动：顶部加 ◀/⏵/✕ 三个动作镜像
      HistoryFAB.tsx                # **删除**（被 StageNav 替代）
      Answer.tsx                    # 简化：去掉多幕平铺分支；partition 仍按 children 分区
      SceneClip.tsx                 # 不动
      ExitChips.tsx                 # 不动
      useHistoryStack.ts            # 不动
      useTypewriter.ts              # 不动
      useKeyboardShortcuts.ts       # 新建：注册 ←/→/↑↓/Enter/Esc；isEditableTarget 守卫
      usePanelControls.ts           # 新建：panelOpen/setPanelOpen 从 ExploreRouter 暴露给 StageNav
      StageNav.tsx                  # 新建：底部导航条（◀ 返回 / ⏵ 继续 / 履历 / ✕ 退出）
      SceneRoute.tsx                # 新建：根据 activeId 用 Children API 挑出唯一 <Answer> 子树
  styles/
    global.css                      # 改动：删除 .post-meta/.post-body 在 stage 下的样式；新增 .stage-frame/.stage-stage/.stage-nav 样式；键盘 focus-visible
  lib/
    content.ts                      # 不动
    explore.ts                      # 不动
content/posts/
  ai-digital-employee/
    article.mdx                     # 改动：删除所有 <Answer> 之外的内容（保留 import / 空行）
  其余 4 篇                         # 不动
scripts/
  validate-explore.ts               # 改动：新增「<Answer> 之外内容」校验
```

---

## 7. 关键代码草图

### 7.1 Post.tsx 分流

```tsx
export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])

  if (!post) return <main className="post-wrap"><p>文章不存在。</p></main>

  if (post.hasExplore) {
    return <Stage post={post} />          // 新组件：整页舞台
  }

  return <ArticlePage post={post} />      // 原 Post.tsx 的非 explore 分支
}
```

### 7.2 Stage.tsx（新）

```tsx
function Stage({ post }: { post: Post }) {
  const navigate = useNavigate()
  const exploreConfig = useMemo(() => exploreConfigFor(post.slug), [post.slug])

  // onExit 必须延迟到 effect 里：SSG 阶段 navigate 无 window.history 可用，
  // 而且 onExit 可能要 navigate(-1) —— 在渲染期调用会破坏 hydration。
  const handleExit = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }, [navigate])

  return (
    <main className="stage-frame" data-article-slug={post.slug}>
      <ExploreRouter config={exploreConfig} onExit={handleExit}>
        <SceneRoute config={exploreConfig} post={post} />
        <StageNav onExit={handleExit} />
      </ExploreRouter>
    </main>
  )
}
```

### 7.3 SceneRoute.tsx（新）

**难点**：v4 的做法是 `import.meta.glob` 把整篇 article.mdx 编译成一个 React 组件，然后整篇渲染（每个 `<Answer>` 都挂载，只 CSS 隐藏）。**v5 需要只渲染当前幕的 `<Answer>`**——即从 article.mdx 的 React 树里挑出 `id === activeId` 的子树。

**选定实现**（整篇编译 + React 树过滤，改动最小）：

```tsx
/* mdxModules glob 从 Post.tsx 移到这里（Stage 页专用） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

/* 递归遍历已编译 MDX 输出的 React 元素树，找 type === Answer && props.id === activeId */
function pickActiveScene(
  root: ReactNode,
  AnswerType: ComponentType<{ id: string }>,
  activeId: string,
): ReactNode {
  for (const child of Children.toArray(root)) {
    if (!isValidElement(child)) continue
    if (child.type === AnswerType && (child.props as any).id === activeId) return child
    /* Answer 的 children 由 Answer 自己分区渲染——不往 Answer 里钻；
     * MDX 顶层可能有 div/section 等包裹元素，递归兜底 */
    const found = pickActiveScene((child.props as any).children, AnswerType, activeId)
    if (found) return found
  }
  return null
}

export default function SceneRoute({ config, post }: { config: ExploreConfig; post: Post }) {
  const runtime = useContext(ExploreRuntimeContext)
  const activeId = runtime.activeId

  /* 整篇 MDX 组件（编译产物按 slug 查一次） */
  const Body = useMemo(() => {
    const key = Object.keys(mdxModules).find((k) => k.split('/').slice(-2, -1)[0] === post.slug)
    return key ? mdxModules[key].default : null
  }, [post.slug])

  /* 渲染整篇（React 元素树只是数据；未挑中的幕不会进 DOM） */
  const bodyNode = useMemo(() => (Body ? <Body /> : null), [Body])
  const AnswerEl = Answer as ComponentType<{ id: string }>
  const activeSubtree = useMemo(
    () => (bodyNode ? pickActiveScene(bodyNode, AnswerEl, activeId) : null),
    [bodyNode, activeId],
  )

  if (!activeSubtree) return null

  return (
    <div className="stage-stage">
      {/* key=activeId：切幕时 React 卸载旧幕子树、挂新幕——Director 演出随之重建 */}
      <Fragment key={activeId}>{activeSubtree}</Fragment>
    </div>
  )
}
```

**SSG/hydration 一致性**：

- SSG 阶段：`currentSceneId()` 无 window → activeId = `config.entry` → 渲染 entry 幕子树；
- hydration 首帧：`useState(() => currentSceneId(config))` 同样取 entry（lazy initializer 首帧与 SSR 输出对齐）；
- hydration 后：`hashchange` / `goTo` 更新 activeId → SceneRoute 重渲染出新幕子树；
- **风险点**：`<Body />` 渲染时非激活幕的 `<Answer>` 元素会被 createElement——纯内存数据构造，不进 DOM、不触发 Director/SceneClip 的 effect——安全。`pickActiveScene` 找到目标后立即 return。

### 7.4 StageNav.tsx（新）

```tsx
export default function StageNav({ onExit }: { onExit: () => void }) {
  const runtime = useContext(ExploreRuntimeContext)
  const config = useContext(ExploreConfigContext)
  const { openPanel } = usePanelControls()          // panelOpen/setPanelOpen 从 ExploreRouter 下放

  const idx = config.scenes.findIndex((s) => s.id === runtime.activeId)
  const nextScene = config.scenes[(idx + 1) % config.scenes.length]
  const canBack = runtime.canBack                    // 栈深 > 1 时为 true（栈底是 entry 本身）

  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <button onClick={runtime.back} disabled={!canBack}>◀ 返回</button>
      <button onClick={() => runtime.goTo(nextScene.id)}>⏵ 继续：{nextScene.label}</button>
      <button onClick={openPanel}>履历 ▾</button>
      <button onClick={onExit}>✕ 退出</button>
    </nav>
  )
}
```

### 7.5 useKeyboardShortcuts.ts（新）

```ts
export function useKeyboardShortcuts(handlers: {
  onBack: () => void
  onNext: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onEnter: () => void
  onEsc: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      switch (e.key) {
        case 'ArrowLeft': handlers.onBack(); break
        case 'ArrowRight': handlers.onNext(); break
        case 'ArrowUp': e.preventDefault(); handlers.onArrowUp(); break
        case 'ArrowDown': e.preventDefault(); handlers.onArrowDown(); break
        case 'Enter': handlers.onEnter(); break
        case 'Escape': handlers.onEsc(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
```

**焦点 chip 状态**：组件内维护 `focusedChipIndex: number | null`；↑↓ 改变它（带 wrap）；Enter 时取该 chip 的 `to` 调 `goTo`；鼠标 hover 不动它；履历面板打开时禁用 ↑↓/Enter。

### 7.6 ExploreRouter 升级

```tsx
export function ExploreRouter({ config, onExit, children }: Props) {
  // ... 既有：activeId / history / seenScenes / firstActivation ...
  // ... 既有：goTo / back / jumpTo / onActivate / skip ...

  useKeyboardShortcuts({
    onBack: () => canBack && back(),
    onNext: () => goTo(nextScene.id),
    onArrowUp: () => cycleChip(-1),
    onArrowDown: () => cycleChip(1),
    onEnter: () => focusChip() && goTo(chip.to),
    onEsc: () => panelOpen ? setPanelOpen(false) : onExit(),
  })

  // ... 其余不变 ...
}
```

### 7.7 ArticlePage.tsx（拆分自 Post.tsx）

把当前 Post.tsx 的非 explore 分支抽成 `ArticlePage.tsx`，Post.tsx 改为薄路由壳：

```tsx
export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  if (!post) return <main className="post-wrap"><p>文章不存在。</p></main>
  return post.hasExplore ? <Stage post={post} /> : <ArticlePage post={post} />
}
```

---

## 8. 测试策略

### 8.1 单元

- `pickActiveScene`：返回 `id` 匹配的唯一子树；不匹配返回 null；多个匹配取第一个；
- `useKeyboardShortcuts`：isEditableTarget 守卫、preventDefault 时机、cleanup 注销；
- yaml 校验：`<Answer>` 之外内容报错。

### 8.2 组件

- `Post`：有 explore 渲染 `<Stage>`，无 explore 渲染 `<ArticlePage>`；
- `Stage`：main 不含 `post-meta` / `h1` / `post-nav`；body 有 `stage-locked`；`.stage-frame` 100vw × 100vh；
- `SceneRoute`：当前幕为唯一子节点；切换 activeId 时 React 重新挂载（key = activeId）；
- `StageNav`：4 个按钮存在；◀ 返回在栈空时 disabled；
- `ExploreRouter`：键盘事件触发 goTo/back/cycleChip/onExit；
- `HistoryPanel`：三个镜像按钮可点。

### 8.3 端到手测清单（Playwright）

- 探索文章从列表点 `▶ {entry.label}`：直入 entry 幕，舞台铺满视口，body 无滚动条；
- 当前幕铺满视口，**只有一个 `.theater` DOM 节点**；
- 按 → 跳主线下一幕；按 ← 返回上一幕；按 ↑↓ 切换出口 chip focus；按 Enter 跳到 focus chip；按 Esc 关闭面板 / 退出；
- 履历面板打开时 ↑↓/Enter 失效，Esc 只关面板；
- 底栏 ✕ 退出：navigate(-1) 回上一页；无历史时回 `/`；
- 点击空白触发 skip（与 v4 行为一致）；
- 移动端 390px：底栏 4 个按钮可点，不溢出；
- 1400px 断点：舞台居中显示；
- reduced-motion：演出直出终态；
- 关 JS：所有幕竖向平铺可读（沿用 v4 降级）；
- 无 explore 文章：版式与 v4 一致（零影响）。

---

## 9. 文件改动清单

| 文件 | 动作 |
|---|---|
| `src/pages/Post.tsx` | 重大改动：分流 Stage / ArticlePage |
| `src/pages/Stage.tsx` | 新建：舞台壳 |
| `src/pages/ArticlePage.tsx` | 抽自 Post.tsx 的非 explore 分支 |
| `src/components/explore/ExploreRouter.tsx` | 改动：去掉整页 <article> 包；加键盘监听；加 onExit prop |
| `src/components/explore/SceneRoute.tsx` | 新建：根据 activeId 渲染单个 <Answer> |
| `src/components/explore/StageNav.tsx` | 新建：底部导航条 |
| `src/components/explore/HistoryPanel.tsx` | 改动：顶部加 ◀/⏵/✕ 三个动作镜像 |
| `src/components/explore/HistoryFAB.tsx` | **删除**（被 StageNav 替代） |
| `src/components/explore/Answer.tsx` | 简化：去掉多幕平铺分支 |
| `src/components/explore/useKeyboardShortcuts.ts` | 新建 |
| `src/styles/global.css` | 改动：删除 .post-meta/.post-body 在 stage 下的样式；新增 .stage-frame/.stage-stage/.stage-nav 样式；键盘 focus-visible |
| `content/posts/ai-digital-employee/article.mdx` | 改动：删除所有 `<Answer>` 之外的内容（保留 import） |
| `scripts/validate-explore.ts` | 改动：新增「`<Answer>` 之外内容」校验 |
| `src/components/PostList.tsx` | 改动：探索文章卡片去掉「点标题进文章」路径，只显示「▶ 进入舞台」 |
| `content/posts/**` 其余 | **零改动** |
| `content/posts/*/scene.tsx` | **零改动** |

---

## 10. 明确不做（本期范围外）

- 移动端 swipe 切幕（v4 已拒绝，v5 保留）；
- 全屏 mode 1 的剧场音效（v4 已拒绝，v5 保留）；
- 把 `<Answer>` 拆成独立 .mdx 模块（v5 沿用 glob + React.Children 过滤）；
- 履历持久化到 localStorage（v4 已选 sessionStorage，v5 保留）；
- 自定义快捷键配置 UI；
- 「跳过该幕」按钮（已有键盘 ←/→ / chips 即可）；
- 无 explore 文章的舞台化（v5 明确拒绝）；
- v2/v3/v4 遗留 minor 项（另行处理）。

---

## 11. 验收标准

- 探索文章：进入即舞台，body 无滚动条；
- 当前幕 DOM **唯一**，其它幕**不渲染**；
- 底栏 4 按钮（◀ / ⏵ / 履历 / ✕）全部可用且行为正确；
- 键盘 ←/→/↑↓/Enter/Esc 全部生效，符合 §3.2 表格；
- 履历面板打开时键盘 ↑↓/Enter 失效，Esc 只关面板；
- 退出按钮 `navigate(-1)` 回上一路由，无历史回 `/`；
- 非幕内容（开场引言、ArchDiagram、h2/h3 章节标题）**从 DOM 中消失**（不是 CSS 隐藏）；
- 无 explore 文章版式零影响；
- 关 JS：所有幕竖向平铺可读；
- 测试（v4 现状 + 新增 ≥ 30）全绿；typecheck 0；validate 0/0；build 9 路由。