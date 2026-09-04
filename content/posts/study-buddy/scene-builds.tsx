// scene-builds.tsx — study-buddy 概念型/定制型 demo 的 GSAP timeline build 函数
//
// 体验型 2 个（snapshot-flow / why-teach，mode 1）留在 scene.tsx；
// 其余 build 收敛到这里，保持 scene.tsx 单文件不过长。
import { gsap } from 'gsap'

/* ───────── intro-overview：四卡片 + 技术栈 chips ───────── */
export function buildIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('.sb-card', { opacity: 0, y: 18 })
  tl.set('.sb-chip', { opacity: 0, y: 8 })
  tl.set('#sb-intro-line', { opacity: 0 })
  tl.to('.sb-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.3 })
  tl.to('.sb-chip', { opacity: 1, y: 0, duration: 0.3, stagger: 0.1 }, '-=0.2')
  tl.to('#sb-intro-line', { opacity: 1, duration: 0.6 }, '+=0.2')
  return tl
}

/* ───────── knowledge-graph：分类 → 知识点卡 → 关联线生长 → 图例 ───────── */
export function buildKnowledge() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#sb-kg-cats .sb-kg-cat', { opacity: 0, y: 8 })
  tl.set(['#sb-t1', '#sb-t2', '#sb-t3'], { opacity: 0, scale: 0.9 })
  tl.set('#sb-kg-legend', { opacity: 0 })
  tl.set(['#sb-e-prereq', '#sb-e-related'], { opacity: 0 })

  tl.to('#sb-kg-cats .sb-kg-cat', { opacity: 1, y: 0, duration: 0.3, stagger: 0.12 }, 0.2)
  tl.to(['#sb-t1', '#sb-t3', '#sb-t2'], { opacity: 1, scale: 1, duration: 0.4, stagger: 0.3 }, '+=0.2')
  tl.to('#sb-e-prereq', { opacity: 1, duration: 0.5 }, '+=0.2')
  tl.to('#sb-e-related', { opacity: 1, duration: 0.5 })
  tl.to('#sb-kg-legend', { opacity: 1, duration: 0.4 }, '+=0.1')
  return tl
}

/* ───────── fsrs-review：遗忘曲线描绘 → 到期点 → 到期卡 → 四档自评 → 下次时间 ───────── */
export function buildReview() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const path = document.getElementById('sb-curve-path')
  // jsdom 无 SVGPathElement 全局——用鸭子类型探测 getTotalLength
  let len = 320
  if (path && 'getTotalLength' in path) {
    len = (path as unknown as SVGPathElement).getTotalLength()
  }
  tl.set('#sb-curve-path', { strokeDasharray: `${len} ${len}`, strokeDashoffset: len })
  tl.set(['#sb-curve-dot', '#sb-curve-tag'], { opacity: 0 })
  tl.set('#sb-due', { opacity: 0, y: 10 })
  tl.set('#sb-ratings .sb-rating', { opacity: 0, y: 8 })
  tl.set('#sb-next', { opacity: 0 })

  tl.to('#sb-curve-path', { strokeDashoffset: 0, duration: 1.4, ease: 'power1.inOut' }, 0.2)
  tl.to('#sb-curve-dot', { opacity: 1, duration: 0.3 }, '-=0.5')
  tl.to('#sb-curve-tag', { opacity: 1, duration: 0.3 }, '<')
  tl.to('#sb-due', { opacity: 1, y: 0, duration: 0.4 }, '+=0.1')
  tl.to('#sb-ratings .sb-rating', { opacity: 1, y: 0, duration: 0.3, stagger: 0.15 }, '+=0.2')
  // 「良好」档点亮强调 → 给出下次到期
  tl.to('#sb-ratings .sb-rating[data-r="good"]', { borderColor: 'var(--accent)', color: 'var(--accent)', duration: 0.3 }, '+=0.2')
  tl.to('#sb-next', { opacity: 1, duration: 0.4 })
  return tl
}

/* ───────── plan-flow：ask_user 反问 → 作答 → 里程碑时间轴 → 落库 ───────── */
export function buildPlan() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set(['#pl-user', '#pl-q', '#pl-a1', '#pl-done'], { opacity: 0, y: 8 })
  tl.set('#pl-opts .sb-ask-opt', { opacity: 0, y: 8 })
  tl.set('#sb-plan-tl .sb-plan-ms', { opacity: 0, x: -12 })

  tl.to('#pl-user', { opacity: 1, y: 0, duration: 0.3 }, 0.2)
  tl.to('#pl-q', { opacity: 1, y: 0, duration: 0.3 }, '+=0.4')
  tl.to('#pl-opts .sb-ask-opt', { opacity: 1, y: 0, duration: 0.3, stagger: 0.15 }, '+=0.2')
  // 选中「每天 4 小时」
  tl.to('#pl-opts .sb-ask-opt[data-opt="b"]', { borderColor: 'var(--accent)', color: 'var(--accent)', duration: 0.25 }, '+=0.6')
  tl.to('#pl-a1', { opacity: 1, y: 0, duration: 0.3 }, '+=0.2')
  tl.to('#sb-plan-tl .sb-plan-ms', { opacity: 1, x: 0, duration: 0.4, stagger: 0.35 }, '+=0.4')
  tl.to('#pl-done', { opacity: 1, y: 0, duration: 0.3 }, '+=0.3')
  return tl
}

/* ───────── focus-report：计时跑动 → 日报滑入 → 印章弹出 ───────── */
export function buildFocus() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#sb-report', { opacity: 0, y: 16 })
  tl.set('.sb-report-seal', { opacity: 0, scale: 1.6, rotate: -12 })

  // 计时从 00:00 跑到 25:00（snap 到分钟）
  const counter = { min: 0 }
  tl.to(counter, {
    min: 25,
    duration: 1.6,
    ease: 'power1.inOut',
    onUpdate() {
      const el = document.getElementById('sb-timer')
      if (el) el.textContent = `${String(Math.round(counter.min)).padStart(2, '0')}:00`
    },
  }, 0.3)
  tl.to('#sb-report', { opacity: 1, y: 0, duration: 0.5 }, '+=0.3')
  tl.to('.sb-report-seal', { opacity: 1, scale: 1, rotate: -6, duration: 0.4, ease: 'back.out(2)' }, '+=0.4')
  return tl
}
