// scene.test.tsx — mybi demos smoke 测试(spec §11.2,与 ai-ops 同一约定)
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('mybi demos', () => {
  it('8 个 demo 齐全且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual([
      'bi-overview', 'end-to-end', 'error-loop', 'schema-contract',
      'semantic-search', 'sentence-to-board', 'spec-render', 'sql-gate',
    ])
    for (const [k, v] of Object.entries(demos)) expect(v.name).toBe(k)
  })

  it('每个 build() 返回正时长 timeline(jsdom 下 gsap 可运行)', () => {
    for (const v of Object.values(demos)) {
      const tl = v.build()
      expect(tl.duration()).toBeGreaterThan(0)
      tl.kill()
    }
  })
})