import SceneClip from '../../../../src/components/explore/SceneClip'

/** 幕正文：q-problem（yaml label：公司的技术问题，都是谁在解决？） */
export default function QProblem() {
  return (
    <>
      <SceneClip demo="message-flood" />
      <p>公司的技术人员只有我一个。软件出问题找我、后台不会用找我、什么东西怎么配置也找我。</p>
      <img src="/posts/ai-digital-employee/solo-tech.webp"
        alt="公司技术就我一个人的日常：软件崩了、后台不会用、配置不会改，全都来找我" />
      <p>我自然想到：能不能做一个 AI 数字分身，替我答疑、替我处理这些重复劳动？</p>
    </>
  )
}
