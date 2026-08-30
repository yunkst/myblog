// scenes.test.tsx — scenes/*.tsx ↔ explore.yaml 对齐 + 渲染冒烟（Task 6）
//
// RED→GREEN 策略：文件集合一致性测试动态 readdirSync（真实目录真相）；
// 渲染冒烟静态 import 11 个模块（require 在 vitest ESM 下不可用，brief 已授权改法）。
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { parseExploreYaml } from '../../../../src/lib/explore'
import { setCurrentSlug } from '../../../../src/components/explore/SceneClip'
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

import QProblem from './q-problem'
import QWhyNotOpenclaw from './q-why-not-openclaw'
import QFourPrerequisites from './q-four-prerequisites'
import QBadgeMetaphor from './q-badge-metaphor'
import QProtocolRepo from './q-protocol-repo'
import QUnifiedIdentity from './q-unified-identity'
import QTieredExecution from './q-tiered-execution'
import QTieredConfirm from './q-tiered-confirm'
import QThreatModel from './q-threat-model'
import QLimits from './q-limits'
import QFuture from './q-future'

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
  'q-protocol-repo': QProtocolRepo,
  'q-unified-identity': QUnifiedIdentity,
  'q-tiered-execution': QTieredExecution,
  'q-tiered-confirm': QTieredConfirm,
  'q-threat-model': QThreatModel,
  'q-limits': QLimits,
  'q-future': QFuture,
}

describe('scenes/*.tsx 与 explore.yaml 对齐 + 渲染', () => {
  it('文件集合与 yaml scenes[].id 完全一致', () => {
    const fileIds = files.map((f) => basename(f, '.tsx')).sort()
    expect(fileIds).toEqual([...sceneIds].sort())
  })

  it.each(Object.keys(MODULES))('%s 渲染出非空内容', (id) => {
    setCurrentSlug('ai-digital-employee')
    const Mod = MODULES[id]
    const { container, unmount } = render(<MemoryRouter><Mod /></MemoryRouter>)
    expect(container.innerHTML.length).toBeGreaterThan(0)
    unmount()
  })
})
