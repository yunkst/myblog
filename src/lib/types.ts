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
  hasExplore: boolean   // 文章目录下存在 explore.yaml 时为 true
  exploreEntry?: { id: string; label: string }  // 场景入口（yaml entry 场景的 label）；无 explore.yaml 时缺省
}

export interface Domain {
  slug: string
  posts: Post[]
  updatedAt: string     // 该领域最近文章日期
}

export interface Wip {
  slug: string
  title: string
  status: string
  progress: number
  thoughts: string
}

export interface Faq {
  id: string
  text: string
  target: string
}

export interface SiteConfig {
  site: {
    name: string
    tagline: string
    email: string
    wechat_qr: string
    github: string
    domains: string[]
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
