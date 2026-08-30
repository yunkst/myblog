export function resolveTarget(target: string, pathname: string): string {
  if (target.startsWith('#')) return pathname + target
  return target
}

export function isSamePage(target: string, pathname: string): boolean {
  const resolved = resolveTarget(target, pathname)
  const tPath = resolved.split('#')[0] || '/'
  return tPath === pathname
}

/** 文章路由前缀单点维护(v5 review fix):SSG getStaticPaths / PostList / 跨文章出口共用。
 * 统一带尾斜杠——与 routes.tsx getStaticPaths 产物一致(Post.tsx 旧实现无尾斜杠是漂移)。 */
export function blogPostPath(slug: string): string {
  return `/blog/${slug}/`
}
