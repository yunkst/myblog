import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { MDXProvider } from '@mdx-js/react'
import AnswerProvider from '../components/explore/AnswerProvider'
import Answer from '../components/explore/Answer'
import QuestionAnchor from '../components/explore/QuestionAnchor'
import SceneClip from '../components/explore/SceneClip'
import ExploreView from '../components/explore/ExploreView'
import { getPost } from '../lib/content'
import { getExplore, listExplorable } from '../lib/explore'
import { registry } from '../components/blog-anim/registry'
import type { Scene } from '../components/explore/SceneController'

/* 构建期：所有文章目录下的 scene.tsx 都编译进来。eager 是为了 SSR 同步可用 */
const sceneModules = import.meta.glob<{ default: Scene }>(
  '/content/posts/*/scene.tsx',
  { eager: true },
)

/* 构建期：所有文章目录下的 article.mdx 都编译进来（与 Post.tsx 同一份 glob 的复制），
 * 用于在探索视图把正文里所有 <Answer> 也渲染进 DOM、注册进 AnswerProvider。
 * （`.explore-answers` 容器 CSS display:none 隐藏——DOM 必须存在，组件才渲染、才注册。） */
const mdxModules = import.meta.glob<{ default: React.ComponentType }>(
  '/content/posts/*/article.mdx',
  { eager: true },
)

function pickScene(slug: string): Scene | null {
  const key = Object.keys(sceneModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  return sceneModules[key].default
}

function pickArticleBody(slug: string): React.ComponentType | null {
  const key = Object.keys(mdxModules).find((k) => k.split('/').slice(-2, -1)[0] === slug)
  if (!key) return null
  return mdxModules[key].default
}

export default function Component() {
  const { slug = '' } = useParams()
  const post = useMemo(() => getPost(slug), [slug])
  const config = useMemo(() => getExplore(slug), [slug])
  const scene = useMemo(() => pickScene(slug), [slug])
  const Body = useMemo(() => pickArticleBody(slug), [slug])
  const initialHash = typeof window !== 'undefined'
    ? window.location.hash.replace(/^#/, '') || null
    : null

  if (!post || !config) {
    return (
      <main className="explore-wrap">
        <p>这篇博客没有探索视图。<Link to={`/blog/${slug}/`}>← 回到阅读</Link></p>
      </main>
    )
  }

  return (
    <MDXProvider components={{ ...registry, Answer, QuestionAnchor, SceneClip }}>
      <AnswerProvider>
        <Head>
          <title>{config.title} · 探索视图</title>
        </Head>
        <main className="explore-wrap">
          <header className="explore-head">
            <Link to={`/blog/${slug}/`} className="explore-back">← 回到阅读</Link>
            <h1>{config.title}</h1>
          </header>
          {/* key=slug：控制器裁决 1 —— SceneStage 内部 useEffect deps=[]，scene 切换不重建 timeline，
              必须靠 remount 强制重建，防旧 scene 的 timeline 跨文章复用。 */}
          <ExploreView
            key={slug}
            nodes={config.nodes}
            scene={scene}
            seekRoot={config.seek_root}
            initialHash={initialHash}
            slug={slug}
          />
          {/* 把正文里所有 <Answer> 也渲染进 DOM（给 AnswerProvider 注入 AnswerMap）。
              CSS 用 .explore-answers{display:none} 隐藏这一区——探索视图不再展示正文段落，
              但 DOM 必须存在，否则 Answer 组件不渲染、AnswerProvider 收不到内容。 */}
          <div className="explore-answers" aria-hidden="true">
            {Body ? <Body /> : null}
          </div>
        </main>
      </AnswerProvider>
    </MDXProvider>
  )
}

export const entry = 'src/pages/Explore.tsx'

export function getStaticPaths() {
  return listExplorable().map((slug) => `/blog/${slug}/explore/`)
}
