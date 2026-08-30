import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSceneClipApi, registerSceneClip, unregisterSceneClip } from './sceneClipRegistry'

describe('sceneClipRegistry', () => {
  beforeEach(() => {
    unregisterSceneClip('message-flood')
    unregisterSceneClip('d-a')
    unregisterSceneClip('d-b')
  })

  it('注册后可取回', () => {
    const api = { play: vi.fn(), pause: vi.fn(), replay: vi.fn() }
    registerSceneClip('message-flood', api)
    expect(getSceneClipApi('message-flood')).toBe(api)
    unregisterSceneClip('message-flood')
    expect(getSceneClipApi('message-flood')).toBeUndefined()
  })

  it('未注册的 demo 名返回 undefined', () => {
    expect(getSceneClipApi('never-registered')).toBeUndefined()
  })

  it('registerSceneClip 返回的注销闭包删除对应 demo 名', () => {
    const api = { play: vi.fn(), pause: vi.fn(), replay: vi.fn() }
    const unregister = registerSceneClip('d-a', api)
    expect(getSceneClipApi('d-a')).toBe(api)
    unregister()
    expect(getSceneClipApi('d-a')).toBeUndefined()
  })

  it('同名重复注册覆盖旧实例（防御多实例）', () => {
    const a = { play: vi.fn(), pause: vi.fn(), replay: vi.fn() }
    const b = { play: vi.fn(), pause: vi.fn(), replay: vi.fn() }
    registerSceneClip('d-b', a)
    registerSceneClip('d-b', b)
    expect(getSceneClipApi('d-b')).toBe(b)
    const unregister = registerSceneClip('d-b', b)
    unregister()
    expect(getSceneClipApi('d-b')).toBeUndefined()
  })
})
