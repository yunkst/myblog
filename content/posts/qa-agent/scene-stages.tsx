// scene-stages.tsx — qa-agent 各 demo 的静态 Stage（首帧全亮，build 负责收回初始态）
import './post.css'
import ArchDiagram from '@/components/blog-anim/ArchDiagram'
import { figQaOverview, figAsTool } from './diagrams'

export function OverviewStage() {
  return (
    <div data-arch="qa-overview">
      <ArchDiagram {...figQaOverview} caption="独立部署的只读服务：平台把它当一个工具调用，知识副本每 5 分钟从 GitLab 同步" />
    </div>
  )
}

export function AsToolStage() {
  return (
    <div data-arch="as-tool">
      <ArchDiagram {...figAsTool} caption="流式协议分流：过程解说只给提问者看，最终答案才进主 agent 上下文" />
    </div>
  )
}

/* git-kb：平台工具调用演出（真实形态：qa-agent 没有自己的界面，
 * 是 ai-center 对话里的一个工具——tool call 卡片内流式出现过程解说，
 * 最终答案才以 AI 气泡进主 agent 上下文；卡片里的 commit hash 是
 * 「知识装进 git」的戏眼。工具名 qachat / list_repos / read_file 均为真实契约） */
export function KbChatStage() {
  return (
    <div className="concept-demo kb-chat-stage">
      <div className="kb-app">
        <header className="kb-topbar">
          <span className="kb-crumb"><b>ai center</b><i>·</i><em>对话</em></span>
          <span className="kb-src">知识源：git 仓库 · 5 分钟前同步</span>
        </header>
        <div className="kb-messages">
          <div id="kb-user" className="kb-msg kb-msg-user">境外订单的退款流程是什么？</div>
          <div id="kb-thinking" className="kb-msg kb-msg-ai">…</div>
          <div id="kb-tool" className="kb-tool">
            <div className="kb-tool-head">tool call · qachat</div>
            <pre className="kb-tool-pre">
              <span className="kb-step">list_repos → 定位 <b>refund</b> 仓库</span>
              <span className="kb-step">read_file("refund/policy.md") · <b>a3f9c1e</b></span>
            </pre>
          </div>
          <div id="kb-answer" className="kb-msg kb-msg-ai">
            境外订单退回后包裹走 DHL 回仓，仓库验收后按原支付路径退款，7 个工作日内到账。
            <span id="kb-cite" className="kb-cite">答案来自 refund/policy.md · 改动有评审历史</span>
          </div>
        </div>
        <div className="kb-inputbar">
          <span id="kb-input" className="kb-input-text" />
          <span className="kb-send">发送</span>
        </div>
      </div>
      <p id="kb-caption" className="kb-caption">它没有自己的界面——是平台调用的工具；读的是 git 里的知识，写错能回滚</p>
    </div>
  )
}

/* access-rules：左规则文件 + 右两个角色视图（专属样式在 post.css） */
export function AccessStage() {
  return (
    <div className="concept-demo access-stage" data-concept="access-rules">
      <h4 className="concept-title">whocanread.yml：权限跟着仓库走</h4>
      <div className="access-row">
        <div className="access-rules">
          <div className="access-file">whocanread.yml</div>
          <div className="access-rule" data-idx="0">secrets/** <em>所有人不可见</em></div>
          <div className="access-rule" data-idx="1">internal/** <em>external 不可见</em></div>
          <div className="access-rule" data-idx="2">* <em>external 不可见</em></div>
        </div>
        <div className="access-views">
          <div className="access-view" id="av-dev">
            <div className="access-role">developer 看到的</div>
            <div className="access-item ok">docs/ 使用文档</div>
            <div className="access-item ok">internal/ 内部资料</div>
            <div className="access-item deny">secrets/ 按策略隐藏</div>
          </div>
          <div className="access-view" id="av-ext">
            <div className="access-role">external 看到的</div>
            <div className="access-item deny">整个仓库不可见</div>
          </div>
        </div>
      </div>
      <p id="ac-caption" className="access-caption">看不见仓库的人，连它的存在都不知道</p>
    </div>
  )
}
