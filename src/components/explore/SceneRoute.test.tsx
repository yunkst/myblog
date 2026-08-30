import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ComponentType } from 'react'
import SceneRoute, { sceneModulesFor } from './SceneRoute'
import { ExploreConfigContext, ExploreRuntimeContext, type ExploreRuntime } from './AnswerContext'
import type { ExploreConfig } from '../../lib/types'

/**
 * SceneRoute 的场景模块表来自 import.meta.glob（Vite 静态分析，vitest ESM 下
 * 无法在 /content/posts/ 里落 tsx fixture 再被同一 glob 命中）。因此 glob 以
 * `sceneModulesFor(prefix)` 工厂导出：生产传真实 glob 表，测试注入 fixture 表。
 * （brief Step 1 二选一之「方案 1」：避免在 src 下镜像 /content 路径布局。）
 */

vi.mock('./Answer', () => ({
  default: ({ scene }: any) => <div data-testid="answer">{scene.id}</div>,
}))

const config: ExploreConfig = {
  title: 't', entry: 'q-a',
  scenes: [
    { id: 'q-a', label: 'A', demo: 'da' },
    { id: 'q-b', label: 'B', demo: 'db' },
  ],
}

function rt(activeId: string): ExploreRuntime {
  return {
    activeId, goTo: vi.fn(), onActivate: vi.fn(), firstActivation: true,
    back: vi.fn(), canBack: false, panelOpen: false, setPanelOpen: vi.fn(),
    onExit: vi.fn(), focusedExitIdx: null,
  }
}

/* fixture 场景组件（等价于 scenes/<id>.tsx 的 default export） */
const FixtureA = () => <div>场景A</div>
const FixtureB = () => <div>场景B</div>
const FIXTURE_MODULES: Record<string, { default: ComponentType }> = {
  '/content/posts/t1/scenes/q-a.tsx': { default: FixtureA },
  '/content/posts/t1/scenes/q-b.tsx': { default: FixtureB },
}

function renderRoute(slug: string, activeId: string) {
  return render(
    <ExploreConfigContext.Provider value={config}>
      <ExploreRuntimeContext.Provider value={rt(activeId)}>
        <SceneRoute slug={slug} modules={sceneModulesFor(FIXTURE_MODULES)} />
      </ExploreRuntimeContext.Provider>
    </ExploreConfigContext.Provider>,
  )
}

describe('SceneRoute', () => {
  it('activeId 决定挂载哪个场景组件', () => {
    const { container } = renderRoute('t1', 'q-b')
    expect(container.querySelector('[data-testid="answer"]')!.textContent).toBe('q-b')
  })

  it('无匹配场景渲染 null', () => {
    const { container } = renderRoute('t1', 'nope')
    expect(container.firstChild).toBeNull()
  })

  it('slug 不匹配（其它文章的场景文件）也渲染 null', () => {
    const { container } = renderRoute('other-post', 'q-a')
    expect(container.firstChild).toBeNull()
  })

  it('匹配场景时渲染 stage-stage 容器', () => {
    const { container } = renderRoute('t1', 'q-a')
    expect(container.querySelector('.stage-stage')).not.toBeNull()
  })
})
