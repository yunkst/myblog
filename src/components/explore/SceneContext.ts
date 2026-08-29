import { createContext, useContext } from 'react'
import type { SceneHandle } from './SceneController'

export const SceneCtx = createContext<SceneHandle | null>(null)

export function useScene(): SceneHandle | null {
  return useContext(SceneCtx)
}
