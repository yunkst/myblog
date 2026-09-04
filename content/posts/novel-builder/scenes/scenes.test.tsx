import type { ReactElement } from 'react'
// scenes.test.tsx — scenes/*.tsx ↔ explore.yaml 对齐 + 渲染冒烟
// 与 ai-digital-employee/scenes/scenes.test.tsx 同一约定：
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
import FAddBook from './f-add-book'
import FRead from './f-read'
import FOcr from './f-ocr'
import FRewrite from './f-rewrite'
import FSurgical from './f-surgical'
import FWrite from './f-write'
import FAmmo from './f-ammo'
import PScriptGen from './p-script-gen'
import PExtract from './p-extract'
import POcr from './p-ocr'
import PAgentTools from './p-agent-tools'
import PContext from './p-context'
import PToolMap from './p-tool-map'
import PSubagent from './p-subagent'

const DIR = join(__dirname)
const yamlRaw = readFileSync(join(DIR, '../explore.yaml'), 'utf-8')
const config = parseExploreYaml(yamlRaw)
if (!config.ok) throw new Error(config.error)

const sceneIds = config.value.scenes.map((s) => s.id)
const files = readdirSync(DIR).filter((f) => f.endsWith('.tsx') && f !== 'scenes.test.tsx')

const MODULES: Record<string, () => ReactElement> = {
  'q-intro': QIntro,
  'f-add-book': FAddBook,
  'f-read': FRead,
  'f-ocr': FOcr,
  'f-rewrite': FRewrite,
  'f-surgical': FSurgical,
  'f-write': FWrite,
  'f-ammo': FAmmo,
  'p-script-gen': PScriptGen,
  'p-extract': PExtract,
  'p-ocr': POcr,
  'p-agent-tools': PAgentTools,
  'p-context': PContext,
  'p-tool-map': PToolMap,
  'p-subagent': PSubagent,
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
    setCurrentSlug('novel-builder')
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
