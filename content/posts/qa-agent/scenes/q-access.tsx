import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-access（yaml label：谁能看什么：权限写在仓库里） */
export default function QAccess() {
  return (
    <>
      <SceneClip />
      <p>仓库里不全是能给人看的内容。每个仓库根目录有一个权限文件 <code>whocanread.yml</code>，按路径声明哪些角色不可看：</p>
      <table>
        <thead>
          <tr><th>规则</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td><code>internal/payroll/**</code> 对 developer 不可见</td><td>薪酬目录只有非开发角色可读</td></tr>
          <tr><td><code>secrets/**</code> 对所有人不可见</td><td>密钥目录任何角色都读不到</td></tr>
          <tr><td><code>*</code> 对 external 不可见</td><td>外部角色默认整个仓库不可见</td></tr>
        </tbody>
      </table>
      <p>权限跟着仓库走，仓库clone到哪，规则就到哪，不需要平台侧再维护一份映射。可见仓库列表本身也按角色过滤——看不见某个仓库的人，连它的存在都不知道。</p>
      <p>agent 读到被拦截的内容时，工具返回「按策略隐藏」。提示词明确要求它不追问、不绕过，用其他可见信息回答；问题超出可见范围时，直接告知用户。</p>
    </>
  )
}
