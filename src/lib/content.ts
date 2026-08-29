import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import type { Post, Domain, Wip, Faq, SiteConfig, AnimProfile, PostStatus } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')
const WIP_DIR = path.join(CONTENT_DIR, 'wip')

const VALID_ANIM: AnimProfile[] = ['auto', 'data-narrative', 'architecture', 'story']
const VALID_STATUS: PostStatus[] = ['draft', 'published', 'scheduled']

function today(): string {
  // 构建期固定日期，避免每天重新生成
  return process.env.BUILD_DATE || new Date().toISOString().slice(0, 10)
}

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '')
}

function readPostFile(slug: string): { file: string; raw: string } | null {
  const file = path.join(POSTS_DIR, slug, 'article.mdx')
  if (!fs.existsSync(file)) return null
  return { file, raw: fs.readFileSync(file, 'utf-8') }
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  const slugs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const posts: Post[] = []
  for (const slug of slugs) {
    const r = readPostFile(slug)
    if (!r) continue
    const { data, content } = matter(r.raw)
    if (!data.title || !data.date) {
      console.warn(`[content] 跳过 ${slug}: 缺 title 或 date`)
      continue
    }
    const normSlug = (data.slug as string) || slugify(String(data.title))
    const domain = (data.domain as string) || 'general'
    const anim = (data.anim_profile as AnimProfile) || 'auto'
    const status = (data.status as PostStatus) || 'published'
    if (!VALID_ANIM.includes(anim)) console.warn(`[content] ${slug}: anim_profile=${anim} 非法，回退 auto`)
    if (!VALID_STATUS.includes(status)) console.warn(`[content] ${slug}: status=${status} 非法，回退 published`)
    posts.push({
      slug: normSlug,
      title: String(data.title),
      domain,
      date: String(data.date).slice(0, 10),
      anim_profile: VALID_ANIM.includes(anim) ? anim : 'auto',
      status: VALID_STATUS.includes(status) ? status : 'published',
      excerpt: String(data.excerpt || ''),
      body: content,
      fileName: normSlug, // 目录名即 slug；Post.tsx 用它映射 mdxModules
      hasExplore: fs.existsSync(path.join(POSTS_DIR, slug, 'explore.yaml')),
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
  if (!fs.existsSync(WIP_DIR)) return []
  const files = fs.readdirSync(WIP_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
  const wips: Wip[] = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(WIP_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    wips.push({
      slug: String(data.slug || file.replace(/\.(mdx|md)$/, '')),
      title: String(data.title || '未命名'),
      status: String(data.status || 'in-progress'),
      progress: Number(data.progress ?? 0),
      thoughts: content.trim(),
    })
  }
  return wips
}

export function getFAQs(): Faq[] {
  const file = path.join(CONTENT_DIR, 'faqs.yaml')
  if (!fs.existsSync(file)) return []
  const parsed = yaml.load(fs.readFileSync(file, 'utf-8')) as Faq[] | null
  return Array.isArray(parsed) ? parsed : []
}

export function getSite(): SiteConfig {
  const file = path.join(CONTENT_DIR, 'site.yaml')
  const parsed = yaml.load(fs.readFileSync(file, 'utf-8')) as SiteConfig
  return parsed
}

void today
