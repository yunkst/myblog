import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-unified-identity（yaml label：第二层：AI 走人一样的权限通道）—— 链条动画 + 请求链路图 */
export default function QUnifiedIdentity() {
  return (
    <>
      <SceneClip />
      <p>权限管理这块，我用的是：</p>
      <ul>
        <li><strong>Casdoor</strong> 做单点登录</li>
        <li><strong>Apisix + openid-connect</strong> 做统一鉴权</li>
      </ul>
      <p>关键设计是：<strong>平台本质上也是一个后台系统</strong>——它自己就部署在 Apisix 后面，和所有业务后台共用同一个登录入口，不搞任何特殊待遇。员工的请求先经 Apisix 鉴权、身份确定后才到达平台，平台知道用户的角色，然后<strong>携带这个角色信息</strong>去请求目标后台。目标后台根据既有的 RBAC 策略决定接受还是拒绝——这和用户本人直接打开那个后台发起请求，是完全一致的。</p>
      <p>这里有一个必须强调的实现细节：<strong>身份的透传是写死的基础设施逻辑，不是 AI 的行为</strong>。当前和平台对话的人是谁，请求就以谁的身份发出，AI 在整个过程中没有任何选择身份的能力，平台自身也不持有任何常驻特权——它只是一段中继代码。越权在结构上就不可能发生。</p>
      <p>把一次请求的完整链路画成图，按 ①-④ 读：员工发起请求，Apisix 鉴权并确定身份，平台携带该身份调用业务后台，后台按这个身份做 RBAC 校验后返回。虚线回程是审计口径：记的是员工本人的名字，出了事找得到人。整条链路上身份只由 Apisix 确定一次，之后每一跳只做透传——AI 平台自己也挂在 Apisix 后面，没有为 AI 另开任何通道。</p>
      <p>这一层直接解决了四个前提里的第一条：</p>
      <ul>
        <li>权限不需要重新设计，沿用已有体系；</li>
        <li>以往的审计体系<strong>零改动</strong>——因为在审计系统眼里，AI 发起的请求和人发起的请求长得一模一样，且日志里的身份就是真实操作人；</li>
        <li>整个机制简单直白，出错面很小。</li>
      </ul>
    </>
  )
}
