// scene.test.tsx — ai-ops demos smoke 测试（spec §11.2）
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('ai-ops demos', () => {
  it('7 个 demo 齐全且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual([
      'cost-tiers', 'gitops-cage', 'inspector-phases', 'next-step',
      'ops-overview', 'platform-stack', 'secret-pipeline',
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
