import { TokenMap } from './tokens.js';

export function renderTemplate(template: string, tokens: TokenMap): string {
  let out = template;

  for (const [key, value] of Object.entries(tokens)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    out = out.replace(pattern as string | RegExp, value as string);
  }

  // Hard gate: no unresolved tokens allowed
  const unresolved = out.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved && unresolved.length) {
    const unique = Array.from(new Set(unresolved)).sort();
    throw new Error(`Unresolved tokens: ${unique.join(', ')}`);
  }

  return out;
}
