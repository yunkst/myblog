/**
 * v5（spec §7.1）Post 薄壳。
 *
 * - 不再 import mdxModules、ExploreRouter、StageNav、SceneRoute——统一由 Stage 接线。
 * - 文章存在 → post.hasExplore ? <Stage post={post}/> : 「敬请期待」占位；
 * - 文章不存在 → 「文章不存在」占位（404 smoke 保留）。
 * - T7 占位的 <main.stage-frame data-article-slug=...> 现归 Stage 渲染。
 * - 列表页相关 list/prev/next 在 v5 视觉重构后未启用导航条（brief §6 计划 T9 接管），
 *   此处不再计算（spec §7.1 明确 Post 只关心 hasExplore 分流）。
 */
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { getPost, getAllPosts } from '../lib/content'
import { blogPostPath } from '../lib/nav'
import Stage from './Stage'

export default function Component() {
  const { slug } = useParams()
  const post = useMemo(() => getPost(slug || ''), [slug])

  if (!post) {
    return (
      <>
        <Head><title>文章不存在</title></Head>
        <main className="post-wrap"><p>文章不存在。</p></main>
      </>
    )
  }

  if (post.hasExplore) {
    return (
      <>
        <Head>
          <title>{post.title} · {post.domain}</title>
          <meta name="description" content={post.excerpt} />
        </Head>
        <Stage post={post} />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{post.title} · {post.domain}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <main className="post-wrap" data-article-slug={post.slug}>
        <p>这篇文章还在写作中，敬请期待。</p>
      </main>
    </>
  )
}

export const entry = 'src/pages/Post.tsx'

export function getStaticPaths() {
  return getAllPosts().map((p) => blogPostPath(p.slug))
}
