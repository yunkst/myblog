// scene-builds.tsx — novel-builder 概念型/定制型 demo 的 GSAP timeline build 函数
//
// 体验型 2 个（add-book-flow / rewrite-flow，mode 1）留在 scene.tsx；
// 其余 build 收敛到这里，保持 scene.tsx 单文件不过长。
import { gsap } from 'gsap'

/* ───────── intro-overview：三卡片 + 技术栈 chips ───────── */
export function buildIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('.nb-card', { opacity: 0, y: 18 })
  tl.set('.nb-chip', { opacity: 0, y: 8 })
  tl.set('#nb-intro-line', { opacity: 0 })
  tl.to('.nb-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.35 })
  tl.to('.nb-chip', { opacity: 1, y: 0, duration: 0.3, stagger: 0.12 }, '-=0.2')
  tl.to('#nb-intro-line', { opacity: 1, duration: 0.6 }, '+=0.2')
  return tl
}

/* ───────── read-clean：广告/弹窗被抽掉 → 干净正文 + 缓存徽章 ───────── */
export function buildReadClean() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#nb-clean', { opacity: 0, x: 24 })
  tl.set('#nb-read-arrow', { opacity: 0 })
  tl.set(['#nb-badge-cache', '#nb-badge-preload'], { opacity: 0, y: 8 })

  // 1) 原网页里的广告与弹窗闪烁标红（要处理的脏东西）
  tl.to(['#nb-ad1', '#nb-popup', '#nb-ad2'], { opacity: 0.4, duration: 0.3, repeat: 1, yoyo: true }, 0.5)

  // 2) 脏东西被抽掉
  tl.to(['#nb-ad1', '#nb-popup', '#nb-ad2'], { opacity: 0, height: 0, margin: 0, duration: 0.5 }, '+=0.3')

  // 3) 干净正文滑入
  tl.to('#nb-read-arrow', { opacity: 1, duration: 0.3 }, '<')
  tl.to('#nb-clean', { opacity: 1, x: 0, duration: 0.6 }, '<+0.1')

  // 4) 缓存与预加载徽章
  tl.to('#nb-badge-cache', { opacity: 1, y: 0, duration: 0.35 }, '+=0.2')
  tl.to('#nb-badge-preload', { opacity: 1, y: 0, duration: 0.35 }, '+=0.15')
  return tl
}

/* ───────── ocr-restore：乱码 → 渲染成图 → 扫描 → 正常正文 ───────── */
export function buildOcr() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const glyphs = '#nb-glyphs i'
  tl.set(glyphs, { opacity: 0, scale: 0.6 })
  tl.set(['#nb-scanline', '#nb-engine'], { opacity: 0 })
  tl.set('#nb-ocr-clean', { opacity: 0 })

  // 1) 乱码行轻微抖动（强调"读不了"）
  tl.to('#nb-garbled', { x: 2, duration: 0.06, repeat: 5, yoyo: true }, 0.4)

  // 2) 渲染成图：字格逐个出现
  tl.to(glyphs, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.18 }, '+=0.3')

  // 3) OCR 扫描线扫过 + 引擎标签
  tl.to('#nb-engine', { opacity: 1, duration: 0.3 }, '+=0.2')
  tl.set('#nb-scanline', { opacity: 1, left: '0%' }, '<')
  tl.to('#nb-scanline', { left: '100%', duration: 1.2, ease: 'power1.inOut' })
  tl.to('#nb-scanline', { opacity: 0, duration: 0.2 })

  // 4) 正常正文浮现
  tl.to('#nb-ocr-clean', { opacity: 1, duration: 0.6 })
  tl.to('#nb-garbled', { opacity: 0.35, duration: 0.4 }, '<')
  return tl
}

/* ───────── surgical-edit：指哪句改哪句，其余一字不动 ───────── */
export function buildSurgical() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#nb-new-text', { opacity: 0 })
  tl.set('#nb-surgical-badge', { opacity: 0, y: 8 })

  // 1) 目标句高亮（用户指定的那一句）
  tl.to('#nb-target-line', { backgroundColor: 'rgba(14,110,92,0.10)', duration: 0.4 }, 0.4)

  // 2) 旧句划线删除
  tl.call(() => {
    document.getElementById('nb-old-text')?.classList.add('is-strike')
  }, [], '+=0.4')
  tl.to('#nb-old-text', { opacity: 0.3, duration: 0.4 }, '+=0.3')

  // 3) 新句替换进入
  tl.to('#nb-new-text', { opacity: 1, duration: 0.5 }, '+=0.2')

  // 4) 省 token 徽章
  tl.to('#nb-surgical-badge', { opacity: 1, y: 0, duration: 0.4 }, '+=0.3')
  return tl
}

/* ───────── write-flow：三步依次点亮 ───────── */
export function buildWriteFlow() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const steps = '.nb-step'
  const outs = '.nb-step-out'
  tl.set(steps, { opacity: 0, y: 16 })
  tl.set(outs, { opacity: 0 })
  tl.to(steps, { opacity: 1, y: 0, duration: 0.5, stagger: 0.5 })
  tl.to(outs, { opacity: 1, duration: 0.4, stagger: 0.5 }, 0.9)
  // 依次点亮边框强调
  tl.to('.nb-step[data-step="1"]', { borderColor: 'var(--accent)', duration: 0.3 }, '+=0.2')
  tl.to('.nb-step[data-step="2"]', { borderColor: 'var(--accent)', duration: 0.3 })
  tl.to('.nb-step[data-step="3"]', { borderColor: 'var(--accent)', duration: 0.3 })
  return tl
}

/* ───────── ammo-arsenal：六件套汇聚进 LLM 输入 ───────── */
export function buildAmmo() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const chips = '.nb-ammo-chip'
  tl.set(chips, { opacity: 0, y: 12 })
  tl.set(['#nb-ammo-arrow', '#nb-ammo-llm'], { opacity: 0 })
  tl.to(chips, { opacity: 1, y: 0, duration: 0.4, stagger: 0.3 })
  tl.to('#nb-ammo-arrow', { opacity: 1, duration: 0.3 }, '+=0.2')
  tl.to('#nb-ammo-llm', { opacity: 1, duration: 0.4 })
  tl.to('#nb-ammo-llm', {
    boxShadow: '0 0 0 3px rgba(14,110,92,0.25)',
    duration: 0.4,
    repeat: 1,
    yoyo: true,
  })
  return tl
}
