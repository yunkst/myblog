import SceneClip from '@/components/explore/SceneClip'

/** 幕正文：f-write（yaml label：功能：从 0 写一本自己的小说） */
export default function FWrite() {
  return (
    <>
      <SceneClip />
      <p>除了读和改，也可以从 0 开始写一本自己的小说。流程分三步：</p>
      <p>① 告诉 AI 想写的题材和主角设定，由 AI 建书、确定世界观、列出角色；② AI 生成全书大纲和章节细纲；③ 每章由用户说明要写的内容，AI 结合人物设定和风格要求生成整章正文。</p>
      <p>每个角色独立建档，写章节时按出场角色注入对应上下文，保持人设一致。支持按场景描述生成封面和插图（需要可选后端 ComfyUI）。</p>
    </>
  )
}
