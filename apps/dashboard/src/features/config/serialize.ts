export interface ParsedConfig {
  /** Keys in original order, so serialization round-trips faithfully. */
  order: string[]
  /** Raw value strings exactly as they appear in the ini (quotes included). */
  values: Record<string, string>
}

/** Split a comma-separated body at top level, respecting nested () and "". */
function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quoted = false
  let current = ''
  for (const ch of body) {
    if (ch === '"') quoted = !quoted
    if (!quoted && ch === '(') depth++
    if (!quoted && ch === ')') depth--
    if (ch === ',' && depth === 0 && !quoted) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.length) parts.push(current)
  return parts
}

/** Parse the raw `OptionSettings` body (the content inside the outer parens). */
export function parseBody(body: string): ParsedConfig {
  const order: string[] = []
  const values: Record<string, string> = {}
  for (const part of splitTopLevel(body)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (!key) continue
    order.push(key)
    values[key] = part.slice(eq + 1)
  }
  return { order, values }
}

/** Parse arbitrary pasted text: full ini, the line, or just the body. */
export function parseConfig(text: string): ParsedConfig | null {
  const marker = 'OptionSettings=('
  const start = text.indexOf(marker)
  if (start === -1) {
    return text.includes('=') ? parseBody(text.trim().replace(/^\(|\)$/g, '')) : null
  }
  let depth = 0
  const from = start + marker.length - 1
  for (let i = from; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) {
      return parseBody(text.slice(from + 1, i))
    }
  }
  return null
}

export function toBody(config: ParsedConfig): string {
  return config.order.map((key) => `${key}=${config.values[key]}`).join(',')
}

export function toIni(config: ParsedConfig): string {
  return `[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(${toBody(config)})\n`
}

// ---- value helpers ----
export const unquote = (s: string): string =>
  s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s
export const quote = (s: string): string => `"${s}"`
export const formatFloat = (n: number): string => (Number.isFinite(n) ? n : 0).toFixed(6)

export const parsePlatforms = (raw: string): string[] =>
  raw
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export const serializePlatforms = (list: string[]): string => `(${list.join(',')})`
