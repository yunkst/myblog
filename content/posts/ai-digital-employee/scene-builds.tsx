// scene-builds.tsx — 9 个概念型 demo 的 GSAP timeline build 函数
//
// 体验型 2 个 (message-flood / tiered-confirm) 留在 scene.tsx；
// 概念型 9 个拆到这里保持 scene.tsx 单文件不超过 300 行（brief 要求）。
// badge-metaphor / unified-identity / tiered-execution / dev-flow 四个 build
// 末尾追加内嵌架构图淡入段（appendArchFade）——图随概念走，不再单独成幕。
import { gsap } from 'gsap'
import { ARCH_REPLAY_EVENT } from '@/components/blog-anim/ArchDiagram'

/** 概念型模板：所有概念项 stagger 出现（initial opacity:0 y:12） */
function setConcept(concept: string) {
  return `[data-concept="${concept}"] .concept-item`
}

/** 概念型 list 元素编号方块选择器 */
function nosOf(concept: string) {
  return `[data-concept="${concept}"] .concept-no`
}

/** 合并幕收尾：概念动画播完后，内嵌架构图淡入。
 * 与 buildArchFade 同语义（初始隐藏 + 淡入前派发重播事件打通图内揭示动画），
 * 区别是 set 钉在时间线 0 点——概念动画期间图就保持隐藏。 */
function appendArchFade(tl: gsap.core.Timeline, rootSel: string) {
  tl.set(rootSel, { opacity: 0, y: 16 }, 0)
  tl.call(
    () => {
      document.querySelector(`${rootSel} .ba-arch`)
        ?.dispatchEvent(new Event(ARCH_REPLAY_EVENT))
    },
    [],
    '+=0.4',
  )
  tl.to(rootSel, { opacity: 1, y: 0, duration: 0.7 }, '<')
}

/** unified-identity：把 is-active 精确切到一个节点（null = 全部熄灭） */
function activateIdentityNode(sel: string | null) {
  document.querySelectorAll<HTMLElement>('.identity-node.is-active')
    .forEach((n) => n.classList.remove('is-active'))
  if (sel) document.querySelector<HTMLElement>(sel)?.classList.add('is-active')
}

/** 概念型 1：openclaw-pitfalls — 3 条 stagger 出现 → 全部变灰 + 「未上线」标签 */
export function buildOpenclawPitfalls() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const items = setConcept('openclaw-pitfalls')
  const nos = nosOf('openclaw-pitfalls')
  tl.set(items, { opacity: 0, y: 12 })
  tl.to(items, { opacity: 1, y: 0, duration: 0.45, stagger: 0.55 })
  // 强调：3 条都出现后，整体变灰 + 编号方块警示色 + 右侧「未上线」角标
  tl.to(items, { opacity: 0.4, duration: 0.5 }, '+=0.4')
  tl.to(nos, { backgroundColor: 'rgba(192,57,43,0.10)', color: '#C0392B', duration: 0.4 }, '<')
  tl.call(() => {
    document.querySelectorAll('[data-concept="openclaw-pitfalls"] .concept-text').forEach((el) => {
      if (!el.querySelector('.concept-tag')) {
        const tag = document.createElement('span')
        tag.className = 'concept-tag'
        tag.textContent = '未上线'
        tag.style.color = '#C0392B'
        el.appendChild(tag)
      }
    })
  }, [], '<')
  return tl
}

/** 概念型 2：four-prerequisites — 4 条 stagger，编号方块依次点亮为 accent 实心 */
export function buildFourPrerequisites() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const items = setConcept('four-prerequisites')
  const nos = nosOf('four-prerequisites')
  tl.set(items, { opacity: 0, y: 12 })
  tl.set(nos, { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' })
  // 强调：4 个编号方块**依次**点亮（与 items stagger:0.55 对齐），GSAP 写 inline style 覆盖 set。
  tl.to(nos, {
    backgroundColor: '#0E6E5C',
    color: '#FFFFFF',
    duration: 0.3,
    stagger: 0.55,
  })
  tl.to(items, { opacity: 1, y: 0, duration: 0.4, stagger: 0.55 }, '<')
  return tl
}

/** 概念型 3：badge-metaphor — 工牌从员工移到 AI 手 → 门变绿 */
export function buildBadgeMetaphor() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#badge-card', { opacity: 0, scale: 0.8 })
  tl.set('#badge-caption', { opacity: 0 })
  tl.to('#badge-card', { opacity: 1, scale: 1, duration: 0.5 })
  tl.to({}, { duration: 0.4 })
  // 工牌从「员工」右移到「AI」左。容器 max-width:520，员工 right=56, AI left=container-padding-56=448；
  // 卡片原 left=56，目标 left ≈ 388，Δx = 332。给保守的 320 满足 520 容器下视觉。
  tl.to('#badge-card', { x: 320, duration: 0.9, ease: 'power1.inOut' })
  tl.to('#badge-door', {
    borderColor: '#0E6E5C',
    duration: 0.4,
    onStart() { document.getElementById('badge-door')?.classList.add('is-open') },
  }, '+=0.1')
  tl.to('#badge-caption', { opacity: 1, duration: 0.5 }, '<+0.2')
  // 方案总览图淡入收尾
  appendArchFade(tl, '[data-arch="architecture"]')
  return tl
}

/** 概念型 4：protocol-repo — 4 接口方块依次闪一下 → 箭头 → 仓库 */
export function buildProtocolRepo() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#repo-read, #repo-write, #repo-revert, #repo-risk', { opacity: 0, y: 8 })
  tl.set('[data-concept="protocol-repo"] .repo-arrow-line', { scaleX: 0, transformOrigin: 'left center' })
  tl.set('#repo-warehouse', { opacity: 0, scale: 0.9, transformOrigin: 'center' })
  // 1) 四个方块依次出现 + 闪一下（只读 / 安全写 / 可逆 / 高风险——与正文四属性对齐）
  ;['#repo-read', '#repo-write', '#repo-revert', '#repo-risk'].forEach((sel, i) => {
    tl.to(sel, { opacity: 1, y: 0, duration: 0.3 }, i === 0 ? 0 : '>+0.15')
    tl.call(() => { document.querySelector<HTMLElement>(sel)?.classList.add('is-flash') }, [], '<')
    tl.to(sel, { duration: 0.25 })
    tl.call(() => { document.querySelector<HTMLElement>(sel)?.classList.remove('is-flash') }, [], '>+0.05')
  })
  // 2) 箭头生长 + 仓库出现
  tl.to('[data-concept="protocol-repo"] .repo-arrow-line', { scaleX: 1, duration: 0.45 }, '+=0.1')
  tl.to('#repo-warehouse', { opacity: 1, scale: 1, duration: 0.4 }, '<+0.1')
  return tl
}

/**
 * unified-identity：徽章初始中心 → 目标节点中心的 x 偏移（px），作为徽章绝对 x 目标。
 * build() 时 Stage 已挂载；GSAP set 写入的 opacity/scale/y 不改变 rect 中心（origin center），
 * 结果精确。jsdom/SSG 无布局（rect 全 0）时返回 0——仅丢失位移量，不影响 duration。
 */
function badgeToNodeX(nodeSel: string) {
  const badge = document.querySelector<HTMLElement>('#id-badge')
  const node = document.querySelector<HTMLElement>(nodeSel)
  if (!badge || !node) return 0
  const br = badge.getBoundingClientRect()
  const nr = node.getBoundingClientRect()
  if (!br.width && !nr.width) return 0
  return nr.left + nr.width / 2 - (br.left + br.width / 2)
}

/** 概念型 5：unified-identity — 4 节点横排，徽章沿链逐段移动，每停一站该节点闪 accent */
export function buildUnifiedIdentity() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  // 链顺序（与 Stage DOM/正文一致）：员工 → Apisix → 平台 → 业务后台
  const nodes = ['#id-employee', '#id-apisix', '#id-platform', '#id-backend']
  tl.set(nodes, { opacity: 0, y: 10 })
  // 徽章先定位到节点 1「员工」下方（x 目标按 rect 实测），再淡入
  tl.set('#id-badge', { opacity: 0, scale: 0.8, x: badgeToNodeX(nodes[0]), transformOrigin: 'center' })
  tl.to(nodes, { opacity: 1, y: 0, duration: 0.35, stagger: 0.25 })
  tl.to('#id-badge', { opacity: 1, scale: 1, duration: 0.4 }, '+=0.2')
  // 沿链逐段右移：员工 → Apisix → 平台 → 后台；每停一站该节点边框/背景闪 accent，停留片刻
  for (let i = 1; i < nodes.length; i++) {
    const sel = nodes[i]
    tl.to('#id-badge', { x: badgeToNodeX(sel), duration: 0.5, ease: 'power1.inOut' }, '+=0.05')
    tl.call(() => activateIdentityNode(sel), [], '>-0.05')
    tl.to({}, { duration: 0.4 })
  }
  // 结束：移除 active，徽章停在「后台」下方保持可见
  tl.call(() => activateIdentityNode(null))
  // 请求链路图淡入收尾
  appendArchFade(tl, '[data-arch="request-flow"]')
  return tl
}

/** 概念型 6：tiered-execution — 4 行依次出现；第 4 行加粗 + 「兜底」角标弹出 */
export function buildTieredExecution() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const items = setConcept('tiered-execution')
  tl.set(items, { opacity: 0, y: 12 })
  tl.set('#te-backup', { opacity: 0, scale: 0.6, transformOrigin: 'left center' })
  tl.to(items, { opacity: 1, y: 0, duration: 0.45, stagger: 0.55 })
  // 强调：第 4 行出现后再加粗文本 + 兜底角标弹出
  tl.call(() => {
    const last = document.querySelector<HTMLElement>(
      '[data-concept="tiered-execution"] .concept-item[data-idx="3"] .concept-text',
    )
    if (last) last.style.fontWeight = '700'
  }, [], '+=0.2')
  tl.set('#te-backup', { display: 'inline-block' })
  tl.to('#te-backup', { opacity: 1, scale: 1, duration: 0.35 })
  // 分级决策流程图淡入收尾
  appendArchFade(tl, '[data-arch="tiered-flow"]')
  return tl
}

/** 概念型 10：tool-search — 检索工具闪 → 池中命中高亮 → 箭头生长 → 栏内注入 chip 淡入 */
export function buildToolSearch() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const chips = '[data-concept="tool-search"] .tsearch-chip'
  tl.set(chips, { opacity: 0, y: 8 })
  tl.set('#ts-arrow', { scaleX: 0, transformOrigin: 'left center' })
  tl.set('#ts-caption', { opacity: 0 })
  // 1) 两框内 chip 一起 stagger 出现（#ts-injected 保持隐藏，后面单独淡入）
  tl.set('#ts-injected', { opacity: 0, scale: 0.9 })
  tl.to('[data-concept="tool-search"] .tsearch-chip:not(#ts-injected)', {
    opacity: 1, y: 0, duration: 0.35, stagger: 0.15,
  })
  // 2) search_tools 闪一下：检索步骤在工作
  tl.to('#ts-searcher', { scale: 1.12, duration: 0.18, yoyo: true, repeat: 3, transformOrigin: 'center' }, '+=0.3')
  // 3) 池中 list_order_info 高亮命中
  tl.call(() => { document.getElementById('ts-hit')?.classList.add('is-hit') })
  tl.to({}, { duration: 0.5 })
  // 4) 箭头生长 + 栏内注入 chip 弹出
  tl.to('#ts-arrow', { scaleX: 1, duration: 0.4 })
  tl.to('#ts-injected', { opacity: 1, scale: 1, duration: 0.4 }, '<+0.15')
  // 5) 收尾字幕
  tl.to('#ts-caption', { opacity: 1, duration: 0.5 }, '+=0.3')
  return tl
}

/**
 * 光标点击目标测量：量 btn 中心相对 .mock-chat-body padding-box 的偏移，
 * 减去光标 CSS 布局偏移（top/left:14px）和 SVG 尖端位置（尖端在 (2,1)）。
 * 与 scene.tsx 里 tiered-confirm 的 cursorTarget 同一套算法；jsdom/SSG 无布局时返回兜底值。
 */
function cursorTargetOf(btnSel: string): { x: number; y: number } {
  const btn = document.querySelector<HTMLElement>(btnSel)
  const body = btn?.closest<HTMLElement>('.mock-chat-body')
  const b = btn?.getBoundingClientRect()
  const p = body?.getBoundingClientRect()
  if (!btn || !body || !b || !p || b.width === 0) return { x: 250, y: 160 }
  const scale = body.offsetWidth > 0 ? p.width / body.offsetWidth : 1
  return {
    x: (b.left - p.left + b.width / 2) / scale - 14 - 2,
    y: (b.top - p.top + b.height / 2) / scale - 14 - 1,
  }
}

/** 概念型 11：audit-trail — 记录逐行出现 → 光标点击「撤回」→ 行变灰标记已撤回 */
export function buildAuditTrail() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const rows = ['#ar-1', '#ar-2', '#ar-3']
  tl.set(rows, { opacity: 0, y: 10 })
  tl.set('#ar-caption', { opacity: 0 })
  tl.set('#ar-cursor', { x: 300, y: 180, opacity: 0 })
  // 1) 三条调用记录逐行出现
  tl.to(rows, { opacity: 1, y: 0, duration: 0.4, stagger: 0.5 })
  // 2) 光标入场 → 移到写操作行的「撤回」按钮 → 点击
  tl.to('#ar-cursor', { opacity: 1, duration: 0.2 }, '+=0.3')
  tl.to('#ar-cursor', {
    x: () => cursorTargetOf('#ar-rev').x,
    y: () => cursorTargetOf('#ar-rev').y,
    duration: 0.8,
    ease: 'power1.inOut',
  })
  tl.to('#ar-rev', { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 })
  // 3) 撤回生效：按钮翻转「已撤回」+ 整行变灰
  tl.call(() => {
    const b = document.getElementById('ar-rev')
    if (b) { b.textContent = '已撤回 ✓'; b.classList.add('is-done') }
    document.getElementById('ar-2')?.classList.add('is-reversed')
  })
  tl.to('#ar-cursor', { opacity: 0, duration: 0.3 }, '+=0.3')
  // 4) 收尾字幕
  tl.to('#ar-caption', { opacity: 1, duration: 0.5 })
  return tl
}

/** 概念型 9：dev-flow — 7 节点横排（含独立隔离的落地 Agent），节点逐个亮 + 箭头线依次生长 */
export function buildDevFlow() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const nodes = ['#df-0', '#df-1', '#df-2', '#df-3', '#df-4', '#df-5', '#df-6']
  const arrows = ['[data-df-arrow="0"]', '[data-df-arrow="1"]', '[data-df-arrow="2"]', '[data-df-arrow="3"]', '[data-df-arrow="4"]', '[data-df-arrow="5"]']
  tl.set(arrows, { scaleX: 0, transformOrigin: 'left center' })
  // 第 1 个节点亮起（无前置箭头）
  tl.call(() => { document.getElementById('df-0')?.classList.add('is-lit') })
  tl.to({}, { duration: 0.45 })
  // 后续：先箭头长出，再下一个节点亮起
  for (let i = 1; i < nodes.length; i++) {
    tl.to(arrows[i - 1], { scaleX: 1, duration: 0.35 })
    tl.call(() => { document.querySelector<HTMLElement>(nodes[i])?.classList.add('is-lit') }, [], '<+0.05')
    tl.to({}, { duration: 0.35 })
  }
  // 开发流架构图淡入收尾
  appendArchFade(tl, '[data-arch="dev-flow-arch"]')
  return tl
}
