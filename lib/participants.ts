import { type Participant } from "@/types/chat"

// Deterministic avatar colors using oklch for consistent, vibrant hues
const AVATAR_COLORS = [
  "oklch(0.65 0.2 25)",
  "oklch(0.55 0.2 260)",
  "oklch(0.6 0.2 150)",
  "oklch(0.6 0.15 330)",
  "oklch(0.55 0.2 50)",
  "oklch(0.5 0.2 200)",
  "oklch(0.6 0.2 100)",
  "oklch(0.55 0.2 290)",
]

/**
 * Extract initials from a participant name.
 * - "John Doe" → "JD"
 * - "Alice" → "AL"
 * - "+55 11 99999-9999" → "+"
 * - Single char → uppercase char
 */
export function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"

  // Phone numbers: show "+" or first digit
  if (/^\+?\d[\d\s\-()]+$/.test(trimmed)) {
    return trimmed.startsWith("+") ? "+" : trimmed[0]
  }

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }

  // Single word: take first two characters
  return trimmed.slice(0, 2).toUpperCase()
}

/**
 * Get deterministic color for a participant based on index.
 */
export function getParticipantColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

/**
 * Build a participant map from a list of participant names.
 */
export function buildParticipantMap(names: string[]): Map<string, Participant> {
  const map = new Map<string, Participant>()
  for (let i = 0; i < names.length; i++) {
    map.set(names[i], {
      name: names[i],
      color: getParticipantColor(i),
    })
  }
  return map
}
