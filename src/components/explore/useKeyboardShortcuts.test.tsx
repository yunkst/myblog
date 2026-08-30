import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

function Harness({ handlers, enabled }: { handlers: any; enabled?: boolean }) {
  useKeyboardShortcuts(handlers, enabled)
  return <div />
}

function mkHandlers() {
  return {
    onBack: vi.fn(), onNext: vi.fn(), onArrowUp: vi.fn(),
    onArrowDown: vi.fn(), onEnter: vi.fn(), onEsc: vi.fn(),
  }
}

describe('useKeyboardShortcuts', () => {
  it('← 触发 onBack', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(h.onBack).toHaveBeenCalledOnce()
  })

  it('→↑↓Enter/Esc 各触发对应 handler', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(h.onNext).toHaveBeenCalledOnce()
    expect(h.onArrowUp).toHaveBeenCalledOnce()
    expect(h.onArrowDown).toHaveBeenCalledOnce()
    expect(h.onEnter).toHaveBeenCalledOnce()
    expect(h.onEsc).toHaveBeenCalledOnce()
  })

  it('editable target（input/contenteditable）时全部失效', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(h.onBack).not.toHaveBeenCalled()
    expect(h.onEsc).not.toHaveBeenCalled()
  })

  it('enabled=false 时非 Esc 键失效，Esc 仍触发', () => {
    const h = mkHandlers()
    render(<Harness handlers={h} enabled={false} />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(h.onBack).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(h.onEsc).toHaveBeenCalledOnce()
  })

  it('卸载后注销监听', () => {
    const h = mkHandlers()
    const { unmount } = render(<Harness handlers={h} />)
    unmount()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(h.onBack).not.toHaveBeenCalled()
  })
})