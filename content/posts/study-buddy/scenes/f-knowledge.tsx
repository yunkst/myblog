import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-knowledge（yaml label：功能：知识点库与关联图） */
export default function FKnowledge() {
  return (
    <>
      <SceneClip />
      <p>知识点按学科分类沉淀，每个知识点包含引子、答案、关联三部分。知识点之间可以建立 prerequisite / related 两种边，形成一张关系图，能看出先修关系和横向关联。</p>
      <p>知识点的来源有两个：拍题对话中由 Agent 自动整理入库，或在知识点库中手动新建。每个知识点都带独立的复习调度记录，直接进入间隔复习体系。</p>
      <p>数据全部存储在本地 SQLite，按职责拆成 12 个 Repository 分层管理。</p>
    </>
  )
}
