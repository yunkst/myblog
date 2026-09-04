import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-protocol-repo（yaml label：第一层：让接口自报家门） */
export default function QProtocolRepo() {
  return (
    <>
      <SceneClip />
      <p>后台服务（Flask、FastAPI 都无所谓）接入一个注解包，可以给接口标注格式化的元数据，然后一行命令把全量接口信息导出，存放到一个<strong>协议仓库</strong>中。这个功能对任何框架来说实现起来都相当简单。</p>
      <p>每个接口声明一个等级，外加一个可逆标记：</p>
      <table>
        <thead>
          <tr><th>声明</th><th>含义</th><th>举例</th></tr>
        </thead>
        <tbody>
          <tr><td>只读</td><td>不产生任何副作用，AI 直接调用</td><td>查询、统计</td></tr>
          <tr><td>安全写</td><td>可直接作用于生产，本人确认后执行</td><td>清除缓存</td></tr>
          <tr><td>写</td><td>先打测试服预演，看到效果后点「生效」才上生产</td><td>活动上线</td></tr>
          <tr><td>可逆（标记）</td><td>与等级正交：出问题可以安全撤回</td><td>发放优惠券</td></tr>
        </tbody>
      </table>
      <p>有两个设计细节值得说。一是接口描述不只是注释——它会被注入模型的工具清单，是模型决定"什么时候用、怎么传参"的唯一依据，所以描述按业务语义写，不写代码行为。二是工具默认<strong>不</strong>全部塞给模型：所有接口先收进一个检索池，模型遇到具体问题时按需求检索、命中后才拿到调用能力——上下文干净，敏感工具也不会平白暴露在模型面前。</p>
      <p>协议仓库会作为知识接入 AI 体系。配合统一身份和分级执行两层设计，AI 就能像调用工具一样调用公司任意后台的接口。</p>
    </>
  )
}
