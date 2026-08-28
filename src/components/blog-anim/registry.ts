import type { ComponentType } from 'react'
import Typewriter from './Typewriter'
import Counter from './Counter'
import ArchDiagram from './ArchDiagram'

export const registry: Record<string, ComponentType<any>> = {
  Typewriter,
  Counter,
  ArchDiagram,
}
