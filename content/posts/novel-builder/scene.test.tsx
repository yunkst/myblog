// scene.test.tsx — novel-builder demos smoke 测试（spec §11.2）
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('novel-builder demos', () => {
  it('15 个 demo 齐全且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual([
      'add-book-flow', 'agent-tools-principle', 'ammo-arsenal', 'context-principle',
      'extract-principle', 'intro-overview', 'ocr-principle',
      'ocr-restore', 'read-clean', 'rewrite-flow', 'script-gen-principle',
      'subagent-principle', 'surgical-edit', 'tool-map', 'write-flow',
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
