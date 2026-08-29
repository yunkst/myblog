// scene-stages.tsx
//
// 体验型 demo 的静态 DOM Stage。GSAP 在这些 DOM 上跑时间线。
// - FloodStage：群消息洪水。b1..b5 五条 left bubble + 底部字幕。
// - ConfirmStage：一次"安全写"确认流程。右输入气泡（打字机）+ AI 三态
//   （thinking / ask / done）+ 确认卡（含 #tc-btn 按钮 + #tc-light 状态灯）+ 模拟鼠标。
import { ChatPane, Bubble, Typewriter, MockCursor } from '../../../src/components/explore/mock-ui'

export function FloodStage() {
  return (
    <div className="flood-stage">
      <ChatPane title="公司群">
        <Bubble id="b1" side="left">软件崩了，快来</Bubble>
        <Bubble id="b2" side="left">后台怎么配置？</Bubble>
        <Bubble id="b3" side="left">这个需求帮我做下</Bubble>
        <Bubble id="b4" side="left">又挂了？？</Bubble>
        <Bubble id="b5" side="left">在吗？在吗？在吗？</Bubble>
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
