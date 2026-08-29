// scene.test.tsx — ai-it-system demos smoke 测试（与 ai-digital-employee/scene.test.tsx 对称）
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { demos } from './scene'
import { pipelineNodes } from './scene-data'

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

// F1 修复烟测：#ci-light 是 SVG <rect>，必须用 attr.fill 才能让浏览器渲染「灰转绿」。
// jsdom 里挂一份真实 SVG DOM，让 build() 通过 querySelector 找到节点并 setAttribute('fill', ...)。
describe('badcase-journey ci-light 灰转绿（SVG attr）', () => {
  const SVG_NS = 'http://www.w3.org/2000/svg'

  function appendSvgRect(id: string): SVGRectElement {
    if (!document.querySelector('svg[data-test-host]')) {
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('data-test-host', '1')
      document.body.appendChild(svg)
    }
    const host = document.querySelector('svg[data-test-host]')!
    const el = document.createElementNS(SVG_NS, 'rect') as SVGRectElement
    el.setAttribute('id', id)
    host.appendChild(el)
    return el
  }

  function appendSvgText(id: string): SVGTextElement {
    if (!document.querySelector('svg[data-test-host]')) {
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('data-test-host', '1')
      document.body.appendChild(svg)
    }
    const host = document.querySelector('svg[data-test-host]')!
    const el = document.createElementNS(SVG_NS, 'text') as SVGTextElement
    el.setAttribute('id', id)
    host.appendChild(el)
    return el
  }

  beforeAll(() => {
    // build() 用到的所有 selector
    for (const n of pipelineNodes) appendSvgRect(n.id)
    appendSvgRect('ci-light')
    appendSvgText('scene-subtitle')
    appendSvgText('report-bubble')
    appendSvgText('merged-tag')
  })

  afterAll(() => {
    const host = document.querySelector('svg[data-test-host]')
    host?.parentNode?.removeChild(host)
  })

  it('timeline 推进到终态后，#ci-light 的 SVG attr.fill === #0E6E5C（绿），且未写入 backgroundColor', () => {
    const tl = demos['badcase-journey'].build()
    tl.progress(1) // 推进到末态，触发所有 tween/set

    const el = document.getElementById('ci-light') as SVGRectElement | null
    expect(el).not.toBeNull()
    expect(el!.getAttribute('fill')).toBe('#0E6E5C')

    // F1 防御性回归：不允许再走 CSS backgroundColor（SVG rect 不渲染）
    const styleAttr = el!.getAttribute('style') || ''
    expect(styleAttr.toLowerCase()).not.toContain('background-color')

    tl.kill()
  })
})
