# myblog

探索式个人博客：文章不是长文，而是由场景编排驱动的可交互演示（打字机解说 + 架构图动画 + 场景跳转），
同时提供 `/blog/<slug>/flat/` 平铺阅读页。

## 两层结构

这个仓库刻意分成**框架层**和**内容层**——拿来当模板用时，只需要动内容层：

### 内容层（使用者定制区）

```
content/
├── site.yaml              站点信息：名字 / tagline / 联系方式 / 领域 / hero 文案
├── faqs.yaml              主页亮点图例 + FAQ（文案 + 跳转目标）
└── posts/<slug>/          一篇文章一个目录，见 docs/writing-a-post.md
    ├── meta.yaml          标题 / 领域 / 日期 / 置顶 / 摘要
    ├── explore.yaml       场景图（几幕、跳转、mode）
    ├── scenes/*.tsx       每幕正文
    ├── diagrams.ts        架构图数据（规则：docs/diagram-design.md）
    ├── scene.tsx          demo 注册
    ├── scene-stages.tsx   demo 静态舞台
    └── post.css           （可选）文章专属样式
```

主页结构（hero + 亮点 + 文章列表 + FAQ 栏 + 联系方式）在 `src/pages/Home.tsx`，
主题样式在 `src/styles/theme.css`——这两个是「皮肤」，换使用者时直接改。

### 框架层（一般不需要动）

```
src/components/explore/      场景编排：Director 调度 / 打字机 / 全屏 / 场景地图 / 路线图
src/components/blog-anim/    ArchDiagram 架构图组件（色板 / 避让 / 校验 / 光点 / 交互）
src/styles/framework.css     框架样式
scripts/validate-explore.ts  内容↔代码对齐校验
docs/diagram-design.md       架构图设计契约
docs/writing-a-post.md       写文章指南
```

内容层代码只通过 `@/` 别名依赖框架的公开组件（`SceneClip`、`ArchDiagram`、`buildArchFade` 等）。

## 开发

```bash
pnpm install
npm run dev        # 本地开发
```

## 验收

```bash
./node_modules/.bin/tsc --noEmit          # 类型检查（含 content/）
./node_modules/.bin/vitest run            # 全部测试
./node_modules/.bin/tsx scripts/validate-explore.ts   # 场景内容校验
./node_modules/.bin/vite-react-ssg build  # 静态构建
```
