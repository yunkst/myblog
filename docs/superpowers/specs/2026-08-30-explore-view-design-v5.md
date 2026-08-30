# 探索视图（Explore View）v5 · 全屏单幕 + 显式导航 + MDX 退出

**作者**: yedazhi（与 AI 助手协作）
**最后更新**: 2026-08-30
**状态**: 已确认设计，待实施（第二轮修订：MDX 彻底退出）
**前置**: [v4 spec](./2026-08-30-explore-view-design-v4.md)（单幕可见 + 全屏 mode 1 + 履历栈 + Director 三种演出）
**关联**: [v3 spec](./2026-08-29-explore-view-design-v3.md)、[v2 spec](./2026-08-29-explore-view-design-v2.md)

---

## 0. v5 要解决什么

v4 已经做到「同一时间只有一屏可见」，但**仍然是文章页的延伸**：

1. **文章框架仍在**：domain 标签、日期、`<h1>` 标题、excerpt、`post-nav` 上一篇/下一篇全部保留——舞台只是塞进文章页的一块拼图，不是文章本身；
2. **非幕内容仍在 DOM**：`article.mdx` 里 `<Answer>` 之外的引导 blockquote、章节标题（h2/h3）、`<ArchDiagram>` 静态图、`![alt](.webp)` 配图等都在 DOM 里——只是被 CSS `display: none` 隐藏，没有被清除；
3. **DOM 里同时存在多个 `<Answer>`**：每个幕即使不可见也占着结构（act-head / stage / dialogue / choices 全部静态直出），违反「一篇文章 = 一个场景 + 导航」的构想；
4. **没有键盘**：跳幕、跳过演出、回退全靠鼠标，体验割裂；
5. **没有显式退出**：读者不知道「这是一个独立视图」，以为还在文章页里；
6. **MDX 格式成为结构性阻碍**（第二轮修订新增）：`import.meta.glob` 把整篇文章编译成一个 React 组件，11 个 `<Answer>` 缠在一起——「只挂载一幕」只能整篇渲染再过滤；幕结构在 yaml、幕正文在 mdx，两处数据靠 id 字符串配对；markdown 特性在单幕舞台模式下大半用不上。

v5 把探索视图**彻底从文章页剥离，同时把 MDX 从内容管线中彻底拔除**：

- 进入探索文章 = **进入一个独立舞台**；舞台里只有当前幕 + 导航条；
- 退出舞台 = 回到文章列表 / 上一路由；
- 舞台**没有滚动**：当前幕铺满视口（mode 1 全屏 demo 也铺满视口，自然无滚动）；
- 舞台**只有一种状态**：激活幕；其他幕不渲染；
- 导航能力全部**显式**（底栏 / 履历面板 / 键盘 / 出口 chips）；
- **每个场景一个 `.tsx` 文件**，文件名 = 场景 id，天然单幕挂载；
- **`article.mdx` / `@mdx-js` / `remark-*` 整条 MDX 管线退役**；文章元数据改 `meta.yaml`。

---

## 1. 不变的东西（v4 继承，逐条列出防止误改）

| 层 | 不变项 |
|---|---|
| 路由 | `/blog/<slug>/` 单页；`#<scene-id>` 原生锚点；不改 URL 结构 |
| explore.yaml schema | `ExploreConfig { title, entry, scenes[] }` 不变；`scenes[].mode` 继续使用 |
| Scene 协议 | `Scene { name, Stage, build() }` + `DemoHandle` 不动 |
| demo 动画 | 11 + 1 个 GSAP timeline（`scene-builds.tsx` / `scene-stages.tsx` / `scene.tsx`）**一行不改** |
| SceneClip 内部 | `ref` / IO / `data-finished` 机制**内部代码不动**；imperative API 继续沿用 |
| Director 三种演出 | mode 1/2/3 编排逻辑（v4 已实现）不动 |
| Director.skip() | 点击空白跳过演出继续 |
| 履历栈 | sessionStorage 持久化 + pop / jumpTo（v4）不动 |
| CRT 剧场视觉 | 暗底 / 扫描线 / 名字牌 / 選択肢样式不动 |
| ArchDiagram 组件 | `src/components/blog-anim/ArchDiagram.tsx` 与 `diagrams/ai-digital-employee.ts` 不动（场景 tsx 继续直接 import） |

**明确废除的东西**（v5 删除清单）：

| 废除项 | 原因 |
|---|---|
| `article.mdx`（全部 5 篇） | 探索文章正文迁 `scenes/*.tsx`；其余 4 篇**直接删除**（用户裁定，不带历史负担） |
| `@mdx-js/react` / `@mdx-js/rollup` 依赖 | MDX 编译管线退出 |
| `remark-gfm` / `remark-frontmatter` 依赖 | 只为 MDX 服务 |
| vite.config.ts 的 mdx 插件 + `remarkExportFrontmatter` + `rehypeHeadingIds` + `yamlToExpression` | 同上 |
| `MDXProvider` / `components={{...registry}}` 注入机制 | 场景 tsx 直接 import 组件，不再需要全局映射 |
| `lib/content.client.ts` + vite alias 切换 hack | 双文件并存是为「MDX 客户端编译」设计的；元数据改 yaml glob 后浏览器可直读，合并回单一 `lib/content.ts`（纯函数 + glob，SSG 与浏览器同源） |
| `<Answer id>` 在正文中的用法 | Answer 退化为 Stage 内部渲染机制，作者不再写它 |
| `gray-matter` 依赖 | frontmatter 不存在了；yaml 统一用 js-yaml |

---

## 2. 视图模型：从「文章页里的舞台」→ 「独立舞台」

### 2.1 路由 → 视图

| URL | 视图 | 渲染策略 |
|---|---|---|
| `/` | 首页（不变） | Hero + PostList + WIP + FAQ + Contact |
| `/blog/<slug>/` | **舞台**（v5 唯一文章视图） | 整页 = 舞台容器，只渲染当前激活的幕，无 post-meta / h1 / excerpt / post-nav |
| `/domain/<slug>/` | 领域页（不变） | 列表样式照旧 |

**判断逻辑**：v5 起所有文章都是探索文章（只有 ai-digital-employee 一篇），`Post.tsx` 薄壳直接渲染 `<Stage>`。数据层保留 `hasExplore` 字段以备未来混排（有 meta.yaml 无 explore.yaml 的文章渲染「敬请期待」占位页，不做旧文档视图）。

### 2.2 舞台容器结构

```
<main class="stage-frame" data-article-slug>
  <ExploreRouter onExit>
    <div class="stage-stage">            ← 唯一幕容器；幕内容超高时幕内滚，body 永不滚
      <Answer scene={activeScene}>       ← 由 Stage 组装，act-head / stage / dialogue / choices
        <SceneComponent />               ← scenes/<activeId>.tsx，直接 import 的 React 组件
      </Answer>
    </div>
    <nav class="stage-nav">              ← 底部导航条
      <button>◀ 返回</button>
      <button>⏵ 继续：<下一幕 label></button>
      <button>履历 ▾</button>
      <button>✕ 退出</button>
    </nav>
    <HistoryPanel>                       ← 点开挂载
      ├─ 动作镜像（◀/⏵/✕）
      ├─ 出口树（主线 + features + questions）
      └─ 访问历史
    </HistoryPanel>
  </ExploreRouter>
</main>
```

**关键差异**（v5 vs v4）：

- 没有 `<article class="post-body">`，没有 `post-meta` / `h1` / `excerpt` / `post-nav`；
- 场景组件**只有激活幕一个**进 DOM（glob 按文件名直接取，天然单挂载）；
- body **不滚动**（mode 1 全屏也铺满视口，不溢出）；
- 导航是**底部导航条**（StageNav），HistoryFAB 删除；
- 新增「继续」（主线下一幕）、「退出」（回上一路由）按钮与全套键盘快捷键。

### 2.3 内容格式：每场景一个 `.tsx`，MDX 退出

**用户裁定（2026-08-30，两轮）**：
1. 场景单元源文件选 **`.tsx`**（作者写 JSX，类型检查/重命名最稳）；
2. **旧文章直接删掉，不带历史负担，MDX 彻底退出**——只保留 ai-digital-employee 一篇重写，其余 4 篇删除。

```
content/posts/ai-digital-employee/
  meta.yaml             # 文章元数据：title / slug / domain / date / anim_profile / status / excerpt
  explore.yaml          # 幕结构唯一事实源（id/label/demo/features/questions/mode）——不变
  scene.tsx             # demos 字典——不变
  scene-builds.tsx      # demo timelines——不变
  scene-stages.tsx      # demo Stages——不变
  assets/               # webp 图片——不变（场景 tsx 继续引用）
  scenes/
    q-problem.tsx           # default export React 组件 = 该幕正文
    q-why-not-openclaw.tsx
    q-four-prerequisites.tsx
    q-badge-metaphor.tsx
    q-protocol-repo.tsx
    q-unified-identity.tsx
    q-tiered-execution.tsx
    q-tiered-confirm.tsx
    q-threat-model.tsx
    q-limits.tsx
    q-future.tsx
```

**约定**：

- **文件名 = 场景 id**：`scenes/<id>.tsx` default export `() => JSX.Element`。glob `'/content/posts/*/scenes/*.tsx'` 按「目录 slug + 文件名」双键索引，Stage 按 activeId 直接取组件挂载——**没有过滤、没有 hack**；
- **meta.yaml**（新增约定）：`title/slug/domain/date/anim_profile/status/excerpt` 七字段，与原 frontmatter 语义一致。`lib/content.ts` 读法与 explore.yaml 同款（`?raw` glob + js-yaml），SSG 与浏览器同一份代码；
- **原 `<Answer>` 内的 markdown 翻译为 JSX**：段落 → `<p>`、`**bold**` → `<strong>`、表格 → `<table>`、`![alt](src)` → `<img alt src>`、`>` 引用 → `<blockquote>`、有序/无序列表 → `<ol>/<ul>`。**幕标题（h2/h3）不迁移**——act-head 用 yaml `label` 渲染（Answer 兜底逻辑）；
- **原 `<Answer>` 外的内容不迁移**（开场 blockquote、文末总结、非幕章节——用户已裁定全部删除）；
- **SceneClip / ArchDiagram 用法不变**：`<SceneClip demo="message-flood" />`、`<ArchDiagram {...figArchitecture} caption="..." />` 照旧，import 路径 `../../../../src/components/...`（层级从 posts/<slug>/ 变 posts/<slug>/scenes/，+1 级）；
- **正文里的 webp 图**：`<img src="/posts/ai-digital-employee/xxx.webp" alt="..." />`——vite dev 服务器与 build 拷贝逻辑（`serve-post-assets`）不变。

**validate 规则更新**（`validateAnswerOnlyMdx` 作废，换成）：
- `scenes/<id>.tsx` 与 yaml `scenes[].id` **双向对齐**：yaml 有 id 无文件 → 报错；有文件无 id → 报错；
- meta.yaml 必填字段校验（title/date）。

**为什么不是其它格式**（记录备查）：yaml 全包（散文可读性差、不支持嵌套元素）；拆 .mdx 每幕一文件（仍要 MDX 编译管线，混排心智没变）；AnswerGate 过滤（整篇编译的语义债不解决）。

---

## 3. 导航能力（v5 全部显式）

### 3.1 鼠标导航

| 元素 | 行为 |
|---|---|
| 底栏 ◀ 返回 | 履历栈 `pop()`；栈 ≤ 1 时禁用 |
| 底栏 ⏵ 继续 | 跳到 `scenes[(idx+1) % scenes.length]`（主线下一幕） |
| 底栏 履历 ▾ | 打开 HistoryPanel |
| 底栏 ✕ 退出 | `navigate(-1)`；无历史时回 `/` |
| 履历面板里的动作镜像 | 同底栏三个动作 |
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
| `Esc` | 关闭履历面板；面板关时退出舞台 | 永远启用 |

**实现位置**：`useKeyboardShortcuts(handlers, enabled)` hook；`ExploreRouter` 消费，`enabled = !panelOpen`（面板开时非 Esc 全禁）。

**文本输入冲突守卫**：`event.target` 是 `<input>` / `<textarea>` / `<select>` / `[contenteditable]` 时所有快捷键失效。

**焦点环**：键盘 ↑↓ 选中的 chip 有 `.exit-chip--focused` 样式（`outline: 2px solid var(--sacc)`）；鼠标 hover 不抢焦点。

### 3.3 履历面板（升级）

保留 v4 出口树 + 访问历史双栏；**新增动作镜像按钮条**（面板顶部）：

```
─ 探索履历 ─                           [×]
[◀ 返回]  [⏵ 继续：xxx]  [✕ 退出]
─ 主线/支线 ─
  ▸ 继续：xxx
  ▸ yyy
  ？zzz
─ 访问历史 ─
  01 q-problem
  02 q-badge-metaphor
```

### 3.4 入口路径

| 入口 | 行为 |
|---|---|
| PostList 卡片 `▶ 进入舞台 · {entry.label}` | 直接进入舞台，激活 `entry` 幕 |
| URL `/blog/<slug>/`（无 hash） | 进舞台，激活 `entry` 幕 |
| URL `/blog/<slug>/#<id>` | 进舞台，激活 `<id>` 幕（无效 id 回落 entry） |
| 从外部链接 | 进舞台，激活目标幕 |

**PostList 卡片变更**：卡片整体仍是 `<Link>`（可达性），探索文章的入口徽标文案改为 `▶ 进入舞台 · {label}`。

---

## 4. 演出编排（继承 v4）

### 4.1 三种 mode（yaml 显式标注沿用）

| mode | 行为 | 现状 |
|---|---|---|
| 1 | 全屏 demo 先 → 缩窗 → 文字 → choices | q-problem、q-tiered-confirm |
| 2 | 文字 → demo → choices（默认） | 其余 9 幕 |
| 3 | 纯文字（无 demo） | 当前无幕使用，编排保留 |

### 4.2 Director 行为不变

- 演出 = GSAP timeline 链（fadeIn / typewriter / demo play / choicesRise）；
- skip = 当前段 `progress(1)`，下一段接力；
- seenScenes 已看过的幕直出终态；
- reduced-motion 直出终态。

**Answer 组装方式变更**（演出不变，喂入方式变）：

- 旧：`<Answer id="...">` 由 MDX children 携带正文，partition 按 child.type 分区（heading/SceneClip/其余）；
- 新：`<Answer scene={scene} body={<SceneComponent />}>`——Stage 从 yaml 取 scene、从 glob 取 body，Answer 仍产出 act-head / stage / dialogue / choices 五段式 + Director 演出层。SceneClip 元素由 Answer 从 body.children 里识别（child.type === SceneClip 判定不变——场景 tsx 直接 import 的 SceneClip 与 Answer import 的是同一模块实例）。

### 4.3 视觉约束

- `.stage-frame`: `position: fixed; inset: 0;`；body `stage-locked` → `overflow: hidden`；
- `.theater`（Answer 的 section）在 `.stage-stage` 内居中；幕内容超高时 `.stage-stage` 幕内滚动；
- mode 1 全屏 demo：`.stage--fullscreen` 直接等于舞台本身（v5 没有「缩窗到 theater 区域」——全屏 = 整页）；
- 字号、断点、行宽沿用 v4（CRT 剧场视觉）。

---

## 5. 数据层：meta.yaml + content.ts 合并

```
lib/content.ts（唯一数据层，SSG 与浏览器同源）
  ├─ metaYamls   = import.meta.glob('/content/posts/*/meta.yaml',  { query: '?raw', ... })
  ├─ exploreYamls = import.meta.glob('/content/posts/*/explore.yaml', { query: '?raw', ... })
  └─ getAllPosts / getPost / getPostsByDomain / getAllDomains / getWips / getFAQs / getSite
```

- `hasExplore` = exploreYamls 里有对应 key（逻辑从 content.client.ts 迁回）；
- `exploreEntry` 计算同现状；
- `vite.config.ts` 删除客户端 alias 切换（`lib/content` 不再有 client 替身）；
- `getWips`：content/wip/ 不存在 → 返回 `[]`（现状行为，保留接口）。

---

## 6. 组件结构

```
src/
  pages/
    Post.tsx                        # 薄壳：post 不存在占位 / 有 explore → Stage / 无 → 敬请期待占位
    Stage.tsx                       # 新建：舞台壳（main.stage-frame + ExploreRouter + Answer + StageNav）
  components/
    PostList.tsx                    # 改动：探索文章入口文案「▶ 进入舞台 · <label>」
    explore/
      Director.tsx                  # 不动
      ExploreRouter.tsx             # 改动：不再包 <article>；加键盘；加 onExit prop；runtime 暴露 back/canBack/panelOpen/onExit/focusedExitIdx
      HistoryPanel.tsx              # 改动：顶部动作镜像条
      HistoryFAB.tsx                # **删除**
      Answer.tsx                    # 改动：props 从 {id, children} 改 {scene, body}；heading 兜底 yaml label；partition 改从 body 取
      SceneClip.tsx                 # 不动（setCurrentSlug 机制保留）
      ExitChips.tsx                 # 改动：+baseIdx prop（键盘焦点序）
      useHistoryStack.ts            # 不动
      useTypewriter.ts              # 不动
      useKeyboardShortcuts.ts       # 新建：←→↑↓Enter/Esc；editable 守卫；enabled 参数
      StageNav.tsx                  # 新建：底部导航条
      SceneRoute.tsx                # 新建：scenes glob 按 activeId 取组件 → 渲染 <Answer>
  styles/
    global.css                      # 改动：v3/v4 stage 作用域 .post-wrap--stage → .stage-frame；删 post-meta/h1/post-excerpt/history-fab 规则；+ .stage-nav/.exit-chip--focused/.history-panel__actions
  lib/
    content.ts                      # 改动：meta.yaml glob 读法；合并 content.client.ts；删 gray-matter
    content.client.ts               # **删除**
    explore.ts                      # 改动：validateAnswerOnlyMdx 作废 → scenes 双向对齐校验
    types.ts                        # 微调：Post.body 字段删除（无 markdown 正文概念）
content/
  posts/
    ai-digital-employee/
      meta.yaml                     # 新建（原 frontmatter 七字段）
      scenes/*.tsx                  # 新建 11 个场景组件（正文迁移）
      article.mdx                   # **删除**
      explore.yaml / scene*.tsx / assets/   # 不动
    ai-it-system/                   # **整目录删除**
    bi-agent-7-days-saved-200k/     # **整目录删除**
    kill-the-legacy-password/       # **整目录删除**
    shixi-open-source-study-app/    # **整目录删除**
scripts/
  validate-explore.ts               # 改动：scenes 双向对齐 + meta.yaml 校验
package.json                       # 改动：卸载 @mdx-js/react @mdx-js/rollup remark-gfm remark-frontmatter gray-matter
vite.config.ts                     # 改动：删 mdx 插件族 + 客户端 content alias；serve-post-assets 保留
```

---

## 7. 关键代码草图

### 7.1 Post.tsx（薄壳）

```tsx
export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])
  if (!post) return <main className="post-wrap"><p>文章不存在。</p></main>
  return post.hasExplore ? <Stage post={post} /> : (
    <main className="post-wrap"><p>这篇文章还在写作中，敬请期待。</p></main>
  )
}
```

### 7.2 Stage.tsx（新）

```tsx
export default function Stage({ post }: { post: Post }) {
  const navigate = useNavigate()
  const config = useMemo(() => exploreConfigFor(post.slug), [post.slug])
  setCurrentSlug(post.slug)   // SceneClip 反查机制不变（渲染期同步赋值）

  const handleExit = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }, [navigate])

  if (!config) return <main className="post-wrap"><p>探索配置缺失。</p></main>

  return (
    <main className="stage-frame" data-article-slug={post.slug}>
      <ExploreRouter config={config} onExit={handleExit}>
        <SceneRoute slug={post.slug} />
        <StageNav />
      </ExploreRouter>
    </main>
  )
}
```

### 7.3 SceneRoute.tsx（新）——单幕挂载的核心

```tsx
const sceneModules = import.meta.glob<{ default: ComponentType }>(
  '/content/posts/*/scenes/*.tsx',
  { eager: true },
)

export default function SceneRoute({ slug }: { slug: string }) {
  const runtime = useContext(ExploreRuntimeContext)
  const config = useContext(ExploreConfigContext)
  const scene = config?.scenes.find((s) => s.id === runtime!.activeId)

  const Scene = useMemo(() => {
    const key = Object.keys(sceneModules).find((k) =>
      k.split('/').slice(-3, -2)[0] === slug &&
      k.split('/').slice(-1)[0].replace(/\.tsx$/, '') === runtime!.activeId)
    return key ? sceneModules[key].default : null
  }, [slug, runtime!.activeId])

  if (!scene || !Scene) return null
  return (
    <div className="stage-stage">
      {/* key=activeId：切幕即重挂——Director 演出重建 */}
      <Answer key={scene.id} scene={scene} body={<Scene />} />
    </div>
  )
}
```

### 7.4 Answer.tsx（改造）

```tsx
interface Props { scene: ExploreScene; body: ReactNode }

export default function Answer({ scene, body }: Props) {
  // partition 逻辑从「MDX children」改为「body 元素树」：child.type === SceneClip → stage 区；
  // h2/h3 heading 不再期待（yaml label 兜底）；其余（p/table/img/…）→ dialogue 区。
  const { heading, clips, rest } = partition(body)
  const headTitle = heading ?? <h2>{scene.label}</h2>
  // 其余五段式 + Director 演出层（mode 判定/演出条件/skip 回传）与 v4 完全一致
  ...
}
```

### 7.5 useKeyboardShortcuts.ts（新）

```ts
export function useKeyboardShortcuts(handlers: KeyboardHandlers, enabled = true) {
  const ref = useRef(handlers)
  useEffect(() => { ref.current = handlers })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.key === 'Escape') { ref.current.onEsc(); return }
      if (!enabled) return
      switch (e.key) {
        case 'ArrowLeft': ref.current.onBack(); break
        case 'ArrowRight': ref.current.onNext(); break
        case 'ArrowUp': e.preventDefault(); ref.current.onArrowUp(); break
        case 'ArrowDown': e.preventDefault(); ref.current.onArrowDown(); break
        case 'Enter': ref.current.onEnter(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
```

焦点出口状态（`focusedExitIdx`）与 ↑↓/Enter 处理在 ExploreRouter 内实现（spec §3.2）。

### 7.6 ExploreRouter 升级

```tsx
export function ExploreRouter({ config, onExit, children }: Props) {
  // ... 既有：activeId / history / seenScenes / firstActivation / goTo / back / jumpTo / onActivate / skip ...
  // v5 runtime 追加：back / canBack / panelOpen / setPanelOpen / onExit / focusedExitIdx

  useKeyboardShortcuts({
    onBack: () => back(),
    onNext: () => goTo(nextSceneId()),
    onArrowUp: () => cycleExit(-1),
    onArrowDown: () => cycleExit(+1),
    onEnter: () => activateFocusedExit(),
    onEsc: () => (panelOpenRef.current ? setPanelOpen(false) : onExitRef.current?.()),
  }, !panelOpen)
  // 既有「Esc 关闭面板」独立 effect 删除（并入 onEsc），避免双触发
}
```

---

## 8. 测试策略

### 8.1 单元

- `useKeyboardShortcuts`：六键触发、editable 守卫、enabled=false 非 Esc 失效、卸载注销；
- content.ts：meta.yaml 解析（必填 title/date、缺省 status=published）、hasExplore、exploreEntry；
- explore.ts 校验：scenes 双向对齐（yaml↔文件）、meta.yaml 必填。

### 8.2 组件

- `SceneRoute`：activeId → 正确场景组件挂载；切 activeId 重挂（key）；无匹配渲染 null；
- `Answer`：body 分区（SceneClip → stage、其余 → dialogue）、yaml label 兜底 heading、演出层（Director 条件）回归；
- `StageNav`：4 按钮、canBack disabled、动作分发；
- `ExploreRouter`：键盘 → goTo/back/cycleExit/onExit；面板开时非 Esc 失效；
- `HistoryPanel`：动作镜像条渲染与分发；
- `Post`：薄壳分流（explore → Stage；非 explore → 占位）；
- `PostList`：入口文案「▶ 进入舞台 · <label>」。

### 8.3 端到手测清单（Playwright/人工）

- `/blog/ai-digital-employee/`：全屏舞台、body 无滚动条、唯一 `.theater`、底栏 4 按钮；
- `←/→/↑↓/Enter/Esc` 全键盘走查（含面板开合态）；
- `✕ 退出` 回列表；mode 1/2 演出链正常；点击空白 skip；「↻ 重看」只重播 demo；
- 移动端 390px 底栏不溢出；reduced-motion 直出终态；
- 关 JS：SSG HTML 完整可读（entry 幕平铺可见）；
- 首页/领域页列表正常、入口直达；
- 构建产物无 MDX 相关 chunk。

---

## 9. 内容迁移映射（ai-digital-employee）

| 原文位置（article.mdx 行号） | 原内容 | 去向 |
|---|---|---|
| 1-8 | frontmatter | `meta.yaml` |
| 11-14 | import 块 | 拆入各 scenes/*.tsx 头部 |
| 16、18 | 开场两段 blockquote | **删除**（用户裁定） |
| 20-32 | `<Answer id="q-problem">`（含 h2、SceneClip、2 段、1 图） | `scenes/q-problem.tsx`（h2 删，label 在 yaml） |
| 34 | h2 章节标题 | **删除** |
| 36-50 | q-why-not-openclaw | `scenes/q-why-not-openclaw.tsx` |
| 52 | h2 | 删除 |
| 54-67 | q-four-prerequisites | `scenes/q-four-prerequisites.tsx` |
| 69 | h2 | 删除 |
| 71-94 | q-badge-metaphor（含 1 图、1 ArchDiagram） | `scenes/q-badge-metaphor.tsx` |
| 96 / 117 / 144 / 171 | h3 小节标题 | 删除 |
| 98-115 / 119-142 / 146-169 / 173-182 | 四个幕 | 对应 scenes/*.tsx |
| 184 / 203 / 209 / 213 / 233 / 249 | h2 章节标题 | 删除 |
| 186-201 | q-threat-model | `scenes/q-threat-model.tsx` |
| 205-207 | 知识库问答两段（非幕） | **删除** |
| 211 | AI 侧审计段（非幕） | **删除** |
| 215-231 | q-future（含 1 ArchDiagram） | `scenes/q-future.tsx` |
| 235-247 | q-limits | `scenes/q-limits.tsx` |
| 251-253 | 「最后」总结两段（非幕） | **删除** |

markdown → JSX 翻译规则：段落 `<p>`；`**x**` → `<strong>`；`- x` → `<ul><li>`；`1. x` → `<ol><li>`（嵌套列表同构）；表格 `<table>`（th/td）；`![alt](src)` → `<img>`；行内代码 `` `x` `` → `<code>`。

---

## 10. 明确不做（本期范围外）

- 移动端 swipe 切幕（v4 已拒绝）；
- mode 1 剧场音效（v4 已拒绝）；
- 非探索文章的完整文档视图（v5 只有占位页；未来需要时另立 spec）；
- 文章编辑 UI / 场景脚手架生成器；
- 自定义快捷键配置 UI；
- v2/v3/v4 遗留 minor 项清偿。

---

## 11. 验收标准

- 探索文章：进入即舞台，body 无滚动条；
- 当前幕 DOM **唯一**，其它幕**不渲染**；
- 底栏 4 按钮全部可用；键盘六键符合 §3.2；面板动作镜像可用；
- 退出回上一路由，无历史回 `/`；
- 正文以 JSX 渲染：段落/表格/图片/引用/ArchDiagram/SceneClip 全部正常显示；
- `package.json` 无 @mdx-js/*、remark-*、gray-matter；`vite.config.ts` 无 mdx 插件；
- 构建产物无 MDX chunk；typecheck 0；validate 0/0；`pnpm build` 成功；
- 全部测试绿（含迁移后场景组件的渲染回归）；