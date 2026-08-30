import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-future（yaml label：未来拓展：让 AI 替我接需求）—— 一幕一动画 */
export default function QFuture() {
  return (
    <>
      <SceneClip demo="dev-flow" />
      <p>除了管理后台和问答，这套框架还能很自然地向"开发"延伸。我的初步构思是：</p>
      <ol>
        <li><strong>方案生成 Agent（只读接口）</strong>：可以阅读源码。收到需求后，它会反向追问，直到把所有细节确认清楚，然后输出一份完整方案。因为只读，所以零风险，随便它跑。</li>
        <li><strong>方案落地（独立系统 + 高风险接口）</strong>：落地不在平台里做，而是通过 GitLab 的触发器唤起一个独立的 agent 系统来实施。实施发生在开发分支，完成后提交，由 CI/CD 自动部署到测试环境。管理人员审查方案、验证可行之后，再正式发布。注意这个 agent 系统是<strong>独立隔离</strong>的——源码访问的权限管控由它自己负责，平台自始至终碰不到源码，当年 OpenClaw 没解决好的凭证隔离问题不会回流到平台里。</li>
        <li><strong>客户端需求的交付</strong>：如果是小程序需求，返回体验码；如果是 App，直接返回 APK。所有代码都在非主分支上。</li>
      </ol>
      <p>整个开发流的形态见下一幕。</p>
      <p>这一步落地之后，我就能从"接收需求 → 转述给 Claude Code"这个复读机循环里彻底解放出来了。</p>
    </>
  )
}
