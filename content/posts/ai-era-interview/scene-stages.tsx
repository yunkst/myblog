// scene-stages.tsx — ai-era-interview 各 demo 的静态 Stage（首帧全亮，build 负责收回初始态）
import './post.css'

/* 漫画舞台：horse-comic 两格逐现（mode 1 全屏先播）；reverse-filter 单格。
 * 图片由 AI 生成，存 assets/，构建后 URL 为 /posts/ai-era-interview/<file>。 */
export function HorseComicStage() {
  return (
    <div className="concept-demo comic-stage" data-concept="horse-comic">
      <figure className="comic-panel" id="hc-1">
        <img src="/posts/ai-era-interview/horse-1.png" alt="招聘司机的考场里，候选人在骑马绕桩" />
        <figcaption>招聘司机的考场：骑马绕桩</figcaption>
      </figure>
      <figure className="comic-panel" id="hc-2">
        <img src="/posts/ai-era-interview/horse-2.png" alt="考场外停着一排汽车，方向盘无人触碰" />
        <figcaption>考场外：一排汽车等着被开</figcaption>
      </figure>
    </div>
  )
}

export function ReverseFilterStage() {
  return (
    <div className="concept-demo comic-stage" data-concept="reverse-filter">
      <figure className="comic-panel" id="rf-1">
        <img src="/posts/ai-era-interview/reverse-filter.png" alt="两条泳道：诚实的人绑着沙袋游泳，作弊的人开着摩托艇" />
        <figcaption>禁止 AI 的泳道：绑沙袋的诚实者 vs 开摩托艇的作弊者</figcaption>
      </figure>
    </div>
  )
}

/* 概念列表（复用全局 .concept-demo 样式） */
function ConceptList({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <div className="concept-demo" data-concept={id}>
      <h4 className="concept-title">{title}</h4>
      <ul className="concept-list">
        {items.map((text, i) => (
          <li key={i} className="concept-item" data-idx={i}>
            <span className="concept-no">{i + 1}</span>
            <span className="concept-text">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Route1Stage() {
  return <ConceptList id="route-1-fails" title="路线一：防作弊防错了东西"
    items={['做题 · 八股 · 现场手写代码', '摄像头监考 · 检测切屏', '测出的是「没有 AI 时的水平」']} />
}

export function OpenAiStage() {
  return <ConceptList id="open-ai" title="开放 AI：作弊概念直接消失"
    items={['不用监考，不用猫鼠游戏', '同一条起跑线 = 真实工作环境', '面试直接考人机协同']} />
}

export function QuestionDesignStage() {
  return <ConceptList id="question-design" title="出题三原则"
    items={['复杂度要够：AI 一把梭就看不出水平', '描述要简单：一句话说清', '不能太常规：AI 的坑就是面试题']} />
}

export function ObserveFourStage() {
  return <ConceptList id="observe-four" title="观察四件事"
    items={['怎么提问：拆解能力', '怎么选型：权衡能力', '能否发现坑：批判能力 · 区分度核心', '怎么落地：工程能力']} />
}

export function ObjectionsStage() {
  return <ConceptList id="objections" title="两个质疑"
    items={['离开 AI 不会写代码？批判能力长在基本功上', '考察点会过时？判断力最后被替代']} />
}
