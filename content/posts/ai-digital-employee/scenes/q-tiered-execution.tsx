import SceneClip from '../../../../src/components/explore/SceneClip'
import ArchDiagram from '../../../../src/components/blog-anim/ArchDiagram'
import { figTiered } from '../../../../src/components/blog-anim/diagrams/ai-digital-employee'

/** 幕正文：q-tiered-execution（yaml label：第三层：分级执行（总览）） */
export default function QTieredExecution() {
  return (
    <>
      <SceneClip demo="tiered-execution" />
      <p>在 平台内部，按照协议仓库里的接口分类，执行不同的约束策略：</p>
      <ul>
        <li><strong>只读接口</strong>：直接调用，不需要任何申请；</li>
        <li><strong>安全写接口</strong>：获得人类确认后立即触发；</li>
        <li>
          <strong>其他写接口</strong>：先把请求发送到<strong>测试服</strong>。测试服的数据库会定期和生产同步一次，所以人可以去测试服实际查看效果，确认是否符合预期——这一步解决的是行为结果的可观测性；
          <ul>
            <li>如果接口是<strong>可逆</strong>的，确认之后再发送到生产服务；</li>
            <li>如果接口是<strong>高风险</strong>的，必须由 平台的<strong>管理员角色</strong>审批，只有管理员能真正在生产环境触发它；</li>
          </ul>
        </li>
        <li><strong>可逆接口的撤回</strong>：事后如果发现出了问题，在 平台后台点一下"撤回"即可回滚操作。</li>
      </ul>
      <p>还有一个不起眼但关键的约束：<strong>预演通过的请求载荷会被锁定</strong>。从测试服验证到生产执行，AI 提交的是同一份参数，不存在"审批的是 A、执行的是 B"的可能。这在代码层面实现，并不难，但缺了它，前面所有分级审批都会形同虚设。</p>
      <p>把分级策略画成决策流程，就是这样：</p>
      <ArchDiagram {...figTiered} caption="分级策略：只读直调 / 安全写确认 / 可逆预演+锁定 / 高风险管理员审批" />
      <p>这套逻辑清晰明了，代码量也不大，更多的工作量其实在 UI 设计上。核心链路用足够的单元测试保护起来即可。</p>
      <p>到这里，四个前提全部闭环：权限沿用 RBAC（前提 1）、分级确认 + 管理员审批 + 可撤回 + 载荷锁定（前提 2、3）、核心逻辑精简（前提 4）。</p>
    </>
  )
}
