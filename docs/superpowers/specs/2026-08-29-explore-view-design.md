# 探索视图（Explore View）· 设计 spec

**作者**: yedazhi（与你协作的 AI 助手）
**最后更新**: 2026-08-29
**状态**: 定稿，待评审
**目标读者**: 你本人（产品决策者）+ 后续接手实现的 AI / 工程师
**关联文档**: [个人求职博客 · 设计 spec](./2026-08-28-personal-job-blog-design.md)

---

## 1. 背景与目标

同一篇博客需要两种叙事形态，服务两类阅读方式：

1. **阅读视图**（现状，`/posts/<slug>/`）：线性文章，从头读到尾，动画嵌在章节里随文播放。
2. **探索视图**（新增，`/posts/<slug>/explore/`）：以动画为主舞台，旁边列问题树，点击问题跳转动画对应段落并展开细节——类似游戏探索分支。

**北极星原则（用户原话）**：探索视图和博客是**同一份资源的不同渲染模式**。

由此推导出三条铁律：

- **内容只写一遍**：所有叙述文字只存在于 `article.mdx`；探索视图的答案面板是从正文抽出的 `<Answer>` 块，不是另一份摘要。
- **结构一份**：问题树的形状、顺序、seek 指针只在 `explore.yaml`；阅读视图不维护自己的问题列表。
- **动画一份**：场景（scene）按 label 分段，阅读模式的 `<SceneClip>` 与探索模式的 seek 消费同一条 GSAP timeline。

**非目标（明确不做）**：

- 全景可视化地图（关系图形态），本期只做"动画舞台 + 问题树"
- 阅读足迹 / 节点解锁状态 / 进度统计（数据模型留扩展位，不实现）
- 多场景切换（一篇博客一个 scene）
- 开源骨架整理（用户明确暂缓）

---

## 2. 路由与信息架构

| 视图 | URL | 说明 |
|---|---|---|
| 阅读 | `/posts/<slug>/` | 现状沿用 |
| 探索 | `/posts/<slug>/explore/` | 新增；仅有 `explore.yaml` 的文章才有此路由 |

- 两个视图页首互设跳转链接：「走进探索视图 →」/「← 回到阅读」。
- 顶栏导航**不**加探索入口（保持「博客 / 联系」），探索入口只出现在文章页与探索页内部。
- 探索视图支持 `#<node-id>` 锚点落地：阅读视图的 `<QuestionAnchor>` 胶囊点击后跳 `explore/#<id>`，探索视图初始化时读 hash 自动 seek 并展开该节点。

## 3. 目录约定（一篇博客 = 一个目录）

```
content/posts/<slug>/
  article.mdx        # 正文（必）。唯一内容源
  explore.yaml       # 探索配置（选）。有问题树 + seek 指针，无叙述内容
  scene.tsx          # 场景组件（选）。GSAP timeline 编排，与 explore.yaml 配套
  scene-data.ts      # 场景图形数据（选）。节点坐标/路径/文案，复杂场景才拆
  assets/            # 文章专属图片资源（选）
```

- **无逃生口**：纯文字博客也是目录 + `article.mdx`，统一心智。
- 现有 `content/posts/*.mdx` 散文件需迁移为目录结构；`public/posts/<slug>/` 下的图片迁入 `content/posts/<slug>/assets/`。
- 全站共享的动画原子（Typewriter/Counter/ArchDiagram）**不**进文章目录——它们是网站基础设施，不随博客删除。位置留在 `src/components/blog-anim/`。

## 4. 内容协议：article.mdx 的新增块

### 4.1 `<Answer>` —— 探索视图引用的完整叙述块

```mdx
## 搜索效果变差了，谁在改

<Answer id="q-search-pipeline">
三种改法：运维自己改配置（易退化）、AI 直接改（快，但要有审批兜底）、
研发单独立项（周期长但可沉淀）。完整的对比和我的选择……
</Answer>
```

- **阅读视图**：照常渲染为正文流（带左侧标记线的轻微样式），不打断阅读；
- **探索视图**：该块整体抽出，渲染进问题节点的 detail 面板。
- 同一段文字两种视图各自渲染，**只写一遍**。

### 4.2 `<QuestionAnchor>` —— 阅读视图里的探索入口胶囊

```mdx
正文某段…… <QuestionAnchor id="q-search-pipeline" />
```

渲染为小型胶囊按钮「◈ 探索 · 搜索效果变差了？谁在改」，点击跳 `/posts/<当前slug>/explore/#<id>`。

- label 文字取自 `explore.yaml` 对应节点的 `label`，**不在 MDX 里写第二遍**；
- `status: placeholder` 的节点不允许被 `<QuestionAnchor>` 引用（构建时报错）。

### 4.3 `<SceneClip>` —— 阅读视图里的动画嵌入

```mdx
<SceneClip from="q-search-pipeline" />
```

从本文 scene.tsx 的 timeline 中截取 `from` label 到下一个 label 的区段：

- 进入视口时播放一次，播完停在结束帧（IntersectionObserver 实现，`prefers-reduced-motion` 时直接呈现终态静帧）；
- 一篇文章里可放多个 `<SceneClip>`，也可以不放；
- 纯 `intro` 段落也可以被嵌（`<SceneClip from="intro" />`）。

## 5. explore.yaml schema（导演脚本，无叙述内容）

```yaml
title: AI 与工程的整体改造骨架     # 探索视图标题，可与正文标题不同
anim: ./scene                      # 场景组件路径（相对本文目录）；缺省则无动画舞台
seek_root: intro                   # 进入页面默认落点 label；缺省用 timeline 起点
nodes:
  - id: q-search-pipeline          # 唯一 id；对应正文 <Answer id>
    label: 搜索效果变差了？谁在改   # 树上显示的文字
    seek: q-search-pipeline        # timeline label；缺省则点击无动画联动（纯文字节点）
    children:
      - id: q-search-1
        label: AI 改完怎么上线？
        kind: cross-link           # 跨文章节点
        to:
          post: ai-digital-employee
          anchor: '#分级执行'

  - id: q-ops-shadow-backup
    label: AI+运维
    status: placeholder            # 待补节点
    detail: |                      # placeholder 专有：施工预告（正文就绪后删除此字段、正文加 <Answer>）
      我正在写：影子备份最小实现、gitops 在 4 台机器上的取舍。
      先放骨架——写完会用我的实际案例替换这段话。

  - id: q-tiered-approval
    label: 高风险接口是谁拍板？
    kind: cross-link
    to:
      post: ai-digital-employee
      anchor: '#分级执行'
    preview: |                    # cross-link 专有：阅读视图展开用的引子摘要
      高风险操作必须由管理员审批，这段在前篇「分级执行」一节详细讲了
      审批流的完整逻辑。探索视图点击则直接跳转。
```

### 5.1 字段表

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 探索视图页面标题 |
| `anim` | 否 | 场景组件路径；缺省则探索视图只有问题树（无舞台） |
| `seek_root` | 否 | 默认落点 label |
| `nodes[]` | 是 | 树形结构，递归 `children` |
| `nodes[].id` | 是 | 唯一；非 placeholder 节点必须在正文有 `<Answer id>` |
| `nodes[].label` | 是 | 树与胶囊按钮显示文字 |
| `nodes[].seek` | 否 | timeline label；无则纯文字节点 |
| `nodes[].kind` | 否 | `local`（默认）/ `cross-link` |
| `nodes[].status` | 否 | `placeholder` = 待补，UI 灰阶 + 「待补」角标 |
| `nodes[].to` | cross-link 必填 | `{ post, anchor }`，anchor 为目标文章 heading id |
| `nodes[].detail` | 仅 placeholder | 施工预告文案 |
| `nodes[].preview` | 仅 cross-link | 阅读视图展开用的引子摘要（探索视图不用，直接跳） |

## 6. 场景协议与 GSAP 接线

### 6.1 Scene 接口

```ts
// src/components/explore/SceneController.ts
export interface Scene {
  /** 构建按 label 分段的 GSAP timeline */
  build(): gsap.core.Timeline
  /** focus 高亮可用的元素 id 列表（声明式，供校验） */
  focusable: string[]
}

export interface SceneHandle {
  seek(label: string): void        // 瞬跳到 label
  play(): void
  pause(): void
  focus(ids: string[]): void       // 高亮元素（CSS class，0.3s transition）
  reset(): void
  /** 返回 timeline 全部 labels（构建时校验 YAML seek 值用） */
  labels(): string[]
}
```

- `cuePoints` 映射表**取消**（v2 修正）：label 命名与 YAML `seek` 值对齐即可，约定大于映射；构建时校验兜底。

### 6.2 两种消费方式（同一 timeline）

- **探索**：`tl.seek(label)` 瞬跳；`focus()` 高亮与 seek **解耦**（高亮走 CSS class，不进时间线，切换高亮不干扰时间线进度）；
- **阅读**：`<SceneClip>` 截取 `[label_i, label_{i+1})` 区段，进视口播一次。

### 6.3 生命周期与可访问性

- 初始 `pause()`——探索模式是读者驱动，不自动播放；
- 组件卸载 `tl.kill()`，防全局引用泄漏；
- `prefers-reduced-motion`：seek 直达终态帧、SceneClip 呈现静帧。

## 7. 组件结构

```
src/
  pages/
    Post.tsx                    # 阅读视图（改：支持 <Answer>/<QuestionAnchor>/<SceneClip>）
    Explore.tsx                 # 新：探索视图
  components/
    blog-anim/                  # 全站动画原子（不动）
    explore/                    # 探索机制（与具体文章无关）
      ExploreView.tsx           # 页面骨架：舞台 + 问题树
      SceneStage.tsx            # 挂 scene、持 SceneHandle、下发给树
      SceneController.ts        # tl 生命周期 + Scene/SceneHandle 接口
      QuestionTree.tsx          # 递归树、激活高亮
      QuestionNode.tsx          # 节点按钮（kind/status 决定形态）
      SceneClip.tsx             # 阅读视图动画嵌入（放这里因属场景机制，非原子）
      Answer.tsx                # <Answer> 块渲染（两视图共用）
      QuestionAnchor.tsx        # 阅读视图胶囊
  lib/
    content.ts                  # 改：目录结构迁移后的读取逻辑
    explore.ts                  # 新：getExplore(slug)、listExplorable()、构建校验
```

### 7.1 跨文章节点的双视图行为（v2 修正）

| 视图 | 行为 | 理由 |
|---|---|---|
| 探索 | 直接 `<a href>` 跳转目标文章锚点 | 探索本就是碎片化叙事，跳转不算打断 |
| 阅读 | 胶囊 + 下方展开一段摘要（YAML `preview` 字段），读者自选跳不跳 | 线性阅读不能被硬打断 |

## 8. 构建管线

1. **内容扫描**：`content.ts` 改为扫 `content/posts/*/article.mdx`；`assets/` 内图片在 MDX 里以相对路径引用，构建期由 Vite 处理（import 或 new URL）；
2. **场景编译**：`import.meta.glob('../content/posts/*/scene.tsx', { eager: true })`（仿现有 `Post.tsx` 的 mdxModules 手法），slug 从路径提取，注册成 `scenes[slug]`；
3. **资源同步**：构建时把各文章 `assets/` 同步拷贝到 `public/posts/<slug>/`（保持图片 URL 路径不变，已有文章里的 `/posts/<slug>/*.webp` 引用不失效）；
4. **构建时校验**（`lib/explore.ts`，`vite build` 期执行，错误即 fail）：
   - YAML 非 placeholder 节点的 `id` 在正文 `<Answer id>` 中存在；
   - 正文 `<Answer id>` 均被 YAML 树引用（否则警告：探索视图用不上）；
   - `seek` / `seek_root` 值在 scene timeline labels 中存在；
   - `cross-link` 的 `to.post` 存在、`to.anchor` 是目标文章真实 heading id；
   - `<QuestionAnchor>` 不引用 placeholder 节点；
   - `<SceneClip from>` 的 label 存在于本文 scene。

## 9. 响应式布局

- **桌面（≥920px，沿用现有断点）**：左右分栏——左动画舞台（大）、右问题树（窄列），联动即时可见；
- **移动（<920px）**：上下布局——动画在上（全宽）、问题树在下；点击问题后自动滚动回舞台，保证联动可见。

## 10. 首篇内容：双文章同源

| 文章 | 形态 |
|---|---|
| `ai-it-system`（新，来自 raw/AI提效.md） | 探索视图 + 阅读视图；骨架先行——搜索流水线一节完整可写，AI+运维 / AI+BI / 成本核算为 placeholder 节点 |
| `ai-digital-employee`（已有） | 阅读视图 + 试点 `<QuestionAnchor>` 胶囊；作为前者 cross-link 的目标 |

两篇互相引用，正好示范跨文章跳转的两种行为。

## 11. 测试策略

- **单元**：explore.yaml 解析与校验规则（每条规则一个用例）；SceneHandle 的 seek/pause/kill；QuestionTree 激活态切换；
- **组件**：ExploreView 渲染树结构、placeholder 灰阶、cross-link 的 href 正确性；SceneClip 的 IntersectionObserver 触发（mock）；
- **端到端手测清单**：桌面/移动布局、hash 落地 seek、reduced-motion 降级、场景 kill 后无残留定时器。

## 12. 里程碑（建议实现顺序）

1. 目录迁移：散 mdx → 目录结构 + assets 同步管线（不改任何行为）；
2. 内容协议：`<Answer>` / `<QuestionAnchor>` / `<SceneClip>` 组件 + 阅读视图适配；
3. 探索机制：SceneController / SceneStage / QuestionTree + Explore.tsx 路由；
4. 构建校验：lib/explore.ts 全部规则；
5. 首篇内容：ai-it-system 场景 + YAML + 正文（placeholder 就位）。

每步独立可交付，1–2 步完成后现有网站行为不变。
