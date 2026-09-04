/* postbuild：把 dist 递归里所有被 SSG 按 encodeURIComponent 编码的目录/文件名
 * （含 %XX 形式）还原为字面 Unicode。GitHub Pages 解码请求路径后才能正确匹配。 */
import path from 'node:path'
import fs from 'node:fs'

const dist = path.resolve(process.cwd(), 'dist')
if (!fs.existsSync(dist)) {
  console.error('[decode-dist] no dist/ found; nothing to do')
  process.exit(1)
}

const renamed: string[] = []

function walk(dir: string) {
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
      walk(fs.existsSync(dst) ? dst : src)
    }
  }
}

walk(dist)
console.log(`[decode-dist] renamed ${renamed.length} entries`)
for (const r of renamed) console.log(`  ${r}`)
