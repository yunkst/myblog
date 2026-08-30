/** prefers-reduced-motion 单点检测(v5 review fix):六处 matchMedia 调用收敛。
 * SSR 安全:typeof matchMedia !== 'undefined' 守卫。 */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
}
