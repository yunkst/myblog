import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ArchDiagram, { DEMO_ARCH } from './ArchDiagram'

describe('ArchDiagram', () => {
  it('渲染节点与连线（节点数 = 数据节点数）', () => {
    const { container } = render(<ArchDiagram {...DEMO_ARCH} />)
    expect(container.querySelectorAll('.ag-node').length).toBe(DEMO_ARCH.nodes.length)
    expect(container.querySelectorAll('.ag-edge').length).toBe(DEMO_ARCH.edges.length)
  })
})
