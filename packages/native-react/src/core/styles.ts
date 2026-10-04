const UNITLESS = new Set(['opacity', 'flex', 'flexGrow', 'flexShrink', 'zIndex', 'fontWeight', 'lineHeight', 'order', 'zoom', 'gridRow', 'gridColumn']);
const kebab = (s: string) => s.startsWith('--') ? s : s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
export function styleToCss(s: Record<string, any> | null | undefined): string {
  if (!s) return '';
  let out = '';
  for (const k in s) {
    const v = s[k]; if (v == null || v === false || v === '') continue;
    out += kebab(k) + ':' + (typeof v === 'number' && v !== 0 && !UNITLESS.has(k) && !k.startsWith('--') ? v + 'px' : v) + ';';
  }
  return out;
}
