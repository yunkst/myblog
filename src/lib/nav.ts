export function resolveTarget(target: string, pathname: string): string {
  if (target.startsWith('#')) return pathname + target
  return target
}

export function isSamePage(target: string, pathname: string): boolean {
  const resolved = resolveTarget(target, pathname)
  const tPath = resolved.split('#')[0] || '/'
  return tPath === pathname
}
