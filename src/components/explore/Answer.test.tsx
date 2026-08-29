import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import Answer, { ExploreConfigContext } from './Answer'
import type { ExploreConfig } from '../../lib/types'

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [{
    id: 'q-a', label: 'A', demo: 'd',
    features: [{ text: '看 B', to: 'q-b' }],
    questions: [{ text: '跨文章', to: { post: 'other', scene: 'entry' } }],
  }, { id: 'q-b', label: 'B', demo: 'd' }],
}

describe('Answer（v2 原位渲染）', () => {
  it('渲染为带 id 的 answer-block，子内容可见', () => {
    render(<Answer id="q-problem"><p>正文段落</p></Answer>)
    const block = document.getElementById('q-problem')
    expect(block).not.toBeNull()
    expect(block?.className).toContain('answer-block')
    expect(screen.getByText('正文段落')).toBeInTheDocument()
  })

  it('Context 提供 config 时，按 id 自动渲染 features + questions 两组 chips', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer id="q-a"><p>正文</p></Answer>
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    const block = document.getElementById('q-a')
    expect(block?.querySelectorAll('.exit-chips-features .exit-chip')).toHaveLength(1)
    expect(block?.querySelectorAll('.exit-chips-questions .exit-chip')).toHaveLength(1)
    expect(block?.querySelector('.exit-chips-features .exit-chip')?.getAttribute('href')).toBe('#q-b')
  })

  it('yaml 找不到对应 id 的场景时，只渲染 children，无 chips', () => {
    render(
      <MemoryRouter>
        <ExploreConfigContext.Provider value={config}>
          <Answer id="not-a-scene"><p>孤儿段落</p></Answer>
        </ExploreConfigContext.Provider>
      </MemoryRouter>,
    )
    expect(document.querySelector('.exit-chip')).toBeNull()
  })
})