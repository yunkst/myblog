import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSceneClipApi, registerSceneClip, unregisterSceneClip, type SceneClipApi } from './sceneClipRegistry'

/** v7 Task 3（demo API promise 化）：SceneClipApi 新形状——
 * play() 返回 Promise<void>、新增 finished() 判定。 */
function makeApi(): SceneClipApi {
  return {
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    replay: vi.fn(),
    finished: vi.fn(() => false),
  }
}

describe('sceneClipRegistry', () => {
  beforeEach(() => {
    unregisterSceneClip('message-flood')
    unregisterSceneClip('d-a')
    unregisterSceneClip('d-b')
  })

  it('注册后可取回', () => {
    const api = makeApi()
    registerSceneClip('message-flood', api)
    expect(getSceneClipApi('message-flood')).toBe(api)
    unregisterSceneClip('message-flood')
    expect(getSceneClipApi('message-flood')).toBeUndefined()
  })

  it('未注册的 demo 名返回 undefined', () => {
    expect(getSceneClipApi('never-registered')).toBeUndefined()
  })

  it('registerSceneClip 返回的注销闭包删除对应 demo 名', () => {
    const api = makeApi()
    const unregister = registerSceneClip('d-a', api)
    expect(getSceneClipApi('d-a')).toBe(api)
    unregister()
    expect(getSceneClipApi('d-a')).toBeUndefined()
  })

  it('同名重复注册覆盖旧实例（防御多实例）', () => {
    const a = makeApi()
    const b = makeApi()
    registerSceneClip('d-b', a)
    registerSceneClip('d-b', b)
    expect(getSceneClipApi('d-b')).toBe(b)
    const unregister = registerSceneClip('d-b', b)
    unregister()
    expect(getSceneClipApi('d-b')).toBeUndefined()
  })
})
