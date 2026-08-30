# 代码审查修复实施计划(10 项 finding)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 2026-08-30 代码审查确认的 10 项 finding(2 项用户可见 bug、3 项校验空洞、1 项异步泄漏、4 项重复/死代码清理)。

**Architecture:** 三层修法——(1) 内容一致性:把 validate-explore.ts 扩为全站内容闸门(faqs target / meta.slug / 枚举字段全部纳入校验);(2) 状态机:ExploreRouter 的 back/jumpTo 补写 firstActivation,Director 的 async run 加 cancelled 守卫;(3) 收敛:路由前缀收敛到 lib/nav.ts、Stage 复用 content.ts 的配置加载、ExploreRouter 查表合并、删死 CSS/死规则。

**Tech Stack:** React 19 + vite-react-ssg + TypeScript + vitest + js-yaml。

**Spec:** 无新 spec;来源为审查产出 JSON(10 findings)与既有 spec `docs/superpowers/specs/2026-08-30-explore-view-design-v5.md`(回看不重演语义出处)。

## Global Constraints

- 遵守现状风格:中文注释,与文件内既有注释密度一致。
- 动画组件 jsdom 测试走 `vitest.setup.ts` 的 matchMedia stub(始终 reduced)。
- 所有 yaml 数据访问保持 `?raw` + `import.meta.glob`(SSG/浏览器同源),不引入 node:fs 到 src/。
- 提交信息用中文 conventional commits(与仓库既有提交风格一致),每任务一提交。
- 每个 TypeScript 任务完成后跑 `pnpm typecheck`;每任务结束跑该任务相关测试 + `pnpm test`(全量)。

---

### Task 1: 修 faqs.yaml 死链 + validate 纳入 faqs.yaml 校验(finding #1)

**Files:**
- Modify: `content/faqs.yaml`
- Modify: `scripts/validate-explore.ts`(main() 内新增校验段)

**Interfaces:**
- Consumes: `posts`(main() 内 `knownPosts()` 的返回值,scripts/validate-explore.ts:55)
- Produces: faqs 校验段——target 形如 `/blog/<slug>/#...` 的 slug 必须在 posts 中,否则 `failures++` 并按既有风格输出 `✗ [faqs] ...`

- [ ] **Step 1: 修 faqs.yaml 三条死链**

三条 target 均指向 aefd97a 已删除的文章。改为指向现存文章 `ai-digital-employee` 的真实场景 id(先 Read `content/posts/ai-digital-employee/explore.yaml` 确认下面三个 scene id 存在,若语义不贴合选最近的):

```yaml
- id: toughest-project
  text: 做过的最复杂的项目是哪个？
  target: '/blog/ai-digital-employee/#q-tiered-execution'
- id: open-source
  text: 你做过哪些开源项目？
  target: '/blog/ai-digital-employee/#q-why-not-openclaw'
- id: security-mindset
  text: 怎么看你把祖传账号密码干掉这件事？
  target: '/blog/ai-digital-employee/#q-threat-model'
```

- [ ] **Step 2: validate-explore.ts 加 faqs 校验段**

在 main() 的 `for (const slug of posts)` 循环之后、`console.log('[validate-explore] ...')` 汇总之前插入:

```ts
  // faqs.yaml 一致性:跨文章 target 的 slug 必须真实存在(MDX 退役删文后,这里是死链防线)
  const faqsPath = path.join(process.cwd(), 'content', 'faqs.yaml')
  if (fs.existsSync(faqsPath)) {
    const faqs = yaml.load(fs.readFileSync(faqsPath, 'utf-8')) as
      | { id?: unknown; target?: unknown }[]
      | null
    if (Array.isArray(faqs)) {
      for (const f of faqs) {
        if (typeof f?.target !== 'string') continue
        const m = f.target.match(/^\/blog\/([^/#]+)\/#/)
        if (!m) continue
        if (!posts.includes(m[1])) {
          console.error(`\x1b[31m✗\x1b[0m [faqs] ${String(f.id ?? '?')} 的 target 指向不存在的文章目录: ${m[1]}`)
          failures++
        }
      }
    }
  }
```

- [ ] **Step 3: 运行校验确认通过**

Run: `pnpm validate:explore`
Expected: `[validate-explore] 失败 0`

- [ ] **Step 4: 反向验证——故意写坏一条再改回**

把 faqs.yaml 任一 target 的 slug 临时改成 `no-such-post`,跑校验,确认报错并 exit 1,然后还原为 Step 1 的内容。

Run: `pnpm validate:explore`
Expected: `✗ [faqs] ... 指向不存在的文章目录: no-such-post`,exit code 1

- [ ] **Step 5: Commit**

```bash
git add content/faqs.yaml scripts/validate-explore.ts
git commit -m "fix(content): faqs.yaml 三条死链改指向现存场景 + validate 纳入 faqs target 校验"
```

---

### Task 2: back()/jumpTo() 补写 firstActivation(finding #2,spec「回看不重演」)

**Files:**
- Modify: `src/components/explore/ExploreRouter.tsx:158-174`(back 与 jumpTo)
- Test: `src/components/explore/ExploreRouter.test.tsx`

**Interfaces:**
- Consumes: `activatedRef`(ExploreRouter.tsx:74)、`setFirstActivation`(行 66)、`history.pop()`、`history.jumpTo()`、`stackRef`(行 79)
- Produces: back()/jumpTo() 与 goTo() 相同的「已激活幕切 firstActivation=false」语义;ExploreRuntime 接口不变

- [ ] **Step 1: 写失败测试**

在 `src/components/explore/ExploreRouter.test.tsx` 的 `describe('ExploreRouter v5 runtime 扩展')` 块内追加。探针组件 AnswerProbe/GoProbe/RtProbe 已存在于该测试文件:

```tsx
  it('v5 review fix:back/jumpTo 回看不重演——目标幕切 firstActivation=false', () => {
    const config3: ExploreConfig = {
      title: 't3', entry: 'q-a',
      scenes: [
        { id: 'q-a', label: 'A', demo: 'da' },
        { id: 'q-b', label: 'B', demo: 'db' },
        { id: 'q-c', label: 'C', demo: 'dc' },
      ],
    }
    window.history.replaceState(null, '', '/blog/test3/')
    sessionStorage.clear()
    render(
      <ExploreConfigContext.Provider value={config3}>
        <ExploreRouter config={config3}>
          <AnswerProbe id="q-a" />
          <AnswerProbe id="q-b" />
          <AnswerProbe id="q-c" />
          <GoProbe target="q-b" />
          <GoProbe target="q-c" />
          <RtProbe />
        </ExploreRouter>
      </ExploreConfigContext.Provider>,
    )

    /* 路径:mount(q-a) → goTo(q-b) → goTo(q-c),栈 [q-a,q-b,q-c] */
    fireEvent.click(screen.getByText('go q-b'))
    fireEvent.click(screen.getByText('go q-c'))
    const probeA = screen.getByTestId('scene-q-a')
    const probeB = screen.getByTestId('scene-q-b')
    expect(screen.getByTestId('scene-q-c')).toHaveAttribute('data-first')

    /* back() → q-b:该幕本会话已激活过 → 必须切 firstActivation=false(不重演) */
    fireEvent.click(screen.getByTestId('rt-back'))
    expect(probeB).toHaveAttribute('data-active')
    expect(probeB).not.toHaveAttribute('data-first')

    /* jumpTo 回 q-a(面板点击历史项路径):同样不重演 */
    fireEvent.click(screen.getByTestId('rt-open-panel'))
    fireEvent.click(screen.getByText('q-a'))
    expect(probeB).not.toHaveAttribute('data-active')
    expect(probeA).toHaveAttribute('data-active')
    expect(probeA).not.toHaveAttribute('data-first')
  })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- ExploreRouter`
Expected: 新用例 FAIL——back 后 probeB 仍有 data-first(证明 bug 存在)

- [ ] **Step 3: 实现修复**

`ExploreRouter.tsx` 中 back 与 jumpTo 替换为(与 goTo 150-153 行同语义):

```tsx
  const back = useCallback(() => {
    const prev = history.pop()
    if (prev) {
      window.history.pushState(null, '', `#${prev}`)
      /* v5 review fix:back 目标必是本会话到过的幕(能 pop 到说明去过)——
       * 与 goTo 同语义切 firstActivation=false,回看不重演。 */
      if (activatedRef.current.has(prev)) {
        setFirstActivation((m) => ({ ...m, [prev]: false }))
      }
      activatedRef.current.add(prev)
      setActiveId(prev)
      setPanelOpen(false)
    }
  }, [history])

  const jumpTo = useCallback((idx: number) => {
    history.jumpTo(idx)
    /* jumpTo 内部 setStack 是异步的——用同步维护的 ref 读截断后的栈顶 */
    const last = stackRef.current[idx]?.sceneId ?? config.entry
    window.history.pushState(null, '', `#${last}`)
    /* v5 review fix:同 back——面板跳转目标已激活过,不重演。 */
    if (activatedRef.current.has(last)) {
      setFirstActivation((m) => ({ ...m, [last]: false }))
    }
    activatedRef.current.add(last)
    setActiveId(last)
    setPanelOpen(false)
  }, [history, config.entry])
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test -- ExploreRouter`
Expected: 全部 PASS(含新用例与既有 12 条)

- [ ] **Step 5: Typecheck + 全量测试 + Commit**

Run: `pnpm typecheck && pnpm test`
Expected: 全 PASS

```bash
git add src/components/explore/ExploreRouter.tsx src/components/explore/ExploreRouter.test.tsx
git commit -m "fix(explore): back/jumpTo 补写 firstActivation——履历返回/跳转不再重演演出"
```

---

### Task 3: Director async run() 加 cancelled 守卫(finding #3)

**Files:**
- Modify: `src/components/explore/Director.tsx`(useLayoutEffect 内,行 109-281)
- Test: `src/components/explore/Director.test.tsx`

**Interfaces:**
- Consumes: 现有 run()/tls/demoWait/cleanup 结构;props 接口不变
- Produces: cleanup 置 `cancelled = true`;run() 每个 await 后与每次 tls.push 前检查;unmount 后不再创建/推进任何 tween

- [ ] **Step 1: 写失败测试**

`Director.test.tsx` 的 `describe('Director')` 块内追加:

```tsx
  it('review fix:unmount 后 async run 不再推进演出链(无新 tween 挂到 globalTimeline)', async () => {
    vi.useFakeTimers()
    try {
      const head = makeRef<HTMLElement>()
      const dlg = makeRef<HTMLElement>()
      dlg.current!.innerHTML = '<p>第一段</p><p>第二段</p>'
      const choices = makeRef<HTMLElement>()
      choices.current!.innerHTML = '<a class="exit-chip" href="#x">a</a>'
      const stage = makeRef<HTMLElement>()

      const scene: DirectorScene = { id: 'q-cancel', mode: 2, demo: 'demo-not-registered' }
      const { unmount } = render(
        <Director scene={scene} headRef={head} dlgRef={dlg} choicesRef={choices} stageRef={stage}>
          <span>x</span>
        </Director>,
      )
      unmount()
      const afterUnmount = gsap.globalTimeline.getChildren(true, true, true).length
      /* 放飞微任务——若无 cancelled 守卫,run() 的 await 链继续 resolve
       * 并通过 onComplete 接力推进,挂出新 tween */
      await vi.advanceTimersByTimeAsync(100)
      expect(gsap.globalTimeline.getChildren(true, true, true).length).toBe(afterUnmount)
    } finally {
      vi.useRealTimers()
    }
  })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- Director`
Expected: 新用例 FAIL(unmount 后 tween 数量增长,证明 await 链仍在推进)

- [ ] **Step 3: 实现修复**

Director.tsx useLayoutEffect 内做四处改动:

1. 在 `const demoWait` 声明之前加:

```ts
    /* v5 review fix:async run() 生命周期守卫——cleanup 后 await 链 resolve
     * 不得再推进演出/挂新 tween(快速切幕时旧链对已卸载 DOM 继续动画)。 */
    let cancelled = false
```

2. cleanup 函数第一行加 `cancelled = true`:

```ts
    return () => {
      cancelled = true
      for (const tl of tls.current) tl.kill()
      // ...其余 cleanup 原样保留
    }
```

3. `playTypewriterChain` 的接力函数 `run(i)` 开头加取消检查,push 前加守卫:

```ts
        const run = (i: number) => {
          if (cancelled) { resolve(); return }
          if (i >= paras.length) { resolve(); return }
          const p = paras[i]
          const revealTween = gsap.to(p, { opacity: 1, duration: 0.25 })
          if (!cancelled) tls.current.push(revealTween)
          const tl = buildTypewriterTimeline(p)
          if (!tl) { revealTween.progress(1); run(i + 1); return }
          if (!cancelled) tls.current.push(tl)
          if (i + 1 < paras.length) tl.eventCallback('onComplete', () => run(i + 1))
          else tl.eventCallback('onComplete', () => resolve())
          tl.play(0)
        }
```

4. `fadeIn`/`choicesRise` 的 push 前加 `if (!cancelled)`;`playDemo` 的 `.then((api) => {` 回调第一行加 `if (cancelled) return`;`run()` 内每个 `await` 语句后立即加 `if (cancelled) return`(覆盖 `await playDemo()`、`await headP`、`await mediaP`、`await playTypewriterChain()`、`await choicesRise(...)`、mode 1 的 `await tween.then().then(...)` 之后)。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test -- Director`
Expected: 全部 PASS(含新用例与既有 8 条)

- [ ] **Step 5: Typecheck + 全量测试 + Commit**

Run: `pnpm typecheck && pnpm test`
Expected: 全 PASS

```bash
git add src/components/explore/Director.tsx src/components/explore/Director.test.tsx
git commit -m "fix(explore): Director async run 加 cancelled 守卫——unmount 后 await 链不再推进演出"
```

---

### Task 4: content.ts slug 以目录名为准 + validate 校验 meta.slug 一致性(finding #4)

**Files:**
- Modify: `src/lib/content.ts:49-50`(slug 决策)
- Modify: `scripts/validate-explore.ts`(meta 校验段)
- Test: `src/lib/content.test.ts`

**Interfaces:**
- Consumes: `slugOf(modulePath)`(content.ts:22)
- Produces: `post.slug` 恒等于目录名(`post.slug === post.fileName` 不变式);validate-explore.ts 校验「yaml 声明了 slug 就必须等于目录名」

- [ ] **Step 1: 写失败测试**

`src/lib/content.test.ts` 追加:

```ts
  it('v5 review fix:post.slug 恒等于目录名(fileName),yaml slug 字段不得覆盖', () => {
    for (const post of getAllPosts()) {
      expect(post.slug).toBe(post.fileName)
    }
  })
```

- [ ] **Step 2: 运行测试确认当前状态**

Run: `pnpm test -- content.test`
Expected: PASS(当前数据恰好一致——问题正是一致性靠巧合、无结构约束;此测试把不变式锁死)

- [ ] **Step 3: content.ts 改 slug 决策**

`content.ts:50` 的 `slug: (data.slug as string) || slugify(String(data.title)) || slug,` 替换为:

```ts
      /* v5 review fix:slug 以目录名为准(恒等于 fileName)。SceneRoute/SceneClip
       * 的 glob key 按目录名反查,yaml.slug 覆盖目录名会让 SSG 路径与场景查找
       * 静默失配;yaml 里声明 slug 时由 validate-explore.ts 校验一致性。 */
      slug,
```

- [ ] **Step 4: validate-explore.ts 加 slug 一致性校验**

meta 校验的 `if (metaOk)` 块内、date 校验之后追加:

```ts
        /* yaml 声明 slug 时必须与目录名一致——运行时以目录名为准(content.ts),
         * 漂移会导致 SSG 路径与 scenes glob key 失配。 */
        if (meta.slug !== undefined && String(meta.slug) !== slug) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml slug="${String(meta.slug)}" 与目录名不一致(运行时以目录名为准)`)
          failures++
        }
```

- [ ] **Step 5: 反向验证**

临时把 `content/posts/ai-digital-employee/meta.yaml` 的 `slug:` 值改成 `wrong-slug`,跑校验确认报错 exit 1,然后还原。

Run: `pnpm validate:explore`
Expected: `✗ [ai-digital-employee] meta.yaml slug="wrong-slug" 与目录名不一致`,exit 1

- [ ] **Step 6: Typecheck + 全量测试 + Commit**

Run: `pnpm typecheck && pnpm test`
Expected: 全 PASS

```bash
git add src/lib/content.ts src/lib/content.test.ts scripts/validate-explore.ts
git commit -m "fix(content): slug 以目录名为准 + validate 校验 meta.slug 一致性"
```

---

### Task 5: validate 补 anim_profile/status 枚举校验 + content.ts 回退加 warn(finding #5)

**Files:**
- Modify: `src/lib/content.ts:15-16`(导出枚举常量)、行 44-55(回退加 warn)
- Modify: `scripts/validate-explore.ts`(import + meta 校验段)

**Interfaces:**
- Consumes: content.ts 的 `VALID_ANIM`/`VALID_STATUS`(本任务改为 export)
- Produces: validate-explore.ts `import { VALID_ANIM, VALID_STATUS } from '../src/lib/content'`;非法枚举 build 期报错,运行时回退有 console.warn

- [ ] **Step 1: content.ts 导出枚举 + 回退加 warn**

行 15-16 加 export:

```ts
export const VALID_ANIM: AnimProfile[] = ['auto', 'data-narrative', 'architecture', 'story']
export const VALID_STATUS: PostStatus[] = ['draft', 'published', 'scheduled']
```

行 44-55 区域,枚举回退处加 warn(替换原 44-45 与 54-55 的逻辑):

```ts
    const rawAnim = data.anim_profile
    const rawStatus = data.status
    const anim: AnimProfile = VALID_ANIM.includes(rawAnim as AnimProfile) ? (rawAnim as AnimProfile) : 'auto'
    const status: PostStatus = VALID_STATUS.includes(rawStatus as PostStatus) ? (rawStatus as PostStatus) : 'published'
    /* v5 review fix:非法枚举值回退必须有日志——否则作者拼写错无任何线索 */
    if (rawAnim !== undefined && !VALID_ANIM.includes(anim)) {
      console.warn(`[content] ${modulePath} anim_profile="${String(rawAnim)}" 非法,回退 auto(合法: ${VALID_ANIM.join('/')})`)
    }
    if (rawStatus !== undefined && !VALID_STATUS.includes(status)) {
      console.warn(`[content] ${modulePath} status="${String(rawStatus)}" 非法,回退 published(合法: ${VALID_STATUS.join('/')})`)
    }
```

(注意保持后续 `posts.push({...})` 中 `anim_profile: anim, status: status` 的引用正确;若原 push 里是内联表达式则改为引用这两个变量。)

- [ ] **Step 2: validate-explore.ts 加枚举校验**

import 区追加:

```ts
import { VALID_ANIM, VALID_STATUS } from '../src/lib/content'
```

meta 校验的 `if (metaOk)` 块内、Task 4 加的 slug 校验之后追加:

```ts
        /* 枚举字段拼写错 → content.ts 静默回退,作者无从排查——build 期拦住 */
        if (meta.anim_profile !== undefined
          && !(VALID_ANIM as string[]).includes(String(meta.anim_profile))) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml anim_profile="${String(meta.anim_profile)}" 非法(合法: ${VALID_ANIM.join('/')})`)
          failures++
        }
        if (meta.status !== undefined
          && !(VALID_STATUS as string[]).includes(String(meta.status))) {
          console.error(`\x1b[31m✗\x1b[0m [${slug}] meta.yaml status="${String(meta.status)}" 非法(合法: ${VALID_STATUS.join('/')})`)
          failures++
        }
```

同时更新文件头注释:第 13 行「仅校验 title/date 两个必填键」改为「校验 title/date 必填 + slug 一致性 + anim_profile/status 枚举」。

- [ ] **Step 3: 运行校验与测试**

Run: `pnpm validate:explore && pnpm typecheck && pnpm test`
Expected: validate 失败 0;测试全 PASS

- [ ] **Step 4: 反向验证**

meta.yaml 临时写 `status: publishedd`,跑 `pnpm validate:explore` 确认报「status 非法」exit 1,还原。

- [ ] **Step 5: Commit**

```bash
git add src/lib/content.ts scripts/validate-explore.ts
git commit -m "fix(validate): meta.yaml anim_profile/status 枚举校验 + content.ts 静默回退加 warn"
```

---

### Task 6: listSceneFiles 过滤对齐 *.test.ts + 删除 validate 死规则(finding #6 + #10)

**Files:**
- Modify: `src/lib/explore.ts`(ValidateCtx 删 3 字段、删规则 4、删 scanDemoNames)
- Modify: `src/lib/explore.test.ts`(删 scanDemoNames describe)
- Modify: `src/lib/explore-validate.test.ts`(删规则 4/4b 用例、改 baseCtx)
- Modify: `scripts/validate-explore.ts`(删 scanDemoNames import/调用、listSceneFiles 过滤补 *.test.ts)

**Interfaces:**
- Consumes: `validateScenesAlignment`(explore.ts:166,scenes 对齐的真实现)
- Produces: `ValidateCtx` 新形状 `{ knownPosts: string[]; scenesOfPost(post: string): string[] | null }`;validateExploreConfig 只剩规则 1(entry)+ 规则 2(出口目标存在)

- [ ] **Step 1: explore.ts 删规则 4 与 scanDemoNames**

`ValidateCtx` 替换为:

```ts
export interface ValidateCtx {
  knownPosts: string[]
  /** 返回目标文章的场景 id 全集；目标文章无 explore.yaml 时返回 null */
  scenesOfPost(post: string): string[] | null
}
```

删除:
- 行 91-93(`void ctx.answerIds` 及其注释块)
- 行 95-103(规则 4 整块),替换为一条注释:

```ts
  // 规则 2/3/4(Answer 存在性 / demo 与 scene.tsx 字典比对)随 v5 scenes/*.tsx 单幕文件
  // 形态退役——scenes 对齐由 validateScenesAlignment 承担(validate-explore.ts 调用)。
```

- 行 142-151(`scanDemoNames` 函数及头注释)

同时更新文件头第 7-8 行 v5 注释:`ValidateCtx 仅剩 knownPosts/scenesOfPost`。

- [ ] **Step 2: explore.test.ts 删 scanDemoNames describe**

删除 `describe('scanDemoNames...')` 整块(115-130 行)与 import 中的 `scanDemoNames`。

- [ ] **Step 3: explore-validate.test.ts 更新**

- `baseCtx` 删 `answerIds`/`demoNames`/`sceneFileExists` 三行,保留 `knownPosts`/`scenesOfPost`
- 删用例:「规则4 demo 不存在报错」「规则4b scene.tsx 不存在报错」
- 删整个 `describe('validateExploreConfig v5 跳过的规则')` 块(72-82 行,answerIds 已不存在)
- 其余用例(规则1/5/5b/5c/5d)保留不动

- [ ] **Step 4: validate-explore.ts 对齐**

- import 删 `scanDemoNames`
- main() 内删 `const sceneSrc = ...` 行;ctx 参数对象删 `answerIds: []`/`demoNames: ...`/`sceneFileExists: ...` 三行(保留 knownPosts/scenesOfPost)
- `listSceneFiles` 过滤补 `.test.ts`:

```ts
function listSceneFiles(slug: string): string[] {
  const dir = path.join(POSTS, slug, 'scenes')
  if (!fs.existsSync(dir)) return []
  /* *.test.tsx 与 *.test.ts 都是测试工件——与 SceneRoute.tsx 的 import.meta.glob
   * 负向 pattern 完全对齐,避免 validate 把测试文件当场景的规则漂移。 */
  return fs.readdirSync(dir).filter((f) => f.endsWith('.tsx')
    && !f.endsWith('.test.tsx') && !f.endsWith('.test.ts'))
}
```

- [ ] **Step 5: 运行校验与测试**

Run: `pnpm validate:explore && pnpm typecheck && pnpm test`
Expected: validate 失败 0;测试全 PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-explore.ts src/lib/explore.ts src/lib/explore.test.ts src/lib/explore-validate.test.ts
git commit -m "refactor(validate): 删 scene.tsx 死规则与 scanDemoNames;listSceneFiles 过滤对齐 *.test.ts"
```

---

### Task 7: 路由前缀收敛到 lib/nav.ts(finding #7)

**Files:**
- Modify: `src/lib/nav.ts`(新增 blogPostPath)
- Modify: `src/lib/nav.test.ts`(新用例)
- Modify: `src/routes.tsx:21`、`src/pages/Post.tsx:58`、`src/components/PostList.tsx:11`、`src/lib/explore.ts:139`

**Interfaces:**
- Produces: `export function blogPostPath(slug: string): string` ——返回 `/blog/<slug>/`(统一带尾斜杠);四个调用点全部改用它

- [ ] **Step 1: 写失败测试**

`src/lib/nav.test.ts` 追加(import 行补 blogPostPath):

```ts
describe('blogPostPath', () => {
  it('产出统一尾斜杠路径', () => {
    expect(blogPostPath('ai-digital-employee')).toBe('/blog/ai-digital-employee/')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test -- nav.test`
Expected: FAIL(函数不存在)

- [ ] **Step 3: nav.ts 实现**

```ts
/** 文章路由前缀单点维护(v5 review fix):SSG getStaticPaths / PostList / 跨文章出口共用。
 * 统一带尾斜杠——与 routes.tsx getStaticPaths 产物一致(Post.tsx 旧实现无尾斜杠是漂移)。 */
export function blogPostPath(slug: string): string {
  return `/blog/${slug}/`
}
```

- [ ] **Step 4: 四个调用点替换**

- `src/routes.tsx:21`: `getStaticPaths: () => getAllPosts().map((p) => blogPostPath(p.slug))`(加 `import { blogPostPath } from './lib/nav'`)
- `src/pages/Post.tsx:58`: `return getAllPosts().map((p) => blogPostPath(p.slug))`(加 import;此处由无尾斜杠改为有——SSG 对 hash-router 站点两种路径等价,`pnpm build` 验证产物)
- `src/components/PostList.tsx:11`: `pathname: blogPostPath(p.slug)`(加 import)
- `src/lib/explore.ts:139`: `` return `${blogPostPath(to.post)}#${sceneId}` ``(加 `import { blogPostPath } from './nav'`;nav.ts 零依赖,无循环引用风险)

注意 explore.ts 现有 import 都是 type-only,新增的是运行时 import——保持 import 区既有分组风格。

- [ ] **Step 5: 验证(含 SSG build)**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 全 PASS;`ls dist/blog/` 确认文章目录产物正常

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts src/lib/nav.test.ts src/routes.tsx src/pages/Post.tsx src/components/PostList.tsx src/lib/explore.ts
git commit -m "refactor(nav): 路由前缀收敛 blogPostPath——四处拼装单点维护"
```

---

### Task 8: content.ts 新增 getExploreConfig + 数据层模块级缓存;Stage 删本地复制(finding #8)

**Files:**
- Modify: `src/lib/content.ts`(新增 getExploreConfig 导出;getAllPosts/getFAQs/getSite 模块级缓存)
- Modify: `src/pages/Stage.tsx:22-36`(删本地 glob,改用 content.ts)

**Interfaces:**
- Consumes: 既有 exploreYamls glob(content.ts:11)
- Produces: `export function getExploreConfig(slug: string): ExploreConfig | null` ——按目录名 slug 反查并解析,无配置/解析失败返回 null(带缓存);Stage.tsx 数据源收敛

- [ ] **Step 1: content.ts 新增 getExploreConfig**

在 `exploreEntryOf` 函数之后新增(import 区补 `ExploreConfig`):

```ts
/** 按目录名 slug 反查 explore.yaml 并解析(Stage 页数据源;无配置/解析失败 → null)。
 * v5 review fix:从 Stage.tsx 收敛到数据层——glob 表与解析单点维护,结果缓存。 */
const exploreConfigCache = new Map<string, ExploreConfig | null>()
export function getExploreConfig(slug: string): ExploreConfig | null {
  if (exploreConfigCache.has(slug)) return exploreConfigCache.get(slug)!
  const key = Object.keys(exploreYamls).find((k) => slugOf(k) === slug)
  if (!key) return null
  try {
    const parsed = yaml.load(exploreYamls[key]) as ExploreConfig | null
    const out = parsed && Array.isArray(parsed.scenes) ? parsed : null
    exploreConfigCache.set(slug, out)
    return out
  } catch {
    exploreConfigCache.set(slug, null)
    return null
  }
}
```

- [ ] **Step 2: getAllPosts/getFAQs/getSite 模块级缓存**

`getAllPosts` 改为首调构建、后续返回缓存:

```ts
let cachedPosts: Post[] | null = null
export function getAllPosts(): Post[] {
  if (cachedPosts) return cachedPosts
  /* ...原函数体不动... */
  cachedPosts = posts.filter((p) => p.status === 'published').sort((a, b) => (a.date < b.date ? 1 : -1))
  return cachedPosts
}
```

`getFAQs`/`getSite` 同款:

```ts
let cachedFaqs: Faq[] | null = null
export function getFAQs(): Faq[] {
  if (cachedFaqs === null) {
    const parsed = yaml.load(faqsYamlRaw) as Faq[] | null
    cachedFaqs = Array.isArray(parsed) ? parsed : []
  }
  return cachedFaqs
}

let cachedSite: SiteConfig | null = null
export function getSite(): SiteConfig {
  if (cachedSite === null) cachedSite = yaml.load(siteYamlRaw) as SiteConfig
  return cachedSite
}
```

⚠️ 约束:缓存后 getAllPosts 返回共享数组引用——调用方不得 mutate。确认 PostList/Domain/Home/routes/Post 均只读(filter/map/find 不变异),现状成立,无需改动调用方。

- [ ] **Step 3: Stage.tsx 删本地实现**

- 删行 22-36(`exploreYamls` glob 与 `exploreConfigFor`)与 `import yaml from 'js-yaml'`
- 加 `import { getExploreConfig } from '../lib/content'`(types import 里的 ExploreConfig 若仅剩此处使用则一并清理)
- `const config = useMemo(() => getExploreConfig(post.slug), [post.slug])`
- 头部注释「exploreConfigFor 从旧 Post.tsx 迁入」改为「explore 配置经 content.getExploreConfig 取(数据层单点)」

- [ ] **Step 4: 验证**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 全 PASS(Stage.test/Post.test 集成用例覆盖渲染路径)

- [ ] **Step 5: Commit**

```bash
git add src/lib/content.ts src/pages/Stage.tsx
git commit -m "refactor(content): getExploreConfig 单点加载 + 数据层模块级缓存;Stage 删本地 glob 复制"
```

---

### Task 9: ExploreRouter 查表合并 + runtime.nextScene(finding #9)

**Files:**
- Modify: `src/components/explore/AnswerContext.ts`(ExploreRuntime 加 nextScene 字段)
- Modify: `src/components/explore/ExploreRouter.tsx`(current useMemo;五处查表收敛)
- Modify: `src/components/explore/StageNav.tsx`(改消费 rt.nextScene)
- Test: 既有 ExploreRouter.test.tsx / StageNav.test.tsx 跑通即可(行为不变,现有断言覆盖)

**Interfaces:**
- Consumes: `activeId`/`config`
- Produces: `ExploreRuntime.nextScene?: ExploreScene`(主线下一幕,单幕循环时=自己之外的第一幕);单个 `current` useMemo 为 `{ idx, scene, next }`

- [ ] **Step 1: AnswerContext.ts 加字段**

`ExploreRuntime` 接口加(带注释,风格随现有字段):

```ts
  /** 主线下一幕(yaml 顺序 activeId 的下一幕);StageNav/面板动作镜像共用 */
  nextScene?: ExploreScene
```

(import 区补 `import type { ExploreScene } from '../../lib/types'`——若已有其他 type import 则合并。)

- [ ] **Step 2: ExploreRouter 合并查表**

在 `flatExits` 之前新增:

```tsx
  /* 当前幕 + 主线下一幕——单一查表(flatExits/键盘 onNext/exitsWithMain/nextSceneId/
   * nextSceneLabel 五处 findIndex+(idx+1)%len 的收敛点;StageNav 改消费 runtime.nextScene) */
  const current = useMemo(() => {
    const idx = config.scenes.findIndex((s) => s.id === activeId)
    if (idx < 0) return { idx: -1, scene: null, next: undefined as ExploreScene | undefined }
    return {
      idx,
      scene: config.scenes[idx],
      next: config.scenes[(idx + 1) % config.scenes.length],
    }
  }, [activeId, config])
```

然后逐处替换:
- `flatExits` 改为消费 `current.scene`:`[...(current.scene?.features ?? []), ...(current.scene?.questions ?? [])]`,deps 改 `[current]`
- `useKeyboardShortcuts` 的 onNext 改为 `() => { if (current.next) goTo(current.next.id) }`
- `exitsWithMain` 改为消费 `current.scene`/`current.next`,deps 改 `[current]`
- 删除 `nextSceneId`/`nextSceneLabel` 两个 useMemo
- `runtime` 加 `nextScene: current.next`,deps 加 `current`
- HistoryPanel 的 props 改:`nextLabel={current.next ? `⏵ 继续:${current.next.label}` : ''}`、`onNext={() => current.next && goTo(current.next.id)}`

- [ ] **Step 3: StageNav.tsx 完整替换**

```tsx
import { useContext } from 'react'
import { ExploreRuntimeContext } from './AnswerContext'

/** v5 底部导航条(spec §2.2):◀ 返回 / ⏵ 继续(主线下一幕)/ 履历 ▾ / ✕ 退出。
 * v5 review fix:下一幕由 runtime.nextScene 提供——StageNav 不再自行 findIndex 查表。 */
export default function StageNav() {
  const rt = useContext(ExploreRuntimeContext)!
  const next = rt.nextScene
  return (
    <nav className="stage-nav" aria-label="舞台导航">
      <button type="button" disabled={!rt.canBack} aria-label="返回上一幕" onClick={rt.back}>◀ 返回</button>
      {next && (
        <button type="button" onClick={() => rt.goTo(next.id)}>⏵ 继续:{next.label}</button>
      )}
      <button type="button" aria-label="打开履历面板" onClick={() => rt.setPanelOpen(true)}>履历 ▾</button>
      <button type="button" aria-label="退出探索" onClick={rt.onExit}>✕ 退出</button>
    </nav>
  )
}
```

(原实现无 next 空守卫——idx<0 时 `config.scenes[...]` 仍返回元素;新实现加 `{next && ...}` 防御,idx<0 时隐藏继续按钮。)

- [ ] **Step 4: 验证**

Run: `pnpm typecheck && pnpm test`
Expected: 全 PASS(ExploreRouter 42 断言 + StageNav 既有用例覆盖行为不变)

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/AnswerContext.ts src/components/explore/ExploreRouter.tsx src/components/explore/StageNav.tsx
git commit -m "refactor(explore): 五处 findIndex 查表收敛 current useMemo + runtime.nextScene"
```

---

### Task 10: 删 global.css 死 CSS 块(finding 之外确认项,随本轮清理)

**Files:**
- Modify: `src/styles/global.css`(.post-excerpt/.post-body/.answer-block 本体/.post-nav 规则;.stage-frame .answer-block 归零规则)

**Interfaces:**
- Consumes: 无
- Produces: global.css 减约 64 行死代码;DOM 上的 answer-block class(Answer.tsx 过渡别名)保留不动

- [ ] **Step 1: Grep 复核零消费**

Run: `grep -rn "post-body\|post-nav\|post-excerpt" src/ content/ --include="*.tsx" --include="*.ts" --include="*.yaml"`
Expected: 仅 `src/pages/Post.test.tsx:34` 的反向断言(querySelector('.post-nav') 应为 null——查 DOM 不查 CSS,删规则不影响)

- [ ] **Step 2: 删除 CSS 规则**

删除 global.css 中以下规则(行号以当前文件为准,删前 Read 确认):
- `.post-excerpt`(326 行附近)
- `.post-body` 全部规则(331-374 行附近,含 h2/h3/p/ul/ol/li/strong/a/blockquote/code/pre/img/table/hr)
- `.answer-block`(377 行)
- `.post-nav` 全部规则(379-389 行)
- `.stage-frame .answer-block` 归零规则(1063-1064 行,本体删除后同失消费方)

- [ ] **Step 3: 验证**

Run: `pnpm build && pnpm test`
Expected: build PASS;Post.test 反向断言仍 PASS

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "chore(styles): 删 MDX 时代死 CSS——post-body/post-nav/post-excerpt/answer-block"
```

---

### Task 11: prefers-reduced-motion 六处收敛 lib/motion + 删 seenScenes 死导出(F6 + F3 次级项)

**Files:**
- Create: `src/lib/motion.ts`
- Create: `src/lib/motion.test.ts`
- Modify: `src/components/explore/useTypewriter.ts`、`src/components/explore/Director.tsx`、`src/components/explore/SceneController.ts`、`src/components/blog-anim/ArchDiagram.tsx`、`src/components/blog-anim/Counter.tsx`、`src/components/blog-anim/Typewriter.tsx`(六处换 helper)
- Delete: `src/components/explore/seenScenes.ts`(readSeenScenes/writeSeenScenes 已无调用方)

**Interfaces:**
- Produces: `export function prefersReducedMotion(): boolean` ——SSR 安全(typeof matchMedia 守卫);六处调用点替换;seenScenes 模块删除

- [ ] **Step 1: 写 motion.ts + 测试**

`src/lib/motion.ts`:

```ts
/** prefers-reduced-motion 单点检测(v5 review fix):六处 matchMedia 调用收敛。
 * SSR 安全:typeof matchMedia !== 'undefined' 守卫。 */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

`src/lib/motion.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { prefersReducedMotion } from './motion'

describe('prefersReducedMotion', () => {
  it('vitest.setup.ts 的 matchMedia stub 返回 reduced → true', () => {
    expect(prefersReducedMotion()).toBe(true)
  })
})
```

- [ ] **Step 2: 六处调用点替换**

每处保持原守卫语义(effect 内即时调用保持即时调用),import 相对路径按各文件位置调整:
- `src/components/explore/useTypewriter.ts`(约 22 行):局部 matchMedia 判断 → `prefersReducedMotion()`
- `src/components/explore/Director.tsx`(约 70-72 行):`const reduced = typeof matchMedia !== 'undefined' && matchMedia(...)` → `const reduced = prefersReducedMotion()`
- `src/components/explore/SceneController.ts`(约 22 行):局部 `reduced()` 内联实现 → 改调 helper(若原为惰性函数,保留惰性包装、体内换 helper)
- `src/components/blog-anim/ArchDiagram.tsx`(约 83 行)、`Counter.tsx`(约 20 行)、`Typewriter.tsx`(约 15 行):同款替换

- [ ] **Step 3: 删 seenScenes.ts**

先 Grep 确认:`grep -rn "from.*seenScenes" src/` 无结果(ExploreRouter v5 fix round 后已不引用)→ 删除 `src/components/explore/seenScenes.ts`(若无独立测试文件则只删本体)。

- [ ] **Step 4: 验证**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(explore): prefers-reduced-motion 六处收敛 lib/motion;删 seenScenes 死模块"
```

---

## 不在本次范围(review 确认但明确不做)

- **post-nav prev/next UX 回退**:spec 内部矛盾(§71 删 vs §15 保留),需要设计决策(舞台页要不要文章间导航),超出 cleanup 范畴,留设计讨论。
- **模块顶层 eager glob 的 import 时序耦合**:纯理论(单文章无观察成本),等规模上来再议。
- **scene.tsx/scene-builds.tsx/scene-stages.tsx 三分文件、partition hooks 契约、setCurrentSlug→Context**:cleanup spec `docs/superpowers/specs/2026-08-30-explore-view-v5-cleanup.md` 已立案,不重复。
- **scenes/*.tsx 样板收敛、三套打字机合并**:打字机三处宿主场景差异真实(mock-ui 为 GSAP DOM 骨架 / blog-anim 为受控组件 / useTypewriter 为 Director 入口),合并收益低;scenes 样板收敛低 severity,均留 cleanup spec 追加轮。

## Self-Review 结论

- 覆盖:finding #1-#9 → Task 1-9;死 CSS → Task 10;F6(六处 reduced-motion)与 F3(seenScenes 死导出)→ Task 11。10 findings 全覆盖。
- 类型一致性:`nextScene?: ExploreScene` 在 AnswerContext.ts 定义(Step 1)、ExploreRouter 供值(Step 2)、StageNav 消费(Step 3)三处签名一致;`blogPostPath` 四调用点签名一致;`getExploreConfig` 返回 `ExploreConfig | null` 与 Stage 现有 `config` 判空分支兼容。
- 顺序依赖:Task 5 依赖 Task 4 的 meta 校验段位置;Task 8 的缓存先于 Task 9 无耦合。Task 1-3 相互独立,4-6 顺序执行,7-11 相互独立。
