import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import Answer from './Answer'

describe('Answer（v2 原位渲染）', () => {
  it('渲染为带 id 的 answer-block，子内容可见', () => {
    render(<Answer id="q-problem"><p>正文段落</p></Answer>)
    const block = document.getElementById('q-problem')
    expect(block).not.toBeNull()
    expect(block?.className).toContain('answer-block')
    expect(screen.getByText('正文段落')).toBeInTheDocument()
  })
})
