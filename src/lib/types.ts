export type AnimProfile = 'auto' | 'data-narrative' | 'architecture' | 'story'
export type PostStatus = 'draft' | 'published' | 'scheduled'

export interface Post {
  slug: string
  title: string
  domain: string
  date: string          // YYYY-MM-DD
  anim_profile: AnimProfile
  status: PostStatus
  excerpt: string
  fileName: string
  pinned: boolean     // meta.yaml pinned: true → 列表置顶（置顶之间仍按日期倒序）
  hasExplore: boolean   // 文章目录下存在 explore.yaml 时为 true
  exploreEntry?: { id: string; label: string }  // 场景入口（yaml entry 场景的 label）；无 explore.yaml 时缺省
}

export interface Domain {
  slug: string
  posts: Post[]
  updatedAt: string     // 该领域最近文章日期
}

export interface SiteConfig {
  site: {
    name: string
    /** 头衔行（如「全栈开发 · 独立负责公司技术体系」），跟在姓名后面 */
    tagline: string
    /** hero eyebrow 文案（如「求职」） */
    eyebrow: string
    /** hero 上的更新月份标记（如 2026-09），需手工维护 */
    updated: string
    /** 从业年数，需手工维护 */
    years: number
    email: string
    wechat_qr: string
    github: string
    domains: string[]
    /** 主页「关于我」区块（可选） */
    about?: {
      experience: string
      ai: string
      stacks: { label: string; items: string }[]
      /** 业务规模数字，给 AI 项目提供现实上下文 */
      stats?: { value: string; label: string }[]
    }
    /** 主页「AI 提效实践」区块（可选）：post 填博客 slug */
    practices?: { post: string; kicker: string; desc: string }[]
    /** 主页「核心优势」区块（可选） */
    strengths?: { title: string; desc: string }[]
  }
}

export type ExploreTarget = string | { post: string; scene: string }

export interface ExploreExit {
  text: string
  to: ExploreTarget
}

export interface ExploreScene {
  id: string
  label: string
  demo: string
  features?: ExploreExit[]
  questions?: ExploreExit[]
  /** 1: 全屏动画先行；2: 文字先行（默认）；3: 纯文字 */
  mode?: 1 | 2 | 3
}

export interface ExploreConfig {
  title: string
  entry: string
  scenes: ExploreScene[]
}
