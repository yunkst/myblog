// scenes.test.tsx — scenes/*.tsx ↔ explore.yaml 对齐 + 渲染冒烟（Task 6）
//
// RED→GREEN 策略：文件集合一致性测试动态 readdirSync（真实目录真相）；
// 渲染冒烟静态 import 15 个模块（require 在 vitest ESM 下不可用，brief 已授权改法）。
// v6 review：demo 名单源收敛后，q-*.tsx 不再写死 <SceneClip demo="...">，
// 本测试增强断言「SceneClip 从 yaml 派生 demo」（源里不应出现硬编码 demo prop）。
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { parseExploreYaml } from '../../../../src/lib/explore'
import { setCurrentSlug } from '../../../../src/components/explore/SceneClip'
import { SceneDemoContext } from '../../../../src/components/explore/AnswerContext'
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

import QProblem from './q-problem'
import QWhyNotOpenclaw from './q-why-not-openclaw'
import QFourPrerequisites from './q-four-prerequisites'
import QBadgeMetaphor from './q-badge-metaphor'
import QArchitecture from './q-architecture'
import QProtocolRepo from './q-protocol-repo'
import QUnifiedIdentity from './q-unified-identity'
import QRequestFlow from './q-request-flow'
import QTieredExecution from './q-tiered-execution'
import QTieredFlow from './q-tiered-flow'
import QTieredConfirm from './q-tiered-confirm'
import QThreatModel from './q-threat-model'
import QLimits from './q-limits'
import QFuture from './q-future'
import QDevFlowArch from './q-dev-flow-arch'

const DIR = join(__dirname)
const yamlRaw = readFileSync(join(DIR, '../explore.yaml'), 'utf-8')
const config = parseExploreYaml(yamlRaw)
if (!config.ok) throw new Error(config.error)

const sceneIds = config.value.scenes.map((s) => s.id)
const files = readdirSync(DIR).filter((f) => f.endsWith('.tsx') && f !== 'scenes.test.tsx')

const MODULES: Record<string, () => JSX.Element> = {
  'q-problem': QProblem,
  'q-why-not-openclaw': QWhyNotOpenclaw,
  'q-four-prerequisites': QFourPrerequisites,
  'q-badge-metaphor': QBadgeMetaphor,
  'q-architecture': QArchitecture,
  'q-protocol-repo': QProtocolRepo,
  'q-unified-identity': QUnifiedIdentity,
  'q-request-flow': QRequestFlow,
  'q-tiered-execution': QTieredExecution,
  'q-tiered-flow': QTieredFlow,
  'q-tiered-confirm': QTieredConfirm,
  'q-threat-model': QThreatModel,
  'q-limits': QLimits,
  'q-future': QFuture,
  'q-dev-flow-arch': QDevFlowArch,
}

describe('scenes/*.tsx 与 explore.yaml 对齐 + 渲染', () => {
  it('文件集合与 yaml scenes[].id 完全一致', () => {
    const fileIds = files.map((f) => basename(f, '.tsx')).sort()
    expect(fileIds).toEqual([...sceneIds].sort())
  })

  it('q-*.tsx 不再硬编码 demo prop——demo 名由 yaml scenes[].demo 单一真相', () => {
    for (const f of files) {
      const src = readFileSync(join(DIR, f), 'utf-8')
      // SceneClip 不允许带 demo="..."（单源收敛：demo 只在 explore.yaml 一处）
      expect(src).not.toMatch(/SceneClip\s+demo=/)
    }
  })

  it.each(Object.keys(MODULES))('%s 渲染出非空内容（SceneClip 经 SceneDemoContext 拿到 yaml demo）', (id) => {
    setCurrentSlug('ai-digital-employee')
    const Mod = MODULES[id]
    const yamlScene = config.value.scenes.find((s) => s.id === id)
    // 模拟 Answer 注入：SceneClip 消费 SceneDemoContext 里的 demo 名
    const { container, unmount } = render(
      <MemoryRouter>
        <SceneDemoContext.Provider value={yamlScene?.demo ?? null}>
          <Mod />
        </SceneDemoContext.Provider>
      </MemoryRouter>,
    )
    expect(container.innerHTML.length).toBeGreaterThan(0)
    // SceneClip 渲染出对应 demo 的容器（data-scene-clip-demo 与 yaml demo 对齐）
    if (yamlScene?.demo) {
      expect(container.querySelector(`[data-scene-clip-demo="${yamlScene.demo}"]`)).not.toBeNull()
    }
    unmount()
  })
})
