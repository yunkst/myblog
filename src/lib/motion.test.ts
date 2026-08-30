import { describe, it, expect } from 'vitest'
import { prefersReducedMotion } from './motion'

describe('prefersReducedMotion', () => {
  it('vitest.setup.ts 的 matchMedia stub 返回 reduced → true', () => {
    expect(prefersReducedMotion()).toBe(true)
  })
})
