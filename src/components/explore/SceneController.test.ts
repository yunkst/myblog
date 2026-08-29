import { describe, it, expect } from 'vitest'
import gsap from 'gsap'  // 用真正的 gsap；jsdom 默认 reduced=true 但 timeline 工厂本身可用
import { createSceneHandle, type Scene } from './SceneController'

describe('SceneHandle', () => {
  // jsdom 里 gsap timeline 实例化没问题（matchMedia stub 写了 reduce=true，但这是 render 时 ui use，timeline 本身能造）
  // label 之间塞 tween 撑开时间轴：addLabel 默认追加在当前位置，无 tween 时三个 label 全在 t=0，无法区分
  const dummyScene: Scene = {
    focusable: ['a', 'b'],
    build() {
      const tl = gsap.timeline()
      tl.to({}, { duration: 1 }).addLabel('intro')
        .to({}, { duration: 1 }).addLabel('q1')
        .to({}, { duration: 1 }).addLabel('q2')
      return tl
    },
  }

  it('createSceneHandle 暴露 labels', () => {
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, ['a', 'b'])
    expect(h.labels()).toEqual(expect.arrayContaining(['intro', 'q1', 'q2']))
  })

  it('seek 跳到指定 label', () => {
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, [])
    h.seek('q1')
    expect(h.currentLabel()).toBe('q1')
  })

  it('focus 只往元素加 class，不影响 timeline', () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>'
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, ['a', 'b'])
    h.focus(['a'])
    expect(document.getElementById('a')!.classList.contains('scene-focus')).toBe(true)
    expect(document.getElementById('b')!.classList.contains('scene-focus')).toBe(false)
    h.focus(['a']) // idempotent
    expect(document.getElementById('a')!.classList.contains('scene-focus')).toBe(true)
  })

  it('focus([]) 清除所有高亮', () => {
    document.body.innerHTML = '<div id="a"></div>'
    const tl = dummyScene.build()
    const h = createSceneHandle(tl, ['a'])
    h.focus(['a'])
    h.focus([])
    expect(document.getElementById('a')!.classList.contains('scene-focus')).toBe(false)
  })
})
