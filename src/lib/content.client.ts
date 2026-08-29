import yaml from 'js-yaml'
import type { ComponentType } from 'react'
import type { Post, Domain, Wip, Faq, SiteConfig, AnimProfile, PostStatus } from './types'

/* 客户端数据层：不依赖 node:fs / process.cwd()。
 * SSG 期由 lib/content.ts 读文件；客户端 hydrate 时从这里读 Vite 编译产物，
 * 两边由 vite.config.ts 的 environments.client.resolve.alias 切换。 */

/* remarkExportFrontmatter（vite.config.ts）已把每个 MDX 的 frontmatter 编译为 `export const frontmatter` */
type MdxModule = { default: ComponentType<any>; frontmatter: Record<string, any> }
const postModules = import.meta.glob<MdxModule>('/content/posts/*/article.mdx', { eager: true })
/* 客户端无法 fs.existsSync；用探索 yaml glob 反推 hasExplore（与 lib/explore.client 一致）。
 * `query: '?raw'` + `import: 'default'`：避免 Vite 把 yaml 当 JS 模块加载（`?import`）。 */
const exploreModules = import.meta.glob<unknown>('/content/posts/*/explore.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
})
function slugHasExplore(slug: string): boolean {
  for (const k of Object.keys(exploreModules)) {
    const parts = k.split('/')
    if (parts[parts.length - 2] === slug) return true
  }
  return false
}

import siteYamlRaw from '/content/site.yaml?raw'
import faqsYamlRaw from '/content/faqs.yaml?raw'

const VALID_ANIM: AnimProfile[] = ['auto', 'data-narrative', 'architecture', 'story']
const VALID_STATUS: PostStatus[] = ['draft', 'published', 'scheduled']

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

function metaFromModule(modulePath: string, mod: MdxModule): Post | null {
  const fm = mod.frontmatter
  if (!fm?.title || !fm?.date) return null
  const anim = (fm.anim_profile as AnimProfile) || 'auto'
  const status = (fm.status as PostStatus) || 'published'
  const fileName = modulePath.split('/').slice(-2, -1)[0] // 目录名即 slug，与服务端 content.ts 对齐
  return {
    slug: (fm.slug as string) || slugify(String(fm.title)),
    title: String(fm.title),
    domain: (fm.domain as string) || 'general',
    date: String(fm.date).slice(0, 10),
    anim_profile: VALID_ANIM.includes(anim) ? anim : 'auto',
    status: VALID_STATUS.includes(status) ? status : 'published',
    excerpt: String(fm.excerpt || ''),
    body: '', // 正文由 mdxModules 的组件直接渲染，客户端不需要存原始 markdown
    fileName,
    hasExplore: slugHasExplore(fileName),
  }
}

export function getAllPosts(): Post[] {
  const posts: Post[] = []
  for (const [modulePath, mod] of Object.entries(postModules)) {
    const post = metaFromModule(modulePath, mod)
    if (post) posts.push(post)
  }
  return posts.filter((p) => p.status === 'published').sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getPostsByDomain(domain: string): Post[] {
  return getAllPosts().filter((p) => p.domain === domain)
}

export function getAllDomains(): Domain[] {
  const posts = getAllPosts()
  const map = new Map<string, Post[]>()
  for (const p of posts) {
    if (!map.has(p.domain)) map.set(p.domain, [])
    map.get(p.domain)!.push(p)
  }
  const out: Domain[] = []
  for (const [slug, list] of map) {
    out.push({ slug, posts: list, updatedAt: list[0]?.date || '' })
  }
  return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getWips(): Wip[] {
  // content/wip/ 目录当前不存在（与 SSG 版 fs.existsSync 行为一致）
  return []
}

export function getFAQs(): Faq[] {
  const parsed = yaml.load(faqsYamlRaw) as Faq[] | null
  return Array.isArray(parsed) ? parsed : []
}

export function getSite(): SiteConfig {
  return yaml.load(siteYamlRaw) as SiteConfig
}
