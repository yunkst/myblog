interface Props {
  id: string
  label?: string
}

/**
 * 阅读视图的胶囊按钮。点击进入探索视图对应节点（YAML 里 id 相同的那个）。
 * 这里为简化，href 用相对 `./explore/#id`，由阅读页面的当前位置解析。
 *
 * 实现使用原生 <a> 而非 react-router 的 <Link>：
 * - 组件不依赖 Router 上下文，单测里无须 MemoryRouter 包裹
 * - 探索路由是新增子路由，由 Post.tsx 在浏览器里原生导航即可（SSG 不参与此步）
 */
export default function QuestionAnchor({ id, label }: Props) {
  const text = label || id
  return (
    <a
      href={`./explore/#${id}`}
      className="question-anchor"
      data-question-anchor={id}
      title={`进入探索视图，定位到「${text}」`}
    >
      ◈ 探索 · {text}
    </a>
  )
}