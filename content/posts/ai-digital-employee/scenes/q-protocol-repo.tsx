import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-protocol-repo（yaml label：第一层：让接口自报家门） */
export default function QProtocolRepo() {
  return (
    <>
      <SceneClip demo="protocol-repo" />
      <p>后台服务（Flask、FastAPI 都无所谓）接入一个注解包，可以给接口标注格式化的元数据，然后一行命令把全量接口信息导出，存放到一个<strong>协议仓库</strong>中。这个功能对任何框架来说实现起来都相当简单。</p>
      <p>每个接口必须声明四个属性：</p>
      <table>
        <thead>
          <tr><th>属性</th><th>含义</th><th>举例</th></tr>
        </thead>
        <tbody>
          <tr><td>是否只读</td><td>不产生任何副作用</td><td>查询、统计</td></tr>
          <tr><td>是否安全写</td><td>可直接作用于生产</td><td>清除缓存</td></tr>
          <tr><td>是否可逆</td><td>出问题可以安全撤回</td><td>发放优惠券</td></tr>
          <tr><td>是否高风险</td><td>无法撤回，后果直接生效</td><td>发送通知、活动上线</td></tr>
        </tbody>
      </table>
      <p>协议仓库会作为知识接入 AI 体系。配合后面的设计，AI 就能像调用工具一样调用公司任意后台的接口。</p>
    </>
  )
}
