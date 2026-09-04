/* postbuild：修 dist 静态产物在 GitHub Pages 项目站点（base != '/'）下的三类问题：
 *
 * 1. SSG 按 encodeURIComponent 产出的中文目录名（字面量 %XX…）→ 还原为字面 Unicode。
 *    GitHub Pages 服务文件前把 URL 解码一次，磁盘名必须与解码后的请求一致。
 * 2. vite-react-ssg SSR 渲染的 href/src 是根绝对路径（不带 base 前缀）：
 *    modulepreload/script/css 与 <a> 链接全部补上 base 前缀——水合前、禁 JS、
 *    爬虫抓取时才能指向正确地址。
 * 3. 补前缀后与 Vite 自身注入的 preload 重复 → 按完整标签文本去重。
 */
import path from 'node:path'
import fs from 'node:fs'

const BASE = (process.env.DEPLOY_BASE || '/').replace(/\/?$/, '/')
const dist = path.resolve(process.cwd(), 'dist')
if (!fs.existsSync(dist)) {
  console.error('[fix-dist] no dist/ found; nothing to do')
  process.exit(1)
}

const renamed: string[] = []
const patchedFiles: { file: string; refs: number; deduped: number }[] = []

/* ---- 1. 目录/文件名解码 ---- */
function walkAndDecode(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, entry.name)
    let decoded = entry.name
    try {
      decoded = decodeURIComponent(entry.name)
    } catch {
      /* 非合法编码序列（如字面 100%do）保持原名 */
    }
    const dst = path.join(dir, decoded)
    if (decoded !== entry.name && !fs.existsSync(dst)) {
      fs.renameSync(src, dst)
      renamed.push(`${path.relative(dist, src)} -> ${path.relative(dist, dst)}`)
    }
    if (entry.isDirectory()) {
      walkAndDecode(fs.existsSync(dst) ? dst : src)
    }
  }
}

/* ---- 2+3. HTML 根绝对路径补前缀 + link 去重 ---- */
function needsBase(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith(BASE) && BASE !== '/'
}

function patchHtml(file: string) {
  let html = fs.readFileSync(file, 'utf8')
  let refs = 0
  let deduped = 0

  /* href="/xxx" 或 src="/xxx"，/xxx 不带 base 且非协议相对 → 补前缀 */
  html = html.replace(/(\s(?:href|src)=)(["'])\/(?!\/)([^"']*)\2/g, (full, attr, q, rest) => {
    const url = `/${rest}`
    if (!needsBase(url)) return full
    refs++
    return `${attr}${q}${BASE}${rest}${q}`
  })

  /* 补前缀后与 Vite 自身注入的 <link> 重复 → 按完整标签文本去重 */
  const seen = new Set<string>()
  html = html.replace(/<link\b[^>]*>/g, (tag) => {
    if (seen.has(tag)) {
      deduped++
      return ''
    }
    seen.add(tag)
    return tag
  })

  if (refs > 0 || deduped > 0) {
    fs.writeFileSync(file, html)
    patchedFiles.push({ file: path.relative(dist, file), refs, deduped })
  }
}

function walkHtml(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walkHtml(p)
    else if (entry.name.endsWith('.html')) patchHtml(p)
  }
}

walkAndDecode(dist)
walkHtml(dist)

console.log(`[fix-dist] base=${BASE}`)
console.log(`[fix-dist] decoded names: ${renamed.length}`)
for (const r of renamed) console.log(`  ${r}`)
console.log(`[fix-dist] patched html files: ${patchedFiles.length}`)
for (const p of patchedFiles) console.log(`  ${p.file} (+base: ${p.refs}, dedup link: ${p.deduped})`)
