import React from 'react'
import type { RouteRecord } from 'vite-react-ssg'

export const routes: RouteRecord[] = [
  {
    path: '/',
    Component: React.lazy(() => import('./App')),
    children: [
      { index: true, Component: React.lazy(() => import('./pages/Home')) },
    ],
  },
]
