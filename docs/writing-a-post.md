# 写一篇文章（content/posts/<slug>/）

> 内容标准（叙事定位 / 名词纪律 / 事实纪律）见 `docs/writing-taste.md`，
> 写之前先读那篇；本篇只讲机制。

新文章从模板开始：

```bash
cp -r content/posts/_template content/posts/my-post
```

然后按顺序改五个地方：

## 1. meta.yaml — 元数据

- `slug` 改成目录名；`status: draft` 改为 `published` 才会出现在主页列表
- `domain` 必须存在于 `content/site.yaml` 的 `domains`
- `pinned: true` 置顶；`anim_profile` 决定卡片上的动画风格标记

## 2. explore.yaml — 场景图

- 每幕：`id` / `label` / `demo` / `features`（出口跳转）/ `mode`（可选）
- `mode`：1 = demo 全屏先播；2（默认）= 文字全屏先打字；3 = 纯文字
- 场景、出口、demo 名会被 `tsx scripts/validate-explore.ts` 强校验

## 3. scenes/*.tsx — 每幕正文

- 文件名必须等于场景 id（`q-intro.tsx` ↔ `id: q-intro`），测试强制双向对齐
- 首元素固定 `<SceneClip />`，demo 名从 yaml 派生，不要手传
- 正文元素：`<p>`/`<blockquote>` 逐字打字；`<ul>`/`<ol>`/`<table>` 按文档顺序整块淡入

## 4. diagrams.ts + scene-stages.tsx + scene.tsx — 演示动画

- 架构图数据写在 `diagrams.ts`，设计规则见 `docs/diagram-design.md`
- 图不用注册：`ArchDiagram.test.tsx` 用 glob 自动发现所有文章的图，
  文字下限 / 标签避让 / 边线穿节点 / 图例碰撞全部自动校验
- demo 名三处对齐：explore.yaml 的 `scenes[].demo` = scene.tsx 的 `demos` 键
- 文章专属样式写在同目录 `post.css`，由 `scene-stages.tsx` 顶部 `import './post.css'`

## 5. 测试

模板自带 `scenes/scenes.test.tsx`（对齐 + 渲染冒烟）和 `scene.test.tsx`（demos smoke），
复制后把里面的 slug / demo 清单改成新文章的即可。

## 验收命令

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/tsx scripts/validate-explore.ts
./node_modules/.bin/vite-react-ssg build
```
