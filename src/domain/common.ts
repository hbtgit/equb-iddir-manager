export interface Member {
  id: string;
  name: string;
  phone?: string;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Split a textarea / comma list into trimmed, non-empty, de-duplicated names. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatMoney(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
