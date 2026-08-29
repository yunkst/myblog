import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AnswerProvider from './AnswerProvider'
import QuestionTree from './QuestionTree'
import type { ExploreNode } from '../../lib/types'

describe('<QuestionTree>', () => {
  it('渲染节点 label 并响应 click', () => {
    const calls: string[] = []
    const onAct: string[] = []
    const nodes: ExploreNode[] = [{ id: 'q1', label: '问题一', seek: 'lbl1' }]
    const fakeHandle = {
      seek: (l: string) => { calls.push(`seek:${l}`) },
      focus: () => {},
      play: () => {}, pause: () => {}, reset: () => {}, labels: () => [], currentLabel: () => null, kill: () => {},
    }
    const { container } = render(
      <MemoryRouter>
        <AnswerProvider>
          <QuestionTree
            nodes={nodes}
            handle={fakeHandle as any}
            activeId="q1"
            onActivate={(id) => onAct.push(id)}
          />
        </AnswerProvider>
      </MemoryRouter>,
    )
    const label = container.querySelector('.qnode-label')
    expect(label?.textContent).toBe('问题一')
    fireEvent.click(label!.closest('button')!)
    expect(calls).toContain('seek:lbl1')
    expect(onAct).toContain('q1')
  })

  it('placeholder 节点 className 包含 dim/placeholder', () => {
    const nodes: ExploreNode[] = [{ id: 'q1', label: '占位', status: 'placeholder', detail: '建设中' }]
    const fakeHandle = { seek: () => {}, focus: () => {}, play: () => {}, pause: () => {}, reset: () => {}, labels: () => [], currentLabel: () => null, kill: () => {} }
    const { container } = render(
      <MemoryRouter>
        <AnswerProvider>
          <QuestionTree nodes={nodes} handle={fakeHandle as any} activeId={null} onActivate={() => {}} />
        </AnswerProvider>
      </MemoryRouter>,
    )
    expect(container.querySelector('.qnode-placeholder')).toBeTruthy()
  })

  it('cross-link 节点渲染为 a 标签', () => {
    const nodes: ExploreNode[] = [{ id: 'q1', label: '外链', kind: 'cross-link', to: { post: 'p', anchor: '#x' }, preview: '摘要' }]
    const fakeHandle = { seek: () => {}, focus: () => {}, play: () => {}, pause: () => {}, reset: () => {}, labels: () => [], currentLabel: () => null, kill: () => {} }
    const { container } = render(
      <MemoryRouter>
        <AnswerProvider>
          <QuestionTree nodes={nodes} handle={fakeHandle as any} activeId={null} onActivate={() => {}} />
        </AnswerProvider>
      </MemoryRouter>,
    )
    const a = container.querySelector('a')
    expect(a?.getAttribute('href')).toBe('/blog/p/#x')
  })
})
