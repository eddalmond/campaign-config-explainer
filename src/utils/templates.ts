/**
 * Helpers for detecting and rendering template tokens that appear inside
 * config strings. These are substituted at deploy / runtime by the API and
 * should be left untouched in the JSON.
 *
 * Two forms are observed in real configs:
 *   1. Deploy-time tokens wrapped in <<...>>: e.g. <<DATE_DAY_-100>>, <<TIME_HOUR_1>>
 *   2. Per-rule text-substitution tokens wrapped in [[...]] used inside
 *      ActionDescription / StatusText, e.g. [[TARGET.RSV.LAST_SUCCESSFUL_DATE:DATE(%-d %B %Y)]]
 *
 * The visualiser doesn't try to resolve them; it just surfaces them as a
 * styled chip so the user knows "this is a template, not a real value".
 */

const DEPLOY_TOKEN = /<<[A-Z_]+(?:[A-Z0-9_]*)?>>/g;
const SUBSTITUTION_TOKEN = /\[\[[^\]]+\]\]/g;

export interface TemplateToken {
  raw: string;
  kind: 'deploy' | 'substitution';
  label: string;
}

export function findTemplateTokens(input: string | undefined | null): TemplateToken[] {
  if (!input) return [];
  const tokens: TemplateToken[] = [];
  const seen = new Set<string>();

  for (const match of input.matchAll(DEPLOY_TOKEN)) {
    const raw = match[0];
    if (seen.has(raw)) continue;
    seen.add(raw);
    tokens.push({ raw, kind: 'deploy', label: raw.slice(2, -2) });
  }
  for (const match of input.matchAll(SUBSTITUTION_TOKEN)) {
    const raw = match[0];
    if (seen.has(raw)) continue;
    seen.add(raw);
    tokens.push({ raw, kind: 'substitution', label: raw.slice(2, -2) });
  }
  return tokens;
}

export function hasTemplateTokens(input: string | undefined | null): boolean {
  if (!input) return false;
  return DEPLOY_TOKEN.test(input) || SUBSTITUTION_TOKEN.test(input);
}

/**
 * Render a string with template tokens replaced by chip placeholders.
 * Used in tooltips, descriptions, and the validation panel.
 */
export function renderWithChips(
  input: string | undefined | null,
  renderChip: (token: TemplateToken) => string,
): string {
  if (!input) return '';
  return input
    .replace(DEPLOY_TOKEN, m => renderChip({ raw: m, kind: 'deploy', label: m.slice(2, -2) }))
    .replace(SUBSTITUTION_TOKEN, m => renderChip({ raw: m, kind: 'substitution', label: m.slice(2, -2) }));
}
