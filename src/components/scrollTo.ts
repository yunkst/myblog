import { resolveTarget, isSamePage } from '../lib/nav'

export function scrollToHash(target: string, pathname: string): void {
  const hash = resolveTarget(target, pathname).split('#')[1]
  const el = hash ? document.getElementById(hash) : document.getElementById('top')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('flash-target')
  void el.offsetWidth
  el.classList.add('flash-target')
}

export function handleFaqClick(target: string, pathname: string, navigate: (to: string) => void): void {
  if (isSamePage(target, pathname)) {
    scrollToHash(target, pathname)
  } else {
    navigate(resolveTarget(target, pathname))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToHash(target, pathname))
    })
  }
}
