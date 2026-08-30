// scene-stages.tsx
//
// 15 个 demo 的静态 DOM Stage。GSAP 在这些 DOM 上跑时间线。
// 体验型：FloodStage（群消息洪水）、ConfirmStage（一次确认流程）。
// 概念型 9 个：openclaw-pitfalls / four-prerequisites / badge-metaphor /
//   protocol-repo / unified-identity / tiered-execution / threat-model /
//   limits / dev-flow。
// 架构图型 4 个：architecture / request-flow / tiered-flow / dev-flow-arch
//   （原幕里把图迁出后单独成幕；stage 包裹 ArchDiagram 容器，build 做淡入）。
import { ChatPane, Bubble, Typewriter, MockCursor } from '../../../src/components/explore/mock-ui'
import ArchDiagram from '../../../src/components/blog-anim/ArchDiagram'
import {
  figArchitecture,
  figRequestFlow,
  figTiered,
  figDevFlow,
} from '../../../src/components/blog-anim/diagrams/ai-digital-employee'

/* ───────── 体验型 2 个 ───────── */

export function FloodStage() {
  return (
    <div className="flood-stage">
      <ChatPane title="公司群">
        <Bubble id="b1" side="left" avatar="/posts/ai-digital-employee/avatars/avi-a.webp" name="小周">
          这个账号怎么开通啊？
        </Bubble>
        <Bubble id="b2" side="left" avatar="/posts/ai-digital-employee/avatars/avi-b.webp" name="小吴">
          后台怎么配置？
        </Bubble>
        <Bubble id="b3" side="left" avatar="/posts/ai-digital-employee/avatars/avi-c.webp" name="李姐">
          这个需求帮我做下
        </Bubble>
        <Bubble id="b4" side="left" avatar="/posts/ai-digital-employee/avatars/avi-d.webp" name="小郑">
          上次那个数据再发我一遍
        </Bubble>
        <Bubble id="b5" side="left" avatar="/posts/ai-digital-employee/avatars/avi-e.webp" name="小王">
          活动文案改一下
        </Bubble>
        <Bubble id="b-me1" side="right" avatar="/posts/ai-digital-employee/avatars/avi-me.webp" name="我">
          在的，等我看看
        </Bubble>
        <Bubble id="b-me2" side="right" avatar="/posts/ai-digital-employee/avatars/avi-me.webp" name="我">
          在
        </Bubble>
      </ChatPane>
      <p id="flood-line1" className="flood-line">公司的技术人员，只有我一个。</p>
      <p id="flood-line2" className="flood-line">能不能做一个 AI 数字分身，替我处理这些？</p>
    </div>
  )
}

export function ConfirmStage() {
  return (
    <div className="confirm-stage">
      <ChatPane title="AI 数字员工">
        <Bubble id="tc-user" side="right">
          <Typewriter text="请给张三开通 BI 看板权限" id="tc-input" />
        </Bubble>
        <Bubble id="tc-ai-thinking" side="left">…</Bubble>
        <Bubble id="tc-ai-ask" side="left">该操作涉及【安全写】，需要您确认</Bubble>
        <div id="tc-card" className="confirm-card">
          <div className="confirm-card-head">
            <span className="confirm-card-title">开通看板权限</span>
            <span id="tc-light" className="confirm-card-light" />
          </div>
          <div className="confirm-card-row">
            目标：张三 · 权限：BI 看板 · 身份：张三本人
          </div>
          <button id="tc-btn" type="button" className="confirm-card-btn">确认</button>
        </div>
        <Bubble id="tc-done" side="left">已完成：张三的看板权限已开通</Bubble>
        <MockCursor id="tc-cursor" />
      </ChatPane>
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

export function LimitsStage() {
  return <ConceptList id="limits" title="这套方案解决不了什么"
    items={[
      '撤回有边界',
      '会议室兜底不可逆操作',
      '分级过滥让管理员变橡皮印章',
      '防不住针对人的诱导',
      '测试服数据陈旧',
    ]} />
}

export function TieredExecutionStage() {
  return (
    <div className="concept-demo" data-concept="tiered-execution">
      <h4 className="concept-title">分级策略四档</h4>
      <ul className="concept-list">
        <li className="concept-item" data-idx="0">
          <span className="concept-no">1</span>
          <span className="concept-text">只读 → 直接调用</span>
        </li>
        <li className="concept-item" data-idx="1">
          <span className="concept-no">2</span>
          <span className="concept-text">安全写 → 人类确认后触发</span>
        </li>
        <li className="concept-item" data-idx="2">
          <span className="concept-no">3</span>
          <span className="concept-text">可逆 → 测试服预演 + 载荷锁定</span>
        </li>
        <li className="concept-item" data-idx="3">
          <span className="concept-no">4</span>
          <span className="concept-text">高风险 → 管理员审批后执行</span>
          <span id="te-backup" className="concept-tag" style={{ display: 'none' }}>兜底</span>
        </li>
      </ul>
    </div>
  )
}

/* ───────── 独立舞台：badge-metaphor ───────── */

export function BadgeMetaphorStage() {
  return (
    <div className="concept-demo badge-stage" data-concept="badge-metaphor">
      <h4 className="concept-title">工牌借给 AI：她戴你的卡刷门</h4>
      <div className="badge-scene">
        <div id="badge-human" className="badge-human">员工</div>
        <div id="badge-ai" className="badge-ai">AI</div>
        <div id="badge-card" className="badge-card">工牌</div>
        <div id="badge-door" className="badge-door" />
      </div>
      <p id="badge-caption" className="badge-caption">门禁记的是员工的名字，不是 AI 的</p>
    </div>
  )
}

/* ───────── 独立舞台：protocol-repo ───────── */

export function ProtocolRepoStage() {
  return (
    <div className="concept-demo repo-stage" data-concept="protocol-repo">
      <h4 className="concept-title">三个接口方块 → 协议仓库</h4>
      <div className="repo-row">
        <span id="repo-read" className="repo-card">
          <span className="repo-tag repo-tag-read">只读</span>
          查询 / 统计
        </span>
        <span id="repo-write" className="repo-card">
          <span className="repo-tag repo-tag-write">安全写</span>
          清除缓存
        </span>
        <span id="repo-risk" className="repo-card">
          <span className="repo-tag repo-tag-risk">高风险</span>
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
      <div className="identity-chain">
        <span id="id-employee" className="identity-node">员工</span>
        <span className="identity-arrow" />
        <span id="id-platform" className="identity-node">平台</span>
        <span className="identity-arrow" />
        <span id="id-apisix" className="identity-node">Apisix</span>
        <span className="identity-arrow" />
        <span id="id-backend" className="identity-node">业务后台</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span id="id-badge" className="identity-badge">身份 = 张三</span>
      </div>
    </div>
  )
}

/* ───────── 独立舞台：threat-model ───────── */

export function ThreatModelStage() {
  return (
    <div className="concept-demo threat-stage" data-concept="threat-model">
      <h4 className="concept-title">平台是纯增量层</h4>
      <div className="threat-wrap">
        <div className="threat-legacy">传统后台<br/><span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>权限 · 审计 · 入口</span></div>
        <div id="threat-platform" className="threat-platform">平台增量层</div>
      </div>
      <p id="threat-caption" className="threat-caption">不收缩任何权限 · 不替代任何后台</p>
    </div>
  )
}

/* ───────── 独立舞台：dev-flow ───────── */

export function DevFlowStage() {
  return (
    <div className="concept-demo devflow-stage" data-concept="dev-flow">
      <h4 className="concept-title">需求 → 方案 → 落地 → 发布</h4>
      <div className="devflow-rail">
        <span id="df-0" className="devflow-node">需求</span>
        <span className="devflow-arrow" data-df-arrow="0" />
        <span id="df-1" className="devflow-node">方案 Agent</span>
        <span className="devflow-arrow" data-df-arrow="1" />
        <span id="df-2" className="devflow-node">审查</span>
        <span className="devflow-arrow" data-df-arrow="2" />
        <span id="df-3" className="devflow-node">落地 Agent</span>
        <span className="devflow-arrow" data-df-arrow="3" />
        <span id="df-4" className="devflow-node">CI/CD</span>
        <span className="devflow-arrow" data-df-arrow="4" />
        <span id="df-5" className="devflow-node">发布</span>
      </div>
    </div>
  )
}

/* ───────── 架构图型 4 个（一幕一图；build 只做容器淡入） ───────── */

export function ArchitectureStage() {
  return <div data-arch="architecture"><ArchDiagram {...figArchitecture} caption="三层结构：协议仓库（接口自报家门）→ 统一身份（AI 走人一样的通道）→ 分级执行（AI 发疯也有兜底）" /></div>
}

export function RequestFlowStage() {
  return <div data-arch="request-flow"><ArchDiagram {...figRequestFlow} caption="身份透传是写死的基础设施逻辑——AI 在整个过程中没有任何选择身份的能力" /></div>
}

export function TieredFlowStage() {
  return <div data-arch="tiered-flow"><ArchDiagram {...figTiered} caption="分级策略：只读直调 / 安全写确认 / 可逆预演+锁定 / 高风险管理员审批" /></div>
}

export function DevFlowArchStage() {
  return <div data-arch="dev-flow-arch"><ArchDiagram {...figDevFlow} caption="需求 → 方案 Agent → 审查 → 触发 → 落地 Agent → 开发分支 → CI/CD → 测试 → 发布 → 验收" /></div>
}
