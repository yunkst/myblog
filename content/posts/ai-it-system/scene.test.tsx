// scene.test.tsx — ai-it-system demos smoke 测试（与 ai-digital-employee/scene.test.tsx 对称）
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('ai-it-system demos', () => {
  it('badcase-journey 单一 demo 存在且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual(['badcase-journey'])
    expect(demos['badcase-journey'].name).toBe('badcase-journey')
  })

  it('build() 返回的 timeline 落在 5–7s 区间（叙事节拍区间）', () => {
    const tl = demos['badcase-journey'].build()
    const d = tl.duration()
    expect(d).toBeGreaterThanOrEqual(5)
    expect(d).toBeLessThanOrEqual(7)
    tl.kill()
  })
})