import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import AnswerProvider, { type AnswerMap } from './AnswerProvider'
import Answer from './Answer'

describe('<Answer>', () => {
  it('渲染 children 与指定 id 关联的内容', () => {
    const map: AnswerMap = {}
    render(
      <AnswerProvider onRegister={(id, el) => { map[id] = el.innerHTML }}>
        <Answer id="q1">这是答案正文</Answer>
      </AnswerProvider>,
    )
    expect(map.q1).toContain('这是答案正文')
  })

  it('id 缺失时打印警告并不注册', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <AnswerProvider onRegister={() => {}}>
        <Answer>无 id 的内容</Answer>
      </AnswerProvider>,
    )
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})