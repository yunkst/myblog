import { useContext, useMemo, type ComponentType } from 'react'
import { ExploreConfigContext, ExploreRuntimeContext } from './AnswerContext'
import Answer from './Answer'

/**
 * v5（spec §7.3）单幕挂载核心。
 *
 * - 全文章场景文件 glob：/content/posts/<slug>/scenes/<id>.tsx（eager）。
 * - 按 slug + basename(.tsx) === activeId 命中当前激活幕的组件；
 *   不在 yaml scenes[] 里的 / slug 不匹配 / activeId 不匹配都返回 null（无 DOM）。
 * - 激活态用 <Answer key={scene.id} scene={scene} body={<Scene />} />——
 *   key=activeId 让切幕时 Director 演出重建；Answer 内部依据 yaml label 兜底 heading。
 *
 * 测试接入（brief Step 1 方案 1）：导出 sceneModulesFor(prefix) 工厂，
 * 生产传真实 glob 表；测试传 fixture map，避开 vitest ESM 下 fixture-in-/content/ 的窘境。
 */

type SceneModule = { default: ComponentType }

const realSceneModules = import.meta.glob<SceneModule>(
  [
    '/content/posts/*/scenes/*.tsx',
    /* 负向 pattern：排除 scenes.test.tsx 之类测试文件——eager import 会执行
     * 模块副作用（vitest describe 注册污染 + 生产 bundle 带测试代码） */
    '!/content/posts/*/scenes/*.test.tsx',
    '!/content/posts/*/scenes/*.test.ts',
  ],
  { eager: true },
)

/** 测试注入工厂（brief 方案 1）：生产默认走真实 glob 表；测试传 fixture map。 */
export function sceneModulesFor(modules: Record<string, SceneModule> = realSceneModules) {
  return modules
}

/** 从 glob 路径里抽 slug（倒数第二段 /content/posts/<slug>/scenes/<id>.tsx） */
function slugOfKey(key: string): string {
  return key.split('/').slice(-3, -2)[0] ?? ''
}
function basenameOfKey(key: string): string {
  return (key.split('/').slice(-1)[0] ?? '').replace(/\.tsx$/, '')
}

interface Props {
  slug: string
  /** 测试注入用：默认走真实 import.meta.glob（brief 方案 1 的注入点） */
  modules?: Record<string, SceneModule>
}

export default function SceneRoute({ slug, modules }: Props) {
  const runtime = useContext(ExploreRuntimeContext)
  const config = useContext(ExploreConfigContext)
  const activeId = runtime?.activeId ?? null
  const sceneMap = modules ?? realSceneModules

  const scene = useMemo(
    () => config?.scenes.find((s) => s.id === activeId) ?? null,
    [config, activeId],
  )

  const Scene = useMemo<ComponentType | null>(() => {
    if (!activeId) return null
    const key = Object.keys(sceneMap).find(
      (k) => slugOfKey(k) === slug && basenameOfKey(k) === activeId,
    )
    return key ? sceneMap[key].default : null
  }, [sceneMap, slug, activeId])

  if (!scene || !Scene) return null

  return (
    <div className="stage-stage">
      {/* key=scene.id：切幕即重挂——Director 演出重建 */}
      <Answer key={scene.id} scene={scene} body={<Scene />} />
    </div>
  )
}
