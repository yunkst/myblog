import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import HistoryPanel from './HistoryPanel'

const stack = [
  { sceneId: 'q-problem' },
  { sceneId: 'q-badge-metaphor' },
  { sceneId: 'q-tiered-confirm' },
]
const exits = [
  { text: '主线下一幕', to: 'q-why-not-openclaw' },
  { text: '支线 A', to: 'q-limits' },
]

describe('HistoryPanel', () => {
  it('open=false 时不渲染任何 DOM', () => {
    const { container } = render(
      <HistoryPanel open={false} onClose={() => {}} stack={stack} onJumpTo={() => {}}>
        <div data-testid="exits">{exits.length} exits</div>
      </HistoryPanel>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('渲染出口树 slot + 访问历史', () => {
    render(
      <HistoryPanel open onClose={() => {}} stack={stack} onJumpTo={() => {}}>
        <div data-testid="exits">{exits.length} exits</div>
      </HistoryPanel>,
    )
    expect(screen.getByTestId('exits')).toBeInTheDocument()
    // 访问历史里看到三个幕 id
    expect(screen.getByText('q-problem')).toBeInTheDocument()
    expect(screen.getByText('q-tiered-confirm')).toBeInTheDocument()
  })

  it('点击关闭按钮调 onClose', () => {
    const onClose = vi.fn()
    render(
      <HistoryPanel open onClose={onClose} stack={[]} onJumpTo={() => {}}>
        <span />
      </HistoryPanel>,
    )
    fireEvent.click(screen.getByLabelText(/关闭/))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击历史项调 onJumpTo(idx)', () => {
    const onJumpTo = vi.fn()
    render(
      <HistoryPanel open onClose={() => {}} stack={stack} onJumpTo={onJumpTo}>
        <span />
      </HistoryPanel>,
    )
    // 点击 q-problem → idx 0
    fireEvent.click(screen.getByText('q-problem'))
    expect(onJumpTo).toHaveBeenCalledWith(0)
    // 点击 q-tiered-confirm → idx 2
    fireEvent.click(screen.getByText('q-tiered-confirm'))
    expect(onJumpTo).toHaveBeenCalledWith(2)
  })

  it('点击 backdrop 关闭', () => {
    const onClose = vi.fn()
    const { container } = render(
      <HistoryPanel open onClose={onClose} stack={stack} onJumpTo={() => {}}>
        <span />
      </HistoryPanel>,
    )
    fireEvent.click(container.querySelector('.history-panel__backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('历史空栈时不渲染 ol 但面板仍可见', () => {
    render(
      <HistoryPanel open onClose={() => {}} stack={[]} onJumpTo={() => {}}>
        <span data-testid="exits" />
      </HistoryPanel>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.querySelector('.history-panel__history ol')).toBeEmptyDOMElement()
  })
})
