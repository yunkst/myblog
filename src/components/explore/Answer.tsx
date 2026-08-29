import type { ReactNode } from 'react'

/**
 * v2：原位渲染块。阅读与探索是同一页面的两种用法，Answer 不再有
 * "注册到 Provider、被探索面板抽取"的第二渲染路径——id 即锚点，
 * 场景目录 / 出口 chips / 首页悬念按钮都指向 #<id>。
 */
export default function Answer({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="answer-block" id={id}>
      {children}
    </div>
  )
}
