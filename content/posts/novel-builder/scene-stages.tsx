import './post.css'
// scene-stages.tsx — novel-builder 15 个 demo 的静态 DOM Stage
//
// 体验型 4 个：AddBookStage（加书流程，mode 1）、RewriteStage（改写流程，mode 1）、
//   ReadCleanStage（正文净化）、OcrStage（OCR 还原）。
// 定制概念型 4 个：IntroStage（读/改/写三卡片）、SurgicalStage（精确替换）、
//   WriteFlowStage（创作三步）、AmmoStage（弹药库六件套）。
// 架构图/数据流图型 7 个：7 个原理场景（ArchDiagram 容器，build 做淡入）。
import { ChatPane, Bubble, Typewriter } from '@/components/explore/mock-ui'
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import {
  figNbScriptGen,
  figNbExtract,
  figNbOcr,
  figNbAgentTools,
  figNbContext,
  figNbToolMap,
  figNbSubagent,
} from './diagrams'

const AV = `${import.meta.env.BASE_URL}posts/novel-builder/avatars`

/* ───────── 入口：intro-overview ───────── */
export function IntroStage() {
  return (
    <div className="nb-intro" data-nb="intro">
      <div className="nb-intro-cards">
        <div className="nb-card" data-card="read">
          <div className="nb-card-icon">📖</div>
          <div className="nb-card-title">读</div>
          <div className="nb-card-sub">任意网站进书架<br />干净正文 · 离线缓存</div>
        </div>
        <div className="nb-card" data-card="rewrite">
          <div className="nb-card-icon">✏️</div>
          <div className="nb-card-title">改</div>
          <div className="nb-card-sub">烂尾续写 · 改结局<br />小修小补省 token</div>
        </div>
        <div className="nb-card" data-card="write">
          <div className="nb-card-icon">🖋️</div>
          <div className="nb-card-title">写</div>
          <div className="nb-card-sub">大纲 · 人物卡 · 逐章生成<br />AI 全程陪写</div>
        </div>
      </div>
      <div className="nb-chips">
        <span className="nb-chip">Flutter 3 / Dart</span>
        <span className="nb-chip">Riverpod</span>
        <span className="nb-chip">SQLite v39</span>
        <span className="nb-chip">OpenAI 兼容 LLM</span>
        <span className="nb-chip">端侧 PP-OCRv6</span>
        <span className="nb-chip">FastAPI（可选）</span>
      </div>
      <p className="nb-intro-line" id="nb-intro-line">MIT 开源 · 本地优先 · 离线可用</p>
    </div>
  )
}

/* ───────── 体验型 1：add-book-flow（mode 1） ───────── */
export function AddBookStage() {
  return (
    <div className="nb-addbook" data-nb="addbook">
      <div className="nb-phone">
        <div className="nb-phone-urlbar">
          <span className="nb-phone-dot" />
        <span className="nb-phone-url">some-novel-site.com/catalog</span>
        </div>
        <div className="nb-phone-page">
          <div className="nb-page-line w60" />
          <div className="nb-page-line w90" />
          <div className="nb-page-line w80" />
          <div className="nb-page-line w90" />
          <div className="nb-page-line w45" />
          <div className="nb-page-ad">广告 · 下载 APP 查看后续章节</div>
          <div className="nb-page-line w80" />
          <div className="nb-page-line w70" />
        </div>
        <button type="button" className="nb-fab" id="nb-fab">＋ 加入书架</button>
        <div className="nb-gen" id="nb-gen">
          <div className="nb-gen-title" id="nb-gen-title">首次访问此站，AI 正在现场生成提取脚本…</div>
          <div className="nb-gen-bar"><div className="nb-gen-bar-inner" id="nb-gen-bar" /></div>
        </div>
        <div className="nb-preview" id="nb-preview">
          <div className="nb-preview-title">提取预览 ✓</div>
          <div className="nb-preview-row">书名：《长夜余火》</div>
          <div className="nb-preview-row">目录：326 章，已识别</div>
        </div>
        <div className="nb-toast" id="nb-toast">已加入书架 · 脚本已保存，下次直接用</div>
      </div>
    </div>
  )
}

/* ───────── 体验型 2：read-clean ───────── */
export function ReadCleanStage() {
  return (
    <div className="nb-read" data-nb="read">
      <div className="nb-read-pane nb-read-pane--raw" id="nb-raw">
        <div className="nb-read-pane-title">原网页</div>
        <div className="nb-page-line w90" />
        <div className="nb-page-ad" id="nb-ad1">★ 广告 · 精品推荐 ★</div>
        <div className="nb-page-line w80" />
        <div className="nb-page-popup" id="nb-popup">请下载 APP 继续阅读 →</div>
        <div className="nb-page-line w60" />
        <div className="nb-page-ad" id="nb-ad2">推广链接 example.com</div>
      </div>
      <div className="nb-read-arrow" id="nb-read-arrow">→</div>
      <div className="nb-read-pane nb-read-pane--clean" id="nb-clean">
        <div className="nb-read-pane-title">APP 内正文</div>
        <div className="nb-page-line w90" />
        <div className="nb-page-line w80" />
        <div className="nb-page-line w90" />
        <div className="nb-page-line w60" />
        <div className="nb-read-badges">
          <span className="nb-badge" id="nb-badge-cache">已缓存 ✓ 断网可读</span>
          <span className="nb-badge" id="nb-badge-preload">下一章预加载中…</span>
        </div>
      </div>
    </div>
  )
}

/* ───────── 体验型 3：ocr-restore ───────── */
export function OcrStage() {
  return (
    <div className="nb-ocr" data-nb="ocr">
      <div className="nb-ocr-row">
        <span className="nb-ocr-label">原文字体反爬</span>
        <span className="nb-ocr-garbled" id="nb-garbled">&#xE601;&#xE7F2;&#xE3A4;&#xE9B1;&#xE5C8;&#xE2D6;</span>
      </div>
      <div className="nb-ocr-row" id="nb-ocr-render">
        <span className="nb-ocr-label">渲染成图</span>
        <span className="nb-ocr-glyphs" id="nb-glyphs">
          <i /><i /><i /><i /><i /><i />
        </span>
      </div>
      <div className="nb-ocr-row" id="nb-ocr-scan-row">
        <span className="nb-ocr-label">端侧 OCR</span>
        <span className="nb-ocr-scanbox">
          <span className="nb-ocr-scanline" id="nb-scanline" />
          <span className="nb-ocr-engine" id="nb-engine">PP-OCRv6 · onnxruntime（不上云）</span>
        </span>
      </div>
      <div className="nb-ocr-row">
        <span className="nb-ocr-label">还原正文</span>
        <span className="nb-ocr-clean" id="nb-ocr-clean">他推开山门，长夜将尽。</span>
      </div>
    </div>
  )
}

/* ───────── 体验型 4：rewrite-flow（mode 1） ───────── */
export function RewriteStage() {
  return (
    <div className="nb-rewrite" data-nb="rewrite">
      <ChatPane title="Agent Chat · 《长夜余火》第 43 章">
        <div className="mock-chat-time">周日 23:07</div>
        <Bubble id="rw-user" side="right" avatar={`${AV}/avi-me.svg`}>
          <Typewriter text="这章结局太憋屈了，改成开放式，反派别死" id="rw-input" />
        </Bubble>
        <Bubble id="rw-thinking" side="left" avatar={`${AV}/avi-ai.svg`}>…</Bubble>
        <Bubble id="rw-ai" side="left" avatar={`${AV}/avi-ai.svg`}>
          已按新设定重写第 43 章：注入人物卡 + 「暗黑」风格标签，原文作为上下文
        </Bubble>
        <div className="nb-diff" id="nb-diff">
          <div className="nb-diff-row nb-diff-row--old">
            <span className="nb-diff-tag">原文</span>
            反派倒在血泊中，主角转身离去，故事戛然而止。
          </div>
          <div className="nb-diff-row nb-diff-row--new">
            <span className="nb-diff-tag">改后</span>
            反派的身影消失在长夜尽头——他留下的那封信，主角始终没有拆开。
          </div>
          <div className="nb-versions">
            <span className="nb-version" data-v="1">v1 原文</span>
            <span className="nb-version" data-v="2">v2 第一次改写</span>
            <span className="nb-version nb-version--cur" data-v="3">v3 当前 ✓ 可回滚</span>
          </div>
        </div>
        <Bubble id="rw-done" side="left" avatar={`${AV}/avi-ai.svg`}>
          不满意可以随时退回 v1 / v2，每次重写都留档
        </Bubble>
      </ChatPane>
    </div>
  )
}

/* ───────── 定制概念型 1：surgical-edit ───────── */
export function SurgicalStage() {
  return (
    <div className="nb-surgical" data-nb="surgical">
      <div className="nb-para">
        <p>他走进酒馆，灯光昏暗。</p>
        <p className="nb-para-target" id="nb-target-line">
          <span className="nb-old" id="nb-old-text">他怒吼道：“我绝不会放过你！”</span>
          <span className="nb-new" id="nb-new-text">他压低声音：“这笔账，我们慢慢算。”</span>
        </p>
        <p>窗外，雨还没有停。</p>
      </div>
      <div className="nb-surgical-badge" id="nb-surgical-badge">
        update_chapter_content · 精确替换 · 不再二次调 LLM · 省 token
      </div>
    </div>
  )
}

/* ───────── 定制概念型 2：write-flow ───────── */
export function WriteFlowStage() {
  return (
    <div className="nb-steps" data-nb="write-flow">
      <div className="nb-step" data-step="1">
        <div className="nb-step-no">①</div>
        <div className="nb-step-title">说一句话</div>
        <div className="nb-step-desc">“帮我写一本赛博朋克悬疑，主角是失忆黑客”</div>
        <div className="nb-step-out">→ 建书 · 世界观 · 角色列表</div>
      </div>
      <div className="nb-step" data-step="2">
        <div className="nb-step-no">②</div>
        <div className="nb-step-title">定骨架</div>
        <div className="nb-step-desc">AI 写全书大纲和章节细纲</div>
        <div className="nb-step-out">→ 故事不散，节奏有人把控</div>
      </div>
      <div className="nb-step" data-step="3">
        <div className="nb-step-no">③</div>
        <div className="nb-step-title">逐章生成</div>
        <div className="nb-step-desc">每章说一句想写什么，AI 写整章正文</div>
        <div className="nb-step-out">→ 人物设定 + 风格标签注入</div>
      </div>
    </div>
  )
}

/* ───────── 定制概念型 3：ammo-arsenal ───────── */
export function AmmoStage() {
  return (
    <div className="nb-ammo" data-nb="ammo">
      <div className="nb-ammo-chips">
        <span className="nb-ammo-chip">🎭 人物卡</span>
        <span className="nb-ammo-chip">📋 大纲细纲</span>
        <span className="nb-ammo-chip">🏷️ 风格标签（随机抽一条）</span>
        <span className="nb-ammo-chip">✍️ AI 作家设定</span>
        <span className="nb-ammo-chip">🧠 经验记忆（跨书跨会话）</span>
        <span className="nb-ammo-chip">📖 前一章正文</span>
      </div>
      <div className="nb-ammo-arrow" id="nb-ammo-arrow">↓ 全部拼进</div>
      <div className="nb-ammo-llm" id="nb-ammo-llm">LLM 输入 · 每次写章节都带上</div>
    </div>
  )
}

export function ScriptGenStage() {
  return (
    <div data-arch="script-gen-principle">
      <ArchDiagram {...figNbScriptGen} caption="有脚本直接跑（0 token）；没有才让 Agent 现场生成，落库后同站永逸" />
    </div>
  )
}

export function ExtractStage() {
  return (
    <div data-arch="extract-principle">
      <ArchDiagram {...figNbExtract} caption="前台阅读永远抢占后台预加载；预加载限速 30s/任务，便利但不做粗鲁的爬虫" />
    </div>
  )
}

export function OcrPrincipleStage() {
  return (
    <div data-arch="ocr-principle">
      <ArchDiagram {...figNbOcr} caption="字体反爬让人眼能读、文本层乱码——那就把识别挪到渲染之后，端侧 OCR 还原" />
    </div>
  )
}

export function AgentToolsStage() {
  return (
    <div data-arch="agent-tools-principle">
      <ArchDiagram {...figNbAgentTools} caption="按改动幅度分流到三个工具；重写必留档可回滚，精确替换不再二次调 LLM" />
    </div>
  )
}

export function ContextStage() {
  return (
    <div data-arch="context-principle">
      <ArchDiagram {...figNbContext} caption="六件本地素材装配进一次 LLM 调用——「越用越懂你」靠的是你主动攒的弹药库" />
    </div>
  )
}

export function ToolMapStage() {
  return (
    <div data-arch="tool-map">
      <ArchDiagram {...figNbToolMap} caption="工具即产品逻辑：29 个工具按领域分组——读工具随便调，写工具必须先读后写" />
    </div>
  )
}

export function SubagentStage() {
  return (
    <div data-arch="subagent-principle">
      <ArchDiagram {...figNbSubagent} caption="重活外包给独立上下文：读 30 章梳理人物关系不进主对话，只把结构化总结带回来" />
    </div>
  )
}
