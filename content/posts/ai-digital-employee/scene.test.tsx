// scene.test.tsx — ai-digital-employee demos smoke 测试（spec §11.2）
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('ai-digital-employee demos', () => {
  it('13 个 demo 齐全且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual([
      'audit-trail', 'badge-metaphor', 'dev-flow', 'four-prerequisites', 'limits',
      'message-flood', 'openclaw-pitfalls', 'protocol-repo', 'threat-model',
      'tiered-confirm', 'tiered-execution', 'tool-search', 'unified-identity',
    ])
    for (const [k, v] of Object.entries(demos)) expect(v.name).toBe(k)
  })

  it('每个 build() 返回正时长 timeline（jsdom 下 gsap 可运行）', () => {
    for (const v of Object.values(demos)) {
      const tl = v.build()
      expect(tl.duration()).toBeGreaterThan(0)
      tl.kill()
    }
  })
})
