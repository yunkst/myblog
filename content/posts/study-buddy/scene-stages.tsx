import './post.css'
// scene-stages.tsx — study-buddy 10 个 demo 的静态 DOM Stage
//
// 体验型 2 个：SnapshotStage（拍题问 AI，mode 1）、WhyTeachStage（为什么？教学，mode 1）。
// 定制概念型 5 个：IntroStage（闭环四件事）、KnowledgeStage（知识点关联图）、
//   ReviewStage（遗忘曲线 + 四档自评）、PlanStage（备考规划 chat + 里程碑）、
//   FocusStage（专注计时 → 学习日报）。
// 架构图型 3 个：3 个原理场景（ArchDiagram 容器，build 做淡入）。
import { ChatPane, Bubble } from '@/components/explore/mock-ui'
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import {
  figSbAgent,
  figSbScheduler,
  figSbLocalFirst,
} from './diagrams'

const AV = `${import.meta.env.BASE_URL}posts/study-buddy/avatars`

/* ───────── 入口：intro-overview ───────── */
export function IntroStage() {
  return (
    <div className="sb-intro" data-sb="intro">
      <div className="sb-intro-cards">
        <div className="sb-card" data-card="ask">
          <div className="sb-card-icon">📷</div>
          <div className="sb-card-title">问</div>
          <div className="sb-card-sub">拍题问 AI · 拆思路给解析<br />知识点自动入库</div>
        </div>
        <div className="sb-card" data-card="why">
          <div className="sb-card-icon">❓</div>
          <div className="sb-card-title">懂</div>
          <div className="sb-card-sub">「为什么？」反问式教学<br />自己推出答案才算懂</div>
        </div>
        <div className="sb-card" data-card="review">
          <div className="sb-card-icon">📉</div>
          <div className="sb-card-title">习</div>
          <div className="sb-card-sub">FSRS 间隔复习<br />只复习到期的卡</div>
        </div>
        <div className="sb-card" data-card="plan">
          <div className="sb-card-icon">📅</div>
          <div className="sb-card-title">规划</div>
          <div className="sb-card-sub">备考拆里程碑<br />专注时钟 + 学习日报</div>
        </div>
      </div>
      <div className="sb-chips">
        <span className="sb-chip">Flutter 3 / Dart</span>
        <span className="sb-chip">Riverpod</span>
        <span className="sb-chip">sqflite 本地库</span>
        <span className="sb-chip">纯 Dart Agent 引擎</span>
        <span className="sb-chip">OpenAI 兼容 BYOK</span>
        <span className="sb-chip">FSRS 调度器</span>
      </div>
      <p className="sb-intro-line" id="sb-intro-line">MIT 开源 · 本地优先 · 无自建后端</p>
    </div>
  )
}

/* ───────── 体验型 1：snapshot-flow（mode 1） ───────── */
export function SnapshotStage() {
  return (
    <div className="sb-snapshot" data-sb="snapshot">
      <div className="sb-phone">
        <div className="sb-photo" id="sb-photo">
          <div className="sb-photo-tag">拍题照片</div>
          <div className="sb-photo-line w90" />
          <div className="sb-photo-line w70" />
          <div className="sb-photo-formula">v² − v₀² = 2ax</div>
          <div className="sb-photo-line w80" />
        </div>
        <button type="button" className="sb-ask-btn" id="sb-ask-btn">📷 问 AI</button>
        <div className="sb-parse" id="sb-parse">
          <div className="sb-parse-title">AI 正在拆思路（图片 base64 直发多模态模型）…</div>
          <div className="sb-parse-bar"><div className="sb-parse-bar-inner" id="sb-parse-bar" /></div>
        </div>
        <div className="sb-answer" id="sb-answer">
          <div className="sb-answer-title">解析 ✓</div>
          <div className="sb-answer-row">考点：匀变速直线运动</div>
          <div className="sb-answer-row">思路：先由速度平方差求加速度，再代位移公式</div>
        </div>
        <div className="sb-toast" id="sb-toast">知识点「匀变速直线运动」已入库 · 关联：牛顿第二定律</div>
      </div>
    </div>
  )
}

/* ───────── 体验型 2：why-teach（mode 1） ───────── */
export function WhyTeachStage() {
  return (
    <div className="sb-why" data-sb="why">
      <ChatPane title="为什么？· 知识点「惯性」">
        <div className="mock-chat-time">今天 21:12</div>
        <Bubble id="wy-q1" side="left" avatar={`${AV}/avi-ai.svg`}>
          先别急着看定义。想象你坐在公交车里，车突然刹车，你的身体会往哪边倒？
        </Bubble>
        <div className="sb-ask-opts" id="wy-opts">
          <span className="sb-ask-opt" data-opt="a">往前倒</span>
          <span className="sb-ask-opt" data-opt="b">往后倒</span>
        </div>
        <Bubble id="wy-a1" side="right" avatar={`${AV}/avi-me.svg`}>往前倒</Bubble>
        <Bubble id="wy-q2" side="left" avatar={`${AV}/avi-ai.svg`}>
          对。那车匀速前进时，你也是“往前运动”的，为什么没有往前倒？
        </Bubble>
        <Bubble id="wy-aha" side="right" avatar={`${AV}/avi-me.svg`}>
          因为我和车本来就在一起运动……哦，物体保持原来的运动状态，这就是惯性！
        </Bubble>
        <div className="sb-save-badge" id="wy-save">
          save_topic · 把你自己推出的定义写回知识点 ✓
        </div>
      </ChatPane>
    </div>
  )
}

/* ───────── 定制概念型 1：knowledge-graph ───────── */
export function KnowledgeStage() {
  return (
    <div className="sb-knowledge" data-sb="knowledge">
      <div className="sb-kg-cats" id="sb-kg-cats">
        <span className="sb-kg-cat">物理</span>
        <span className="sb-kg-cat">数学</span>
        <span className="sb-kg-cat">英语</span>
      </div>
      <div className="sb-kg-map">
        <svg className="sb-kg-edges" viewBox="0 0 460 220" preserveAspectRatio="none">
          <line id="sb-e-prereq" x1="120" y1="176" x2="150" y2="52" />
          <line id="sb-e-related" x1="262" y1="52" x2="330" y2="120" />
        </svg>
        <div className="sb-topic sb-topic--t1" id="sb-t1">
          牛顿第二定律<span className="sb-topic-m sb-topic-m--mastered">已掌握</span>
        </div>
        <div className="sb-topic sb-topic--t3" id="sb-t3">
          受力分析<span className="sb-topic-m sb-topic-m--weak">薄弱</span>
        </div>
        <div className="sb-topic sb-topic--t2" id="sb-t2">
          匀变速直线运动<span className="sb-topic-m sb-topic-m--learning">学习中</span>
        </div>
      </div>
      <div className="sb-kg-legend" id="sb-kg-legend">─ ─ prerequisite 先修　── related 关联</div>
    </div>
  )
}

/* ───────── 定制概念型 2：fsrs-review ───────── */
export function ReviewStage() {
  return (
    <div className="sb-review" data-sb="review">
      <svg className="sb-curve" viewBox="0 0 300 120">
        <text x="8" y="14" className="sb-curve-ylab">记住的比例</text>
        <path id="sb-curve-path" d="M14,22 C40,66 84,86 288,98" fill="none" />
        <circle id="sb-curve-dot" cx="84" cy="72" r="4" />
        <text id="sb-curve-tag" x="96" y="66" className="sb-curve-tag">今天 · 到期</text>
        <text x="14" y="114" className="sb-curve-xlab">刚学完</text>
        <text x="120" y="114" className="sb-curve-xlab">1 天后</text>
        <text x="240" y="114" className="sb-curve-xlab">1 周后</text>
      </svg>
      <div className="sb-due" id="sb-due">今日到期 3 张 · 只复习这几张</div>
      <div className="sb-ratings" id="sb-ratings">
        <span className="sb-rating" data-r="forgot">忘了 S×0.3</span>
        <span className="sb-rating" data-r="hard">困难 ×1.2</span>
        <span className="sb-rating" data-r="good">良好 ×2.5</span>
        <span className="sb-rating" data-r="easy">简单 ×4.0</span>
      </div>
      <div className="sb-next" id="sb-next">自评「良好」→ 下次复习：3 天后（S=3.0）</div>
    </div>
  )
}

/* ───────── 定制概念型 3：plan-flow ───────── */
export function PlanStage() {
  return (
    <div className="sb-plan" data-sb="plan">
      <ChatPane title="备考规划 · 12 月考研">
        <Bubble id="pl-user" side="right" avatar={`${AV}/avi-me.svg`}>12 月考研，帮我规划数学</Bubble>
        <Bubble id="pl-q" side="left" avatar={`${AV}/avi-ai.svg`}>
          先了解两件事，才好安排强度——每天能投入多少时间？
        </Bubble>
        <div className="sb-ask-opts" id="pl-opts">
          <span className="sb-ask-opt" data-opt="a">每天 2 小时</span>
          <span className="sb-ask-opt" data-opt="b">每天 4 小时</span>
        </div>
        <Bubble id="pl-a1" side="right" avatar={`${AV}/avi-me.svg`}>每天 4 小时</Bubble>
        <div className="sb-plan-tl" id="sb-plan-tl">
          <div className="sb-plan-ms" data-ms="1"><b>9 月</b>基础过完</div>
          <div className="sb-plan-ms" data-ms="2"><b>10 月</b>强化刷题</div>
          <div className="sb-plan-ms" data-ms="3"><b>11 月</b>真题模考</div>
          <div className="sb-plan-ms" data-ms="4"><b>12 月</b>冲刺回顾</div>
        </div>
        <Bubble id="pl-done" side="left" avatar={`${AV}/avi-ai.svg`}>
          计划已生成（plan / plan_day_task 表），明天打开「今日」就能见到当天的任务
        </Bubble>
      </ChatPane>
    </div>
  )
}

/* ───────── 定制概念型 4：focus-report ───────── */
export function FocusStage() {
  return (
    <div className="sb-focus" data-sb="focus">
      <div className="sb-timer-wrap" id="sb-timer-wrap">
        <div className="sb-timer" id="sb-timer">00:00</div>
        <div className="sb-timer-label">专注中 · 数学</div>
      </div>
      <div className="sb-report" id="sb-report">
        <div className="sb-report-head">学习日报 · 9 月 1 日</div>
        <div className="sb-report-row">专注 2 小时 35 分</div>
        <div className="sb-report-row">复习到期卡片 12 张（9 良好 / 2 困难 / 1 忘了）</div>
        <div className="sb-report-row">问 AI 3 题 · 新入库知识点 2 个</div>
        <div className="sb-report-seal">时习</div>
      </div>
    </div>
  )
}

/* ───────── 架构图型 3 个 ───────── */
export function AgentStage() {
  return (
    <div data-arch="agent-principle">
      <ArchDiagram {...figSbAgent} caption="端侧 ReAct 循环：流式调 LLM → 工具执行 → 观察回灌 → 下一轮；ask_user 让 Agent 能反向提问用户" />
    </div>
  )
}

export function SchedulerStage() {
  return (
    <div data-arch="scheduler-principle">
      <ArchDiagram {...figSbScheduler} caption="四档评分更新记忆稳定性 S 与难度 D，到期时间由 S 推出；掌握度是 S 的派生展示，不单独存储" />
    </div>
  )
}

export function LocalFirstStage() {
  return (
    <div data-arch="local-first-principle">
      <ArchDiagram {...figSbLocalFirst} caption="无自建后端：UI → 纯 Dart 引擎 → 本地库；AI 直连用户自备的 OpenAI 兼容端点" />
    </div>
  )
}
