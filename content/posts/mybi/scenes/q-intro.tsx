import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：q-intro */
export default function QIntro() {
  return (
    <>
      <SceneClip />
      <p>
        mybi 是一个声明式 + AI 编辑的企业内部 BI 平台，从 c2h4-project 中抽出 BI 子系统独立落地。
        它要解决的核心问题是：<strong>让 AI 生成/修改看板这件事可控</strong>——
        AI 拥有编辑自由，但没有绕过质检和权限的通道。
      </p>
      <p>体系的三个基本原则：</p>
      <ul>
        <li><strong>单一真相源</strong>：看板与语义的真相源在 postgres——看板是 JSON document，草稿/版本/导航/回滚全部是 DB 语义，Git 只做代码版本控制；</li>
        <li><strong>AI 与 Lint 双闭环</strong>：AI 通过 agent 工具在 DB 草稿内编辑 document，每次发布过 Linter（bi-checker）验证门；</li>
        <li><strong>默认拒绝</strong>：取数层对每条 SQL 做 AST 校验，表/列必须在角色白名单内；声明校验只有 bi-checker 一处实现，CLI / server / agent 验证门三处共用。</li>
      </ul>
      <p>
        技术栈：4 个 Rust 服务（bi-data-layer 取数代理、bi-etl 物化、bi-checker Linter、bi-agent AI 助手，纯 Rust 无 C 依赖）
        + 2 个前端（portal 门户、dashboard-app 看板运行时，React + Vite + Tailwind）
        + Doris（数仓底座）+ Flink CDC（88 张表实时同步）+ postgres/pgvector（真源与语义检索）。
        LLM 走 Anthropic Messages API 兼容网关。
      </p>
      <p>
        当前状态：MVP 端到端已跑通——41 个 FineBI 导入看板 + 原生 document 看板在线，
        AI 编辑（SSE 流式回复、会话恢复、上下文压缩、langfuse 观测）可用。项目为公司内部仓库，未开源。
      </p>
      <p>
        下面按子系统展开关键实现：AI 编辑全流程、看板运行时、语义树契约、错误回流、SQL 安全代理、语义层、端到端数据流。
        每节标注关键代码位置，可对照仓库查阅。
      </p>
    </>
  )
}
