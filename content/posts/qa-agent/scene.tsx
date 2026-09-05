// scene.tsx — qa-agent demos 字典（键名 = explore.yaml 的 scenes[].demo）
import type { Scene } from '@/components/explore/SceneController'
import { gsap } from 'gsap'
import { buildArchFade } from '@/components/blog-anim/buildArchFade'
import { typeInto } from '@/components/blog-anim/typeInto'
import { OverviewStage, AsToolStage, KbChatStage, AccessStage } from './scene-stages'

/** git-kb：知识问答演出（聊天窗：打字提问 → thinking → 检索过程解说 → 带版本引用的答案。
 * 节奏与 ai-digital-employee 的 tiered-confirm 同一套；步骤行用 .kb-step 类 stagger，不给 id） */
function buildKbChat() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.set('#kb-user', { opacity: 0, y: 8 })
  tl.set(['#kb-thinking', '#kb-tool', '#kb-answer', '#kb-caption'], { opacity: 0 })
  tl.set(['.kb-step', '#kb-cite'], { opacity: 0, x: -8 })

  // 1) 输入栏打字（共享 typeInto helper）
  typeInto(tl, 'kb-input', '境外订单的退款流程是什么？')

  // 2) 发送：输入栏清空，问题气泡出现
  tl.call(() => {
    const el = document.getElementById('kb-input')
    if (el) el.textContent = ''
  })
  tl.to('#kb-user', { opacity: 1, y: 0, duration: 0.3 })

  // 3) thinking 三点闪烁
  tl.to('#kb-thinking', { opacity: 1, duration: 0.2 })
  tl.to('#kb-thinking', { opacity: 0.4, duration: 0.3, repeat: 3, yoyo: true })

  // 4) tool call 卡片：过程解说（thought）流式出现——list_repos 定位 → read_file 带 commit
  tl.set('#kb-thinking', { opacity: 0 })
  tl.to('#kb-tool', { opacity: 1, duration: 0.2 })
  tl.to('.kb-step', { opacity: 1, x: 0, duration: 0.3, stagger: 0.55 })

  // 5) 答案气泡 → 引用角标点亮（版本号 = git 的戏眼）
  tl.to('#kb-answer', { opacity: 1, duration: 0.4 }, '+=0.2')
  tl.to('#kb-cite', { opacity: 1, x: 0, duration: 0.3 }, '+=0.3')

  // 6) 收尾字幕：把「为什么用 git 管」钉死
  tl.to('#kb-caption', { opacity: 1, duration: 0.5 }, '+=0.4')
  return tl
}

/** access-rules：规则逐条出现 → 两个角色视图出现 → 被拒项变灰 */
function buildAccess() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const rules = '[data-concept="access-rules"] .access-rule'
  const views = ['#av-dev', '#av-ext']
  tl.set(rules, { opacity: 0, y: 8 })
  tl.set(views, { opacity: 0, y: 10 })
  tl.set('#ac-caption', { opacity: 0 })
  tl.to(rules, { opacity: 1, y: 0, duration: 0.35, stagger: 0.4 })
  tl.to(views, { opacity: 1, y: 0, duration: 0.4, stagger: 0.3 }, '+=0.2')
  // 被拒项灰显强调（CSS class 控制，重播时幂等）
  tl.call(() => {
    document.querySelectorAll('[data-concept="access-rules"] .access-item.deny')
      .forEach((el) => el.classList.add('is-struck'))
  }, [], '+=0.3')
  tl.to('#ac-caption', { opacity: 1, duration: 0.5 }, '+=0.4')
  return tl
}

export const demos: Record<string, Scene> = {
  'qa-overview':  { name: 'qa-overview',  Stage: OverviewStage, build: () => buildArchFade('[data-arch="qa-overview"]') },
  'git-kb':       { name: 'git-kb',       Stage: KbChatStage,   build: buildKbChat },
  'access-rules': { name: 'access-rules', Stage: AccessStage,   build: buildAccess },
  'as-tool':      { name: 'as-tool',      Stage: AsToolStage,   build: () => buildArchFade('[data-arch="as-tool"]') },
}
