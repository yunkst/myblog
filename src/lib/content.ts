import yaml from 'js-yaml'
import type { Post, Domain, Wip, Faq, SiteConfig, AnimProfile, PostStatus } from './types'
import faqsYamlRaw from '/content/faqs.yaml?raw'
import siteYamlRaw from '/content/site.yaml?raw'

/* v5：数据层单一化（SSG 与浏览器同源）。meta.yaml = 文章元数据；
 * article.mdx/gray-matter 已废除（spec §5）。 */
const metaYamls = import.meta.glob<string>('/content/posts/*/meta.yaml', {
  query: '?raw', import: 'default', eager: true,
})
const exploreYamls = import.meta.glob<string>('/content/posts/*/explore.yaml', {
  query: '?raw', import: 'default', eager: true,
})

const VALID_ANIM: AnimProfile[] = ['auto', 'data-narrative', 'architecture', 'story']
const VALID_STATUS: PostStatus[] = ['draft', 'published', 'scheduled']

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

function slugOf(modulePath: string): string {
  return modulePath.split('/').slice(-2, -1)[0]
}

function exploreEntryOf(slug: string): Post['exploreEntry'] {
  const key = Object.keys(exploreYamls).find((k) => slugOf(k) === slug)
  if (!key) return undefined
  try {
    const parsed = yaml.load(exploreYamls[key]) as any
    const entry = parsed?.scenes?.find((s: any) => s.id === parsed?.entry)
    if (parsed?.entry && entry?.label) return { id: String(parsed.entry), label: String(entry.label) }
  } catch { /* yaml 坏不阻塞列表；validate:explore 报 */ }
  return undefined
}

export function getAllPosts(): Post[] {
  const posts: Post[] = []
  for (const [modulePath, raw] of Object.entries(metaYamls)) {
    let data: any
    try { data = yaml.load(raw) } catch { console.warn(`[content] ${modulePath} yaml 解析失败`); continue }
    if (!data?.title || !data?.date) { console.warn(`[content] ${modulePath} 缺 title/date`); continue }
    const slug = slugOf(modulePath)
    const anim = (data.anim_profile as AnimProfile) || 'auto'
    const status = (data.status as PostStatus) || 'published'
    const date = data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date).slice(0, 10)
    posts.push({
      slug: (data.slug as string) || slugify(String(data.title)) || slug,
      title: String(data.title),
      domain: (data.domain as string) || 'general',
      date,
      anim_profile: VALID_ANIM.includes(anim) ? anim : 'auto',
      status: VALID_STATUS.includes(status) ? status : 'published',
      excerpt: String(data.excerpt || ''),
      fileName: slug,
      hasExplore: Object.keys(exploreYamls).some((k) => slugOf(k) === slug),
      exploreEntry: exploreEntryOf(slug),
    })
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
  // content/wip/ 目录当前不存在；客户端无 fs，等价于 SSG 版 fs.existsSync(WIP_DIR) 为 false 的行为。
  return []
}

export function getFAQs(): Faq[] {
  const parsed = yaml.load(faqsYamlRaw) as Faq[] | null
  return Array.isArray(parsed) ? parsed : []
}

export function getSite(): SiteConfig {
  return yaml.load(siteYamlRaw) as SiteConfig
}
