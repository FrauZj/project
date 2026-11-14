const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function motion(ms) {
  return reduced.matches ? 0 : ms;
}
