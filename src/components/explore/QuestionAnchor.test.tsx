import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AnswerProvider from './AnswerProvider'
import QuestionAnchor from './QuestionAnchor'

describe('<QuestionAnchor>', () => {
  it('渲染为指向探索视图的锚链', () => {
    const { container } = render(
      <AnswerProvider>
        <QuestionAnchor id="q-foo" label="看动画" />
      </AnswerProvider>,
    )
    const a = container.querySelector('a')
    expect(a).toBeTruthy()
    expect(a!.getAttribute('href')).toBe('./explore/#q-foo')
    expect(a!.textContent).toContain('看动画')
  })

  it('无 label 时降级显示 id', () => {
    const { container } = render(
      <AnswerProvider>
        <QuestionAnchor id="q-bar" />
      </AnswerProvider>,
    )
    expect(container.querySelector('a')!.textContent).toContain('q-bar')
  })
})