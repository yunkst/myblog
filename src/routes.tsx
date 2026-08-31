import React from 'react'
import type { ComponentType } from 'react'
import type { RouteRecord } from 'vite-react-ssg'
import { getAllPosts, getAllDomains } from './lib/content'
import { blogPostPath } from './lib/nav'

/* React.lazy 返回 LazyExoticComponent，RouteRecord.Component 期望 Promise<{default: ComponentType}>；
 * 保留这种包装方式——SSG 阶段能正确产出每个路由的静态 HTML。 */
const lazyRoute = (
  importer: () => Promise<{ default: ComponentType<any> }>,
): React.LazyExoticComponent<ComponentType<any>> => React.lazy(importer)

export const routes: RouteRecord[] = [
  {
    path: '/',
    Component: lazyRoute(() => import('./App')),
    children: [
      { index: true, Component: lazyRoute(() => import('./pages/Home')) },
      {
        path: 'blog/:slug',
        Component: lazyRoute(() => import('./pages/Post')),
        getStaticPaths: () => getAllPosts().map((p) => blogPostPath(p.slug)),
      },
      {
        /* v8 平铺阅读页（双形态共存）：仅 hasExplore 的文章有平铺版 */
        path: 'blog/:slug/flat',
        Component: lazyRoute(() => import('./pages/FlatPost')),
        getStaticPaths: () =>
          getAllPosts()
            .filter((p) => p.hasExplore)
            .map((p) => `${blogPostPath(p.slug)}flat/`),
      },
      {
        path: 'domain/:slug',
        Component: lazyRoute(() => import('./pages/Domain')),
        getStaticPaths: () => getAllDomains().map((d) => `/domain/${encodeURIComponent(d.slug)}/`),
      },
    ],
  },
]