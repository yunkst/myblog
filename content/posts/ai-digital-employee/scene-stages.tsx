import './post.css'
// scene-stages.tsx
//
// 11 个 demo 的静态 DOM Stage。GSAP 在这些 DOM 上跑时间线。
// 体验型：FloodStage（群消息洪水）、ConfirmStage（一次确认流程）。
// 概念型 9 个：openclaw-pitfalls / four-prerequisites / badge-metaphor /
//   protocol-repo / unified-identity / tiered-execution / dev-flow /
//   tool-search / audit-trail。
// 其中 badge-metaphor / unified-identity / tiered-execution / dev-flow 四个
//   Stage 内嵌对应架构图（.stage-arch，初始由 build 隐藏，概念动画播完淡入）。
import { ChatPane, Bubble, MockCursor } from '@/components/explore/mock-ui'
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import {
  figArchitecture,
  figRequestFlow,
  figTiered,
  figDevFlow,
} from './diagrams'

/* ───────── 体验型 2 个 ───────── */

export function FloodStage() {
  const AV = `${import.meta.env.BASE_URL}posts/ai-digital-employee/avatars`
  return (
    <div className="flood-stage">
      <ChatPane title="公司群">
        {/* DOM 顺序 = 消息到达顺序（opacity 预留槽位、高度在 mount 时已稳定，
            mode 1 全屏按此量尺寸）；build 按此顺序逐条揭示 */}
        <div className="mock-chat-time">周一 9:41</div>
        <Bubble id="b1" side="left" avatar={`${AV}/avi-a.webp`} name="小周">
          活动小程序做得怎么样了？下午要开始预热了
        </Bubble>
        <Bubble id="b2" side="left" avatar={`${AV}/avi-b.webp`} name="小吴">
          推文里的小程序卡片，跳转配了吗？
        </Bubble>
        <Bubble id="b3" side="left" avatar={`${AV}/avi-c.webp`} name="李姐">
          发布系统又报错了，三点前那篇要发，快看看
        </Bubble>
        <Bubble id="b-me1" side="right" avatar={`${AV}/avi-me.webp`}>
          在的，一个个来
        </Bubble>
        <Bubble id="b4" side="left" avatar={`${AV}/avi-d.webp`} name="小郑">
          明早 9 点那篇定时发布设了吗？
        </Bubble>
        <Bubble id="b5" side="left" avatar={`${AV}/avi-f.webp`} name="小赵">
          文章推送怎么配置定时？教我一下
        </Bubble>
        <Bubble id="b6" side="left" avatar={`${AV}/avi-e.webp`} name="小王">
          预览链接打不开了，急
        </Bubble>
        <Bubble id="b-me2" side="right" avatar={`${AV}/avi-me.webp`}>
          在
        </Bubble>
      </ChatPane>
    </div>
  )
}

/* 实操舞台：1:1 对齐真实产品（ai-center ChatPage）——奶油底 + 薄荷气泡 +
 * 确认卡（薄荷顶条 / SAFE WRITE 徽章 / 参数 pre / 拒绝+确认执行）。
 * 演示真实工具 clear_order_assoc（safe_write + 可逆）。
 * 注意：.mock-chat-body 类是 scene.tsx 光标坐标的测量容器，勿改名；
 * #tc-input 的打字文案与 #tc-user 气泡文案必须一致（build 里也有同一份）。 */
export function ConfirmStage() {
  return (
    <div className="confirm-stage">
      <div className="aic-app mock-chat-body">
        <header className="aic-topbar">
          <span className="aic-crumb">
            <b>ai center</b><i>·</i>对话<i>·</i><em>wechat-helper</em>
          </span>
          <span className="aic-history">操作历史</span>
        </header>
        <div className="aic-messages">
          <div id="tc-user" className="aic-msg aic-msg-user">
            清除订单 A123456 的绑定关联
          </div>
          <div id="tc-ai-thinking" className="aic-msg aic-msg-ai">…</div>
          <div id="tc-card" className="aic-card">
            <div className="aic-card-bar" />
            <div className="aic-card-body">
              <div className="aic-card-head">
                <span className="aic-card-hint">AI 想做这件事，请确认</span>
                <span className="aic-badge">SAFE WRITE</span>
              </div>
              <div className="aic-card-tool">将执行工具 <code>clear_order_assoc</code></div>
              <pre className="aic-args">{`{
  "order_id": "A123456",
  "reason": "客户反馈订单归属错乱，排查修复"
}`}</pre>
              <div className="aic-actions">
                <button type="button" className="aic-btn aic-btn-ghost">拒绝</button>
                <button id="tc-btn" type="button" className="aic-btn aic-btn-primary">确认执行</button>
              </div>
            </div>
          </div>
          <div id="tc-done" className="aic-msg aic-msg-ai">
            已清除：订单 A123456 的全部绑定关联；审计记你的身份，可随时撤回
          </div>
        </div>
        <div className="aic-inputbar">
          <span id="tc-input" className="aic-input-text" />
          <span className="aic-send">发送</span>
        </div>
        <MockCursor id="tc-cursor" />
      </div>
    </div>
  )
}

/* ───────── 概念型 9 个（共享 .concept-demo / .concept-item / .concept-no 样式） ───────── */

/** 1. openclaw-pitfalls：3 条坑，全部出现后一起变灰 + 右侧浮现「未上线」标签 */
function ConceptList({
  id,
  title,
  items,
  extraClass,
}: {
  id: string
  title: string
  items: string[]
  extraClass?: string
}) {
  return (
    <div className={['concept-demo', extraClass].filter(Boolean).join(' ')} data-concept={id}>
      <h4 className="concept-title">{title}</h4>
      <ul className="concept-list">
        {items.map((text, i) => (
          <li key={i} className="concept-item" data-idx={i}>
            <span className="concept-no">{i + 1}</span>
            <span className="concept-text">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OpenclawPitfallsStage() {
  return <ConceptList id="openclaw-pitfalls" title="OpenClaw 三条绕不过去的坑"
    items={['凭证隔离问题', '细粒度权限做不到', '审计是黑洞']} />
}

export function FourPrerequisitesStage() {
  return <ConceptList id="four-prerequisites" title="AI 安全上岗的四个前提"
    items={['权限划分准确', 'AI 发疯有兜底', '行为可预测', '开发可持续']} />
}

export function TieredExecutionStage() {
  return (
    <div className="concept-demo" data-concept="tiered-execution">
      <h4 className="concept-title">分级策略：三档 + 撤回</h4>
      <ul className="concept-list">
        <li className="concept-item" data-idx="0">
          <span className="concept-no">1</span>
          <span className="concept-text">只读 → 直调生产</span>
        </li>
        <li className="concept-item" data-idx="1">
          <span className="concept-no">2</span>
          <span className="concept-text">安全写 → 本人确认后打生产</span>
        </li>
        <li className="concept-item" data-idx="2">
          <span className="concept-no">3</span>
          <span className="concept-text">写 → 测试服预演，生效后打生产</span>
        </li>
        <li className="concept-item" data-idx="3">
          <span className="concept-no">4</span>
          <span className="concept-text">可逆 → 出问题一键撤回</span>
          <span id="te-backup" className="concept-tag" style={{ display: 'none' }}>兜底</span>
        </li>
      </ul>
      {/* 分级决策流程图：列表动画播完后由 build 淡入 */}
      <div data-arch="tiered-flow" className="stage-arch">
        <ArchDiagram {...figTiered} caption="分级策略：只读直调 / 安全写确认 / 写级预演后生效 / 可逆撤回" />
      </div>
    </div>
  )
}

/* ───────── 独立舞台：badge-metaphor ───────── */

export function BadgeMetaphorStage() {
  return (
    <div className="concept-demo badge-stage" data-concept="badge-metaphor">
      <h4 className="concept-title">工牌借给 AI：它戴你的卡刷门</h4>
      <div className="badge-scene">
        <div id="badge-human" className="badge-human">员工</div>
        <div id="badge-ai" className="badge-ai">AI</div>
        <div id="badge-card" className="badge-card">工牌</div>
        <div id="badge-door" className="badge-door" />
      </div>
      <p id="badge-caption" className="badge-caption">门禁记的是员工的名字，不是 AI 的</p>
      {/* 方案总览图：概念动画播完后由 build 淡入（data-arch 选择器与 build 对应） */}
      <div data-arch="architecture" className="stage-arch">
        <ArchDiagram {...figArchitecture} caption="三层结构：协议仓库（接口自报家门）→ 统一身份（AI 走人一样的通道）→ 分级执行（AI 发疯也有兜底）" />
      </div>
    </div>
  )
}

/* ───────── 独立舞台：protocol-repo ───────── */

export function ProtocolRepoStage() {
  return (
    <div className="concept-demo repo-stage" data-concept="protocol-repo">
      <h4 className="concept-title">三档等级 + 可逆标记 → 协议仓库</h4>
      <div className="repo-row">
        <span id="repo-read" className="repo-card">
          <span className="repo-tag repo-tag-read">只读</span>
          查询 / 统计
        </span>
        <span id="repo-write" className="repo-card">
          <span className="repo-tag repo-tag-write">安全写</span>
          清除缓存
        </span>
        <span id="repo-revert" className="repo-card">
          <span className="repo-tag repo-tag-revert">可逆</span>
          发放优惠券
        </span>
        <span id="repo-risk" className="repo-card">
          <span className="repo-tag repo-tag-risk">写 · 预演</span>
          活动上线
        </span>
        <span id="repo-arrow" className="repo-arrow-line" />
        <span id="repo-warehouse" className="repo-warehouse">协议仓库</span>
      </div>
    </div>
  )
}

/* ───────── 独立舞台：unified-identity ───────── */

export function UnifiedIdentityStage() {
  return (
    <div className="concept-demo identity-stage" data-concept="unified-identity">
      <h4 className="concept-title">请求链：身份=张三 透传全程</h4>
      {/* 顺序与正文/figRequestFlow 一致：员工 → Apisix 鉴权 → 平台 → 业务后台 */}
      <div className="identity-chain">
        <span id="id-employee" className="identity-node">员工</span>
        <span className="identity-arrow" />
        <span id="id-apisix" className="identity-node">Apisix</span>
        <span className="identity-arrow" />
        <span id="id-platform" className="identity-node">平台</span>
        <span className="identity-arrow" />
        <span id="id-backend" className="identity-node">业务后台</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span id="id-badge" className="identity-badge">身份 = 张三</span>
      </div>
      {/* 请求链路图：链条动画播完后由 build 淡入 */}
      <div data-arch="request-flow" className="stage-arch">
        <ArchDiagram {...figRequestFlow} caption="身份透传是写死的基础设施逻辑——AI 在整个过程中没有任何选择身份的能力" />
      </div>
    </div>
  )
}

/* ───────── 独立舞台：tool-search（工具按需检索）─────────
 * 候选池里是真实契约工具（list_order_info / clear_order_assoc）+ 灰显长尾；
 * 命中 chip 在两个框里各有一份（池内 #ts-hit 高亮、栏内 #ts-injected 淡入），
 * 不做跨容器位移，避免 mode 1 缩放下坐标不稳。 */
export function ToolSearchStage() {
  return (
    <div className="concept-demo tsearch-stage" data-concept="tool-search">
      <h4 className="concept-title">工具按需检索：命中才进模型工具栏</h4>
      <div className="tsearch-row">
        <div className="tsearch-box">
          <div className="tsearch-box-title">协议仓库 · 候选池</div>
          <div className="tsearch-chips">
            <span id="ts-hit" className="tsearch-chip">list_order_info</span>
            <span className="tsearch-chip">clear_order_assoc</span>
            <span className="tsearch-chip tsearch-chip-dim">··· 长尾工具</span>
          </div>
        </div>
        <span id="ts-arrow" className="tsearch-arrow" />
        <div className="tsearch-box">
          <div className="tsearch-box-title">模型工具栏</div>
          <div className="tsearch-chips">
            <span className="tsearch-chip tsearch-chip-dim">ask_user</span>
            <span id="ts-searcher" className="tsearch-chip">search_tools</span>
            <span id="ts-injected" className="tsearch-chip tsearch-chip-in">list_order_info ✓</span>
          </div>
        </div>
      </div>
      <p id="ts-caption" className="tsearch-caption">没命中的工具，模型连它们的存在都不知道</p>
    </div>
  )
}

/* ───────── 独立舞台：audit-trail（操作留痕 + 撤回）─────────
 * 复刻真实 HistoryPage 的 data grid：时间/用户/工具/参数/状态/耗时/操作。
 * .mock-chat-body 类是光标坐标测量容器（与 ConfirmStage 同一套），勿改名。 */
export function AuditTrailStage() {
  return (
    <div className="concept-demo audit-stage mock-chat-body" data-concept="audit-trail">
      <h4 className="concept-title">操作历史：谁、何时、调了什么、结果如何</h4>
      <div className="audit-table">
        <div className="audit-row audit-head">
          <span>时间</span><span>用户</span><span>工具</span><span>参数</span><span>状态</span><span>耗时</span><span />
        </div>
        <div className="audit-row" id="ar-1">
          <span>09:41</span><span>张三</span><span><code>list_order_info</code></span>
          <span className="audit-args">date=昨天</span>
          <span className="audit-ok">200</span><span>320ms</span><span />
        </div>
        <div className="audit-row" id="ar-2">
          <span>09:42</span><span>张三</span><span><code>clear_order_assoc</code></span>
          <span className="audit-args">order_id=A123456</span>
          <span className="audit-ok">200</span><span>854ms</span>
          <span><button id="ar-rev" type="button" className="audit-rev-btn">撤回</button></span>
        </div>
        <div className="audit-row" id="ar-3">
          <span>09:43</span><span>李四</span><span><code>list_order_info</code></span>
          <span className="audit-args">date=昨天</span>
          <span className="audit-ok">200</span><span>280ms</span><span />
        </div>
      </div>
      <p id="ar-caption" className="audit-caption">撤回走的是同一个身份通道，撤回本身也会留痕</p>
      <MockCursor id="ar-cursor" />
    </div>
  )
}

/* ───────── 独立舞台：dev-flow ───────── */

export function DevFlowStage() {
  return (
    <div className="concept-demo devflow-stage" data-concept="dev-flow">
      <h4 className="concept-title">需求 → 方案 → 审查 → 隔离落地 → 发布</h4>
      <div className="devflow-rail">
        <span id="df-0" className="devflow-node">需求</span>
        <span className="devflow-arrow" data-df-arrow="0" />
        <span id="df-1" className="devflow-node">方案 Agent</span>
        <span className="devflow-arrow" data-df-arrow="1" />
        <span id="df-2" className="devflow-node">审查</span>
        <span className="devflow-arrow" data-df-arrow="2" />
        <span id="df-3" className="devflow-node">GitLab 触发</span>
        <span className="devflow-arrow" data-df-arrow="3" />
        <span id="df-4" className="devflow-node devflow-isolated">落地 Agent</span>
        <span className="devflow-arrow" data-df-arrow="4" />
        <span id="df-5" className="devflow-node">CI/CD</span>
        <span className="devflow-arrow" data-df-arrow="5" />
        <span id="df-6" className="devflow-node">发布</span>
      </div>
      {/* 开发流架构图：节点动画播完后由 build 淡入 */}
      <div data-arch="dev-flow-arch" className="stage-arch">
        <ArchDiagram {...figDevFlow} caption="需求 → 方案 Agent → 审查 → 触发 → 落地 Agent → 开发分支 → CI/CD → 测试 → 发布 → 验收" />
      </div>
    </div>
  )
}

