import yaml from 'js-yaml'
import type { Post, Domain, Wip, Faq, SiteConfig, AnimProfile, PostStatus, ExploreConfig } from './types'
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

/** 按目录名 slug 反查 explore.yaml 并解析(Stage 页数据源;无配置/解析失败 → null)。
 * v5 review fix:从 Stage.tsx 收敛到数据层——glob 表与解析单点维护,结果缓存。 */
const exploreConfigCache = new Map<string, ExploreConfig | null>()
export function getExploreConfig(slug: string): ExploreConfig | null {
  if (exploreConfigCache.has(slug)) return exploreConfigCache.get(slug)!
  const key = Object.keys(exploreYamls).find((k) => slugOf(k) === slug)
  if (!key) return null
  try {
    const parsed = yaml.load(exploreYamls[key]) as ExploreConfig | null
    const out = parsed && Array.isArray(parsed.scenes) ? parsed : null
    exploreConfigCache.set(slug, out)
    return out
  } catch {
    exploreConfigCache.set(slug, null)
    return null
  }
}

let cachedPosts: Post[] | null = null
export function getAllPosts(): Post[] {
  if (cachedPosts) return cachedPosts
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
      slug,
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
  cachedPosts = posts.filter((p) => p.status === 'published').sort((a, b) => (a.date < b.date ? 1 : -1))
  return cachedPosts
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

let cachedFaqs: Faq[] | null = null
export function getFAQs(): Faq[] {
  if (cachedFaqs === null) {
    const parsed = yaml.load(faqsYamlRaw) as Faq[] | null
    cachedFaqs = Array.isArray(parsed) ? parsed : []
  }
  return cachedFaqs
}

let cachedSite: SiteConfig | null = null
export function getSite(): SiteConfig {
  if (cachedSite === null) cachedSite = yaml.load(siteYamlRaw) as SiteConfig
  return cachedSite
}
