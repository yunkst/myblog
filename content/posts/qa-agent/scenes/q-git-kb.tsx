import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-git-kb（yaml label：知识为什么用 git 管） */
export default function QGitKb() {
  return (
    <>
      <SceneClip />
      <p>知识库没有专门的后台管理系统，<strong>每个知识库就是一个 git 仓库</strong>。服务后台每 5 分钟对每个仓库做一次同步；同步失败的半成品目录会被自动清掉，下个周期重新拉取。</p>
      <p>每个仓库根目录放一份自描述文件，说明这个仓库里有什么。它被注入 agent 的提示词——agent 先按自描述判断该去哪个仓库找，再进去读文件、列目录、按关键词搜索。</p>
      <p>用 git 管知识，白送三件事：改动有历史、更新走评审、写错了能回滚。如果自己做一套知识库后台，这些全都得重新发明一遍。</p>
    </>
  )
}
