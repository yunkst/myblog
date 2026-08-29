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
  body: string
  fileName: string
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

export type QuestionKind = 'local' | 'cross-link'
export type QuestionStatus = 'placeholder' | undefined | null

export interface ExploreNode {
  id: string
  label: string
  seek?: string
  kind?: QuestionKind
  status?: QuestionStatus
  detail?: string       // 仅 placeholder 用
  preview?: string      // 仅 cross-link 用
  to?: { post: string; anchor: string }
  children?: ExploreNode[]
}

export interface ExploreConfig {
  title: string
  anim?: string         // 相对路径字符串
  seek_root?: string
  nodes: ExploreNode[]
}
