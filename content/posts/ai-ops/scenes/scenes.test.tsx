import type { ReactElement } from 'react'
// scenes.test.tsx — scenes/*.tsx ↔ explore.yaml 对齐 + 渲染冒烟
// 与 study-buddy/scenes/scenes.test.tsx 同一约定：
// 文件集合动态 readdirSync；渲染冒烟静态 import；SceneClip demo 名由 yaml 单源派生。
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { parseExploreYaml } from '@/lib/explore'
import { setCurrentSlug } from '@/components/explore/SceneClip'
import { SceneDemoContext } from '@/components/explore/AnswerContext'
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

import QIntro from './q-intro'
import QCage from './q-cage'
import QSecrets from './q-secrets'
import QPlatform from './q-platform'
import QInspector from './q-inspector'
import QCost from './q-cost'
import QAfterword from './q-afterword'

const DIR = join(__dirname)
const yamlRaw = readFileSync(join(DIR, '../explore.yaml'), 'utf-8')
const config = parseExploreYaml(yamlRaw)
if (!config.ok) throw new Error(config.error)

const sceneIds = config.value.scenes.map((s) => s.id)
const files = readdirSync(DIR).filter((f) => f.endsWith('.tsx') && f !== 'scenes.test.tsx')

const MODULES: Record<string, () => ReactElement> = {
  'q-intro': QIntro,
  'q-cage': QCage,
  'q-secrets': QSecrets,
  'q-platform': QPlatform,
  'q-inspector': QInspector,
  'q-cost': QCost,
  'q-afterword': QAfterword,
}

describe('scenes/*.tsx 与 explore.yaml 对齐 + 渲染', () => {
  it('文件集合与 yaml scenes[].id 完全一致', () => {
    const fileIds = files.map((f) => basename(f, '.tsx')).sort()
    expect(fileIds).toEqual([...sceneIds].sort())
  })

  it('q-*.tsx 不再硬编码 demo prop——demo 名由 yaml scenes[].demo 单一真相', () => {
    for (const f of files) {
      const src = readFileSync(join(DIR, f), 'utf-8')
      expect(src).not.toMatch(/SceneClip\s+demo=/)
    }
  })

  it.each(Object.keys(MODULES))('%s 渲染出非空内容（SceneClip 经 SceneDemoContext 拿到 yaml demo）', (id) => {
    setCurrentSlug('ai-ops')
    const Mod = MODULES[id]
    const yamlScene = config.value.scenes.find((s) => s.id === id)
    const { container, unmount } = render(
      <MemoryRouter>
        <SceneDemoContext.Provider value={yamlScene?.demo ?? null}>
          <Mod />
        </SceneDemoContext.Provider>
      </MemoryRouter>,
    )
    expect(container.innerHTML.length).toBeGreaterThan(0)
    if (yamlScene?.demo) {
      expect(container.querySelector(`[data-scene-clip-demo="${yamlScene.demo}"]`)).not.toBeNull()
    }
    unmount()
  })
})
