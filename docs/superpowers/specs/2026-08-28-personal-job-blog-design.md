# 个人求职博客 · 设计 spec

**作者**: yedazhi（与你协作的 AI 助手）
**最后更新**: 2026-08-28
**状态**: 修订稿 v2（渲染架构改为 SSG 预渲染），待评审
**目标读者**: 你本人（产品决策者）+ 后续接手实现的 AI / 工程师

---

## 1. 背景与目标

一个个人网站，主要面向**招聘方（HR、技术面试官、猎头）**，用于：

1. 在 **10 秒内**让 HR 判断"这位候选人值不值得约面试"。
2. 提供**自助深入**的路径 —— HR 如果对某个亮点感兴趣，自己点开看更详细的故事。
3. 展示**最近在写 / 在做的内容**，体现"这人仍在持续输出"。
4. 留下**清晰的联系方式**（公开邮箱 + 微信二维码 + GitHub）。

**非目标（明确不做）**：

- 多用户登录、评论、私信（不要做内容社区）
- 在线写文章的后台 UI（用 markdown + Git）
- 服务端鉴权 / 付费墙 / 任何付费内容
- 微信公众号原创文章自动同步（保留扩展点，但 MVP 不实现）
- 国际化（仅中文；未来可加）

---

## 2. 受众与场景

| 受众 | 频率 | 关键诉求 | 关键拒绝 |
|---|---|---|---|
| HR / 招聘 | 一过性浏览 | 快速看到亮点 + 联系方式 + 写过的内容 | 不要被打断去注册 / 选问题树 |
| 技术面试官 | 短时间深读某段 | 跳到自己关心的技术段落，看具体选型与架构图 | 不要被炫技动画妨碍阅读 |
| 同行 / 朋友 | 偶尔访问 | 看新内容 / 项目进展 | 不要强制点"我感兴趣的方向" |

---

## 3. 核心体验描述

### 3.1 首次访问（HR 视角）

1. **首屏 ≤ 1 屏**：身份（一句话）+ 亮点（5–8 个标签云 / 微小卡片）+ 联系方式模块**已在首屏可见**。
2. **粘性侧栏（FAQ 列）**：屏幕右侧列出 5–8 个"HR 常问的问题"。**不是问题树**，是导航菜单；点了页面平滑滚动到对应段落，并触发该段动画。
3. **博客区**：首页中后段，按时间倒序展示文章（卡片列表：标题、领域 tag、日期、一句话摘要、动画风格 tag）。
4. **在做项目**：底部"现在在做的事"区（带进度条的卡片）。
5. **联系方式**：邮箱 + 微信二维码 + GitHub。固定可见。

### 3.2 互动了解更多

FAQ 的 `target` 有两种，点击行为分别定义：

- **同页锚点**（`#contact` 这类）：页面**平滑滚动**到对应 section，并触发该段动画。
- **跨页锚点**（`/blog/<slug>#section` 这类）：先**路由跳转**到文章页；落地渲染完成后（`requestAnimationFrame` 之后）再平滑滚动到目标锚点，并触发该段动画。

动画触发规则（按 `anim_profile` 与组件类型）：

- `auto` 段：淡入到位即可。
- `data-narrative` 段：`<Counter/>` 从初始值打到目标值。
- `architecture` 段：`<ArchDiagram/>` 节点依次出现 + 边依次画出。
- `story` 段：`<Typewriter/>` 逐字打出。

HR 也可以直接点首页亮点的具体项，**等价于 FAQ 行为**（跳到对应段落触发动画）—— 亮点和 FAQ 是同一个东西的两个视图。

### 3.3 浏览单篇文章

- 文章 URL：`/blog/<slug>`，直链可分享。
- 文章页内有：标题 / 领域 tag / 日期 / 正文 / 上下篇导航 / "本文被 FAQ 引用了"的反链。
- 文章段落可能有 `<Typewriter/>` `<Counter/>` `<ArchDiagram/>` 等内嵌组件。
- 文章不属于某个领域 → 自动归到 `general`。`domain` 字段缺失即 `general`。

### 3.4 浏览某个领域

- URL：`/domain/<domain_slug>`。
- 列出该领域下所有文章（按时间倒序）+ 涉及的"在做项目"（如果有）。
- 领域作为**侧栏或顶部 tag** 始终可达。

---

## 4. 内容模型

### 4.1 文章（post）

```yaml
---
title: 我用 GSAP 做了一次端到端提速
slug: vite-gsap-speedup        # URL 用;缺省由 title 生成
domain: frontend               # 必填或留空(=general)
date: 2026-08-28
anim_profile: data-narrative   # auto | data-narrative | architecture | story
status: published              # draft | published | scheduled
excerpt: 一句话摘要             # 列表页/SEO 用
---

# 正文（MDX）

<Typewriter text="..." />
<Counter from={0} to={4200} />
```

### 4.2 领域（domain）

非主体，**自动生成** —— `domain:` 字段取所有可能值，列出文章数、最近更新。

```yaml
# 运行时聚合（不存文件）
domain/:
  frontend/:
    - vite-gsap-speedup
    - chat-ssr-rewrite
  backend/:
    - wms-restructure
  general/:
    - ...
```

### 4.3 FAQ（粘性问题列）

```yaml
# content/faqs.yaml
- id: tech-stack
  text: 你常用的技术栈是？
  target: /blog/vite-gsap-speedup#stack
- id: hardest-project
  text: 做过的最复杂的项目？
  target: /blog/wms-restructure#problem
- id: contact
  text: 怎么联系到你？
  target: #contact             # 首页 section
```

### 4.4 在做项目（wip）

```yaml
---
title: 求职博客本身
status: in-progress            # exploring | in-progress | blocked | done
progress: 60                   # 0-100
started: 2026-07-15
thoughts: |                    # 一段当前思考/踩坑
  ...
---
```

### 4.5 联系方式（contact）

```yaml
# content/site.yaml
site:
  name: yedazhi
  tagline: 一句话定位
  email: <公开邮箱>
  wechat_qr: /static/wechat.png
  github: <URL>
  domains:                     # 领域列表（仅展示，不写文件）
    - frontend
    - backend
    - ai-experiments
```

---

## 5. 架构与依赖

### 5.1 渲染架构：SSG 预渲染（v2 修订）

**决策**：构建时预渲染（SSG）。构建过程把 `/`、`/blog`、每篇 `/blog/<slug>`、每个 `/domain/<slug>` 都渲染成**真实 HTML 文件**；浏览器秒出内容后 React 接管（hydration），GSAP 动画在客户端照常运行。

**为什么不是纯 SPA**：纯 SPA（Vite + react-router 默认产物）只有单个 `index.html`，首屏白屏、无 SEO、微信分享卡片拿不到文章标题摘要 —— 与"HR 10 秒决策"和"搜名字找到博客"的真实场景冲突。

**选型**：`vite-react-ssg`（Vite 生态的 React SSG 插件，react-router 路由约定直接复用）。备选 `vike`（更底层、可定制更强）；若两者与 MDX/GSAP 集成受阻，评估 Astro 兜底（React 组件可直接复用，代价是换构建框架）。

```
┌──────────────────────────────────────────┐
│ Vite + vite-react-ssg + React + TS       │
│ ├─ MDX（markdown + JSX 文章源）          │
│ ├─ GSAP（动画 + ScrollTrigger，客户端跑） │
│ ├─ gray-matter（frontmatter 解析）        │
│ └─ react-router（路由即 SSG 路由表）      │
└──────────────────────────────────────────┘
            ↓ build
   dist/  每条路由一个真实 index.html
          （/、/blog、/blog/<slug>…、/domain/<slug>…）
            ↓ tcb hosting deploy
   CloudBase 静态托管 CDN (ap-shanghai)
   （纯静态文件，无需 SPA 回退配置）
            ↑
   git push → GitHub Actions 构建
```

每页附带独立的 `<title>` / `<meta description>`（SSG 时从 frontmatter 注入），解决 SEO 与微信分享卡片。

### 5.2 内容存储

- 所有内容以 markdown / yaml 文件存在于 **`content/`** 目录。
- 内容变化 → git commit → push → CI 构建 → 部署。
- 构建产物**不进入**仓库（`.gitignore`）。
- 无数据库、无云函数、无 API 服务（**MVP 范围内**）。

### 5.3 不需要的 CloudBase 能力（明确）

- **NoSQL**（不存文章）
- **MySQL / PostgreSQL**（同上）
- **云函数 / CloudRun**（纯静态）
- **云存储 CDN**（静态资源走 `tcb hosting` 自带）
- **AI 能力**（不引入云端 AI 调用；动画是纯前端）

仅保留：

- **`tcb hosting`**（静态托管）+ 自定义域名绑定。

### 5.4 部署与定时发布

- **主路径**：手动 `git push` 触发 GitHub Actions → build → `tcb hosting deploy`。
- **定时发布（schedule）**：
  - 文章 frontmatter `status: scheduled, date: <未来时间>`。
  - 构建时若有 `scheduled` 文章未到时间，**不进入**构建产物。
  - **简化策略**：不上 cron / 定时部署；定时文章在你写入后手动 `git push` 时要么改成 `published`，要么构建时直接过滤掉。MVP 范围内不实现"自动定时发布"。
- **失效与回滚**：CloudBase 静态托管支持历史版本回滚（控制台点一下即可）。

### 5.5 域名

- **MVP 范围**：CloudBase 默认域名（`*.tcloudbaseapp.com`）即可。
- **未来扩展**（不实现）：自有域名 + DNS 解析到 CloudBase。

---

## 6. 组件边界与文件组织

```
myblog/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html                 # 模板
├── content/                   # 全部内容源
│   ├── site.yaml              # 联系方式 / 站点配置
│   ├── faqs.yaml              # FAQ 列表
│   ├── posts/                 # 文章（mdx）
│   │   └── vite-gsap-speedup.mdx
│   └── wip/                   # 在做项目（mdx）
│       └── myblog.mdx
├── public/
│   └── static/wechat.png
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── pages/
    │   ├── Home.tsx          # 首页（亮区 + FAQ 触发 + 博客列表 + 在做项目）
    │   ├── Post.tsx          # 文章页（/blog/:slug）
    │   └── Domain.tsx        # 领域页（/domain/:slug）
    ├── components/
    │   ├── blog-anim/        # 动画组件库
    │   │   ├── Typewriter.tsx
    │   │   ├── Counter.tsx
    │   │   ├── ArchDiagram.tsx
    │   │   └── registry.ts
    │   ├── FAQRail.tsx       # 粘性 FAQ 列
    │   ├── Highlights.tsx    # 首页亮点
    │   ├── PostList.tsx
    │   ├── WipList.tsx
    │   └── Contact.tsx
    ├── lib/
    │   ├── content.ts        # 内容加载、聚合、渲染
    │   └── routes.ts         # 路由定义
    └── styles/global.css
```

**模块边界规则**：

- 动画组件 (`blog-anim/`) **不依赖** react-router，不依赖页面 —— 仅靠 props + GSAP。
- `lib/content.ts` **是唯一的 IO / 解析层**，页面只调用它的查询函数，**不直接读文件**。
- `components/*` 之间**不互相 import 业务逻辑** —— 共享状态通过 props。

---

## 7. 数据流

```
content/posts/*.mdx
   │
   ├─ vite-plugin-mdx transform on import
   │     ↓
   │  Render fn: receives { frontmatter, default: MDXComponent }
   │
   └─ gray-matter extracts frontmatter at build time
          ↓
   src/lib/content.ts:
       getAllPosts()         → Post[]
       getPost(slug)         → Post
       getPostsByDomain(d)   → Post[]
       getAllDomains()       → Domain[]
       getWips()             → Wip[]
       getFAQs()             → FAQ[]
       getSite()             → Site config
          ↓
   页面用 hooks / loaders 调用
          ↓
   ScrollTrigger / GSAP 监听 DOM, 触发动画
```

---

## 8. 错误处理

| 失败点 | 行为 |
|---|---|
| 文章 mdx 编译失败 | 构建错误（构建期失败，不上线）；CI 报警。 |
| frontmatter 缺 `title` 或 `date` | 列表页跳过该文件 + 日志 warn；不阻塞构建。 |
| `domain` 拼写错误（例如 `fontend`） | 自动归 `general` + 启动 warn；不在 UI 展示 `fontend`。 |
| 微信二维码图片缺失 | 首页联系方式区域 QR 占位 + 控制台 warn。 |
| GSAP 在低端机上卡顿 | 动画默认 `prefers-reduced-motion: reduce` 时退化为静态。 |
| 网络抖动（首次加载） | 静态资源走 CDN；入口 JS 压缩 + lazy-load 动画组件。 |

---

## 9. 验证与完成标准

- [ ] **构建通过**：`npm run build` 产出 `dist/`，每条路由有独立 HTML 文件（`dist/index.html`、`dist/blog/<slug>/index.html`…）。
- [ ] **首屏秒开**：任一文章页 `curl` 返回的 HTML 中直接包含文章标题与摘要（无 JS 也能读到正文骨架）。
- [ ] **SEO / 分享卡片**：每页有独立 `<title>` 与 `<meta name="description">`（从 frontmatter 注入）。
- [ ] **首页加载**（本地 `vite preview` 后）：≤ 1 屏看到身份 + 亮点 + 联系方式入口。
- [ ] **粘性 FAQ**：8 个 FAQ 全部可点；点了页面平滑滚动并触发对应段动画。
- [ ] **博客列表**：时间倒序，3 篇以上示例文章。
- [ ] **领域页**：`/domain/frontend` 列出该领域文章。
- [ ] **文章渲染**：至少 1 篇含 `<Typewriter/>` `<Counter/>` `<ArchDiagram/>` 三种动画同时存在；动画在视口内 / 点击时按预期触发。
- [ ] **联系方式**：邮箱 + 微信二维码图片 + GitHub 链接均渲染。
- [ ] **响应式**：移动端（≤ 768px）粘性 FAQ 收起为底部抽屉。
- [ ] **a11y**：FAQ 列键盘可达 / 焦点可见；`prefers-reduced-motion` 受尊重。
- [ ] **部署**：`tcb hosting deploy` 上线，默认域名可访问。

---

## 10. 风险与未决

| 项 | 风险 | 缓解 |
|---|---|---|
| GSAP scroll 联动在移动 Safari 抖动 | 中 | `ScrollTrigger.refresh()` + 手动指定 start/end |
| MDX 与 TypeScript 类型联动 | 中 | 用 `vite-plugin-mdx` + `mdx-js/react`，文章内组件按 JSX 处理 |
| SSG 插件（vite-react-ssg）与 MDX/GSAP 集成受阻 | 中 | hydration 后动画客户端运行，SSG 只要求组件能在 Node 里渲染出静态骨架；受阻则换 `vike`，再不行评估 Astro 兜底（React 组件可复用） |
| GSAP 在 SSR/SSG 的 Node 构建期报 window 未定义 | 低 | 动画初始化全部放 `useEffect`（仅客户端）；组件渲染期不触碰 `window`/`document` |
| 微信二维码被恶意爬取 | 低 | 图片本身是公开的；不需要额外防护 |
| 用户希望"按时间筛选"等复杂列表 | 低 | MVP 不做；扩展时改 `PostList` |
| 未来需要服务端动态能力（ISR / SSR） | 低 | 静态托管不支持；届时改 CloudRun 容器，内容源 `content/` 不变 |

---

## 11. 待用户确认的开放点

1. **领域清单**：你写博客之前要决定 domain 集合（先空，写文章时边写边决定也行）。
2. **微信二维码图片**：现在还没有 → 上线前需要准备一张。
3. **公开邮箱**：你愿意公开哪个邮箱。
4. **首页亮点的"3 件实事"还是"标签云"**：若需要亮点再决定。
5. **GitHub 链接**。

---

## 12. 不在 MVP 范围的扩展（保留但不做）

- 多用户评论（Giscus 等）
- 微信小程序版
- 多语言（i18n）
- 文章搜索（client-side lunr/fuse）
- 暗 / 亮主题切换
- 付费 / 会员
- RSS / Atom feed
- 邮件订阅

---

**结束。** 这份 spec 是后续实施计划的输入。spec 通过后进入 `writing-plans` 阶段；第一个实现计划聚焦"骨架 + 首页 + 1 篇示例文章含 3 种动画 + FAQ 粘性列 + 部署到 CloudBase"。
