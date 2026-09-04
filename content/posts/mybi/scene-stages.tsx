// scene-stages.tsx — mybi 8 个 demo 的静态 DOM Stage
//
// OverviewStage 为体验型(用户一句话 → AI 产出看板的演示舞台,GSAP 直接操纵);
// 其余 7 个为架构图型(ArchDiagram 容器淡入)。
// 架构图数据来自 src/components/blog-anim/diagrams/mybi.ts。
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import {
  figSentenceToBoard,
  figSpecRender,
  figSchemaContract,
  figErrorLoop,
  figSqlGate,
  figSemanticSearch,
  figEndToEnd,
} from './diagrams'
/* ─── 1. 体验型:用户一句话 → AI 产出看板的演示舞台 ─── */
export function OverviewStage() {
  return (
    <div className="mb-stage">
      <div className="mb-grid">
        {/* ── 左侧:AI 编辑助手聊天面板 ── */}
        <div className="mb-pane mb-chat">
          <div className="mb-pane-head">AI 编辑助手</div>
          <div className="mb-pane-body">
            {/* 用户气泡 + 打字机文本 */}
            <div id="mb-typing" className="mb-bubble mb-bubble-user">
              <span className="mb-bubble-content">
                <span id="mb-typing-text-1" style={{ opacity: 0 }}>给销售总监做一个近 30 天</span>
                <span id="mb-typing-text-2" style={{ opacity: 0 }}>按品类拆分的销售看板,</span>
                <span id="mb-typing-text-3" style={{ opacity: 0 }}>带渠道筛选,</span>
                <span id="mb-typing-text-4" style={{ opacity: 0 }}>分品类看</span>
                <span id="mb-typing-text-5" style={{ opacity: 0 }}> GMV 走势。</span>
                <span id="mb-typing-cursor" className="mb-cursor">▍</span>
              </span>
            </div>
            {/* AI 思考 */}
            <div id="mb-thinking" className="mb-bubble mb-bubble-ai" style={{ opacity: 0 }}>
              <span className="mb-bubble-content mb-thinking">
                <span className="mb-dot"></span>
                <span className="mb-dot"></span>
                <span className="mb-dot"></span>
                <span className="mb-thinking-text"> 正在理解需求并查询语义层...</span>
              </span>
            </div>
            {/* AI 回复:工具调用 */}
            <div id="mb-tool" className="mb-tool-card" style={{ opacity: 0 }}>
              <span className="mb-tool-icon">🔍</span>
              <span className="mb-tool-name">semantic_search</span>
              <span className="mb-tool-result">→ 匹配到 3 张表:orders / order_items / categories</span>
            </div>
            <div id="mb-tool2" className="mb-tool-card" style={{ opacity: 0 }}>
              <span className="mb-tool-icon">📝</span>
              <span className="mb-tool-name">write_document</span>
              <span className="mb-tool-result">→ 已落 DB 草稿:meta + 2 queries + 1 filter</span>
            </div>
            <div id="mb-tool3" className="mb-tool-card mb-tool-ok" style={{ opacity: 0 }}>
              <span className="mb-tool-icon">✅</span>
              <span className="mb-tool-name">check_document</span>
              <span className="mb-tool-result">→ SQL AST 白名单 / 语义真源 / 列对照,全部通过</span>
            </div>
            <div id="mb-pub" className="mb-pub" style={{ opacity: 0 }}>
              看板已生成 ——
              <a href="#preview" className="mb-pub-link">预览</a>
              <span className="mb-pub-sep">·</span>
              <a href="#publish" className="mb-pub-link mb-pub-link-strong">发布</a>
            </div>
          </div>
        </div>

        {/* ── 右侧:生成的看板预览 ── */}
        <div id="mb-board" className="mb-board" style={{ opacity: 0 }}>
          <div id="mb-board-h" className="mb-board-head" style={{ opacity: 0 }}>
            <div className="mb-board-title">销售看板 · 近 30 天</div>
            <div className="mb-board-filter">渠道: 全部 ▾</div>
          </div>
          {/* KPI 行 */}
          <div className="mb-board-kpis">
            <div className="mb-kpi">
              <div className="mb-kpi-label">总 GMV</div>
              <div className="mb-kpi-value">¥ 1,284 万</div>
              <div className="mb-kpi-trend up">↑ 12.3%</div>
            </div>
            <div className="mb-kpi">
              <div className="mb-kpi-label">订单数</div>
              <div className="mb-kpi-value">38,492</div>
              <div className="mb-kpi-trend up">↑ 8.1%</div>
            </div>
          </div>
          {/* 折线图 */}
          <div id="mb-board-chart" className="mb-chart" style={{ opacity: 0 }}>
            <div className="mb-chart-label">日 GMV 走势</div>
            <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="mb-line">
              <defs>
                <linearGradient id="mb-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* 区域 */}
              <path
                d="M20 120 L80 95 140 110 200 80 260 70 320 55 380 60 440 35 500 45 560 25 L580 25 L580 150 L20 150 Z"
                fill="url(#mb-area)"
              />
              {/* 折线 */}
              <path
                id="mb-line-path"
                d="M20 120 L80 95 140 110 200 80 260 70 320 55 380 60 440 35 500 45 560 25"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 数据点 */}
              {[
                [20, 120], [80, 95], [140, 110], [200, 80], [260, 70],
                [320, 55], [380, 60], [440, 35], [500, 45], [560, 25],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#6366f1" />
              ))}
            </svg>
          </div>
          {/* 柱图:分品类 */}
          <div id="mb-board-bars" className="mb-chart" style={{ opacity: 0 }}>
            <div className="mb-chart-label">品类 GMV 占比</div>
            <div className="mb-bars">
              {[
                { label: '美妆', h: 92, v: '¥ 421 万' },
                { label: '服饰', h: 78, v: '¥ 358 万' },
                { label: '家居', h: 56, v: '¥ 256 万' },
                { label: '数码', h: 45, v: '¥ 208 万' },
                { label: '其他', h: 30, v: '¥ 41 万' },
              ].map((b, i) => (
                <div key={b.label} className="mb-bar-wrap">
                  <div id={`mb-bar-${i + 1}`} className="mb-bar" style={{ height: `${b.h}px` }}>
                    <span className="mb-bar-value">{b.v}</span>
                  </div>
                  <div className="mb-bar-label">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mb-stage-caption">
        一句话 → AI 理解需求 → 工具调用 → 看板生成:整个过程在 chat 面板里以工具卡呈现,出问题随时回到哪一步改
      </div>
    </div>
  )
}

/* ─── 2. ReAct + 验证门 ─── */
export function SentenceStage() {
  return (
    <ArchDiagram
      {...figSentenceToBoard}
      caption="内层主 ReAct 循环(token 上限替代轮数)+ 外层验证门循环:checker 的 errors[] 作为 user 消息回填,LLM 自己修到过为止;超 2 轮修复转为如实告知用户"
    />
  )
}

/* ─── 3. 看板运行时 ─── */
export function RuntimeStage() {
  return (
    <ArchDiagram
      {...figSpecRender}
      caption="SpecView 的 Provider 嵌套顺序不得颠倒;catalog 的 zod schema 同时是白名单、props 类型、LLM prompt 文档;BoardDataLayer 桥接取数,组件只订阅 rows"
    />
  )
}

/* ─── 4. 语义树契约 ─── */
export function SchemaStage() {
  return (
    <ArchDiagram
      {...figSchemaContract}
      caption="LLM 只写 {meta, filters, queries, layout} 四节语义树;compile 推导 element key、双参数展开、children 归位;写侧硬切单形态,读侧才保留 decompile 降级"
    />
  )
}

/* ─── 5. 错误回流 ─── */
export function ErrorsStage() {
  return (
    <ArchDiagram
      {...figErrorLoop}
      caption="错误是接口契约:{error, kind, hint, raw};占位符从 SQL 现提取,不信任 caller;LLM 流式响应只在响应头到达前重试,避免前端收到重复内容"
    />
  )
}

/* ─── 6. SQL 安全代理 ─── */
export function SqlStage() {
  return (
    <ArchDiagram
      {...figSqlGate}
      caption="AST 校验与 RLS 织入是两套独立遍历,形状严格对称(mirror 测试钉死);bind_params 手写但注释里写明是临时方案;超时下放 Doris,本地掐表是伪超时"
    />
  )
}

/* ─── 7. 语义层 ─── */
export function SemanticStage() {
  return (
    <ArchDiagram
      {...figSemanticSearch}
      caption="fs yaml 冻结为种子,DB 是真源;两条加载路径共享同一套映射函数并用等价测试钉死;字段级 embedding + RRF 融合,doc_hash 掺 embedder 版本防换模型后余弦全乱"
    />
  )
}

/* ─── 8. 端到端数据流 ─── */
export function FlowStage() {
  return (
    <ArchDiagram
      {...figEndToEnd}
      caption="生产 PG/Mongo → Flink CDC(88 表)→ Doris ODS → bi-etl reconcile 物化(shadow 表 + ALTER RENAME)→ Doris DWS → 看板查询"
    />
  )
}
