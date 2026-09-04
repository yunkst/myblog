// scene.test.tsx — demos smoke（模板自带，新文章复制后改 describe 名即可）
import { describe, it, expect } from 'vitest'
import { demos } from './scene'

describe('_template demos', () => {
  it('demo 齐全且 name 与键一致', () => {
    const keys = Object.keys(demos).sort()
    expect(keys).toEqual(['tpl-detail', 'tpl-overview'])
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
