import React from 'react'
import type { ComponentType } from 'react'
import type { RouteRecord } from 'vite-react-ssg'
import { getAllPosts, getAllDomains } from './lib/content'

/* React.lazy 返回 LazyExoticComponent，RouteRecord.Component 期望 Promise<{default: ComponentType}>；包装一次保留 Task 1 的懒加载约定 */
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
        getStaticPaths: () => getAllPosts().map((p) => `/blog/${p.slug}`),
      },
      {
        path: 'domain/:slug',
        Component: lazyRoute(() => import('./pages/Domain')),
        getStaticPaths: () => getAllDomains().map((d) => `/domain/${encodeURIComponent(d.slug)}`),
      },
    ],
  },
]