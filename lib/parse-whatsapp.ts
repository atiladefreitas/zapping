import { type ChatData, type Message, type MessageType } from "@/types/chat"

// Bracketed format: [DD/MM/YYYY, HH:MM:SS] Name: message
// Dash format:      DD/MM/YYYY HH:MM - Name: message
// Also handles:     DD.MM.YYYY, MM/DD/YYYY, 12h clock (AM/PM)

const BRACKETED_RE =
  /^\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+(.+?):\s([\s\S]*)$/

const DASH_RE =
  /^(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+(.+?):\s([\s\S]*)$/

const SYSTEM_BRACKETED_RE =
  /^\[(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([\s\S]*)$/

const SYSTEM_DASH_RE =
  /^(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+([\s\S]*)$/

const SYSTEM_KEYWORDS = [
  "created group",
  "added",
  "removed",
  "left",
  "changed the subject",
  "changed this group",
  "changed the group",
  "messages and calls are end-to-end encrypted",
  "security code changed",
  "joined using this group",
  "were added",
  "disappeared",
  "pinned a message",
  "turned on disappearing",
  "turned off disappearing",
]

const DELETED_PATTERNS = [
  "this message was deleted",
  "you deleted this message",
  "this message has been deleted",
  "mensaje eliminado",
  "apagou esta mensagem",
  "esta mensagem foi apagada",
]

const MEDIA_OMITTED_PATTERNS = [
  "<media omitted>",
  "<mídia oculta>",
  "<arquivo de mídia oculto>",
  "<media omitido>",
]

const MEDIA_EXTENSION_MAP: Record<string, MessageType> = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "sticker",
  ".gif": "image",
  ".mp4": "video",
  ".3gp": "video",
  ".mov": "video",
  ".opus": "audio",
  ".mp3": "audio",
  ".m4a": "audio",
  ".ogg": "audio",
  ".pdf": "document",
  ".vcf": "document",
  ".doc": "document",
  ".docx": "document",
  ".xls": "document",
  ".xlsx": "document",
}

function isSystemMessage(content: string): boolean {
  const lower = content.toLowerCase()
  return SYSTEM_KEYWORDS.some((kw) => lower.includes(kw))
}

function isDeleted(content: string): boolean {
  const lower = content.toLowerCase().trim()
  return DELETED_PATTERNS.some((p) => lower.includes(p))
}

function isEdited(content: string): boolean {
  return content.trimEnd().endsWith("(edited)")
}

function isMediaOmitted(content: string): boolean {
  const lower = content.toLowerCase().trim()
  return MEDIA_OMITTED_PATTERNS.some((p) => lower.includes(p))
}

function detectMediaType(content: string): {
  type: MessageType
  filename: string | undefined
} {
  // Check for attached file pattern: "filename.ext (file attached)"
  const attachedMatch = content.match(/^(.+?\.\w+)\s*\(file attached\)\s*$/i)
  if (attachedMatch) {
    const filename = attachedMatch[1].trim()
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase()
    return {
      type: MEDIA_EXTENSION_MAP[ext] ?? "document",
      filename,
    }
  }

  // Check for media omitted
  if (isMediaOmitted(content)) {
    return { type: "image", filename: undefined }
  }

  return { type: "text", filename: undefined }
}

type ParsedLine = {
  date: string
  time: string
  sender: string
  content: string
  isSystem: boolean
}

function parseLine(line: string): ParsedLine | null {
  // Try bracketed format first
  let match = BRACKETED_RE.exec(line)
  if (match) {
    return {
      date: match[1],
      time: match[2],
      sender: match[3],
      content: match[4],
      isSystem: false,
    }
  }

  // Try dash format
  match = DASH_RE.exec(line)
  if (match) {
    return {
      date: match[1],
      time: match[2],
      sender: match[3],
      content: match[4],
      isSystem: false,
    }
  }

  // Try system message (bracketed, no sender)
  match = SYSTEM_BRACKETED_RE.exec(line)
  if (match) {
    return {
      date: match[1],
      time: match[2],
      sender: "",
      content: match[3],
      isSystem: true,
    }
  }

  // Try system message (dash, no sender)
  match = SYSTEM_DASH_RE.exec(line)
  if (match) {
    return {
      date: match[1],
      time: match[2],
      sender: "",
      content: match[3],
      isSystem: true,
    }
  }

  return null
}

// Date order: true = days first (DD/MM), false = months first (MM/DD)
type DaysFirst = boolean

const DATE_SPLIT_RE = /[-/.] ?/

/**
 * Reorder date components so the year (longest number) is always last,
 * returning [first, second, year].
 *
 * For DD/MM/YYYY and MM/DD/YYYY the year is already last, so we keep
 * the original order of the first two components.
 *
 * For YYYY/MM/DD (year-first), the remaining components are always in
 * month-day order (ISO convention), so we return [month, day, year].
 * The daysFirst flag will later handle the correct interpretation.
 */
function orderDateComponents(date: string): [string, string, string] {
  const [a, b, c] = date.split(DATE_SPLIT_RE)
  const maxLen = Math.max(a.length, b.length, c.length)

  // Year is already last (DD/MM/YYYY or MM/DD/YYYY) — most common case
  if (c.length === maxLen) return [a, b, c]

  // Year is in the middle (very rare, e.g. DD/YYYY/MM) — move year to end
  if (b.length === maxLen) return [a, c, b]

  // Year is first (YYYY/MM/DD) — remaining components are month then day.
  // Return them in the same order so the standard heuristics can work.
  return [b, c, a]
}

/**
 * Extract all [first, second, year] numeric date triples from the chat text.
 * Only examines date portions of parsed lines (not message content) to avoid
 * being polluted by IP addresses, version numbers, phone numbers, etc.
 */
function extractNumericDates(chatText: string): number[][] {
  const lines = chatText.split("\n")
  const dates: number[][] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const parsed = parseLine(line)
    if (!parsed) continue

    const [first, second, year] = orderDateComponents(parsed.date).map(Number)
    const key = `${first}-${second}-${year}`
    if (!seen.has(key)) {
      seen.add(key)
      dates.push([first, second, year])
    }
  }

  return dates
}

/**
 * Check 1: If any first component > 12, it must be a day → days first.
 * If any second component > 12, it must be a day → months first.
 */
function checkAbove12(dates: number[][]): DaysFirst | null {
  if (dates.some(([first]) => first > 12)) return true
  if (dates.some(([, second]) => second > 12)) return false
  return null
}

/**
 * Check 2: Within the same year, months only increase (Jan → Dec), but
 * days frequently decrease (e.g. 31st → 1st at month boundaries).
 *
 * Count how many times each component decreases. The component that
 * decreases more often is the day (since days reset every month).
 * A single decrease is not conclusive for the first component because
 * it could be a legitimate day rollover.
 */
function checkDecreasing(dates: number[][]): DaysFirst | null {
  // Group dates by year
  const byYear = new Map<number, number[][]>()
  for (const d of dates) {
    const yr = d[2]
    if (!byYear.has(yr)) byYear.set(yr, [])
    byYear.get(yr)!.push(d)
  }

  let firstDecreases = 0
  let secondDecreases = 0

  for (const yearDates of byYear.values()) {
    for (let i = 1; i < yearDates.length; i++) {
      if (yearDates[i][0] < yearDates[i - 1][0]) firstDecreases++
      if (yearDates[i][1] < yearDates[i - 1][1]) secondDecreases++
    }
  }

  if (firstDecreases > secondDecreases) return true
  if (secondDecreases > firstDecreases) return false
  return null
}

/**
 * Check 3: Whichever component changes more frequently is the day,
 * since days change more often than months over a chat history.
 */
function checkChangeFrequency(dates: number[][]): DaysFirst | null {
  let firstChanges = 0
  let secondChanges = 0

  for (let i = 1; i < dates.length; i++) {
    firstChanges += Math.abs(dates[i][0] - dates[i - 1][0])
    secondChanges += Math.abs(dates[i][1] - dates[i - 1][1])
  }

  if (firstChanges > secondChanges) return true
  if (secondChanges > firstChanges) return false
  return null
}

/**
 * Check if dates use YYYY/MM/DD format (year-first). In this format the
 * remaining components are always month-then-day, so daysFirst = false.
 */
function checkYearFirst(chatText: string): DaysFirst | null {
  const lines = chatText.split("\n")

  for (const line of lines) {
    const parsed = parseLine(line)
    if (!parsed) continue

    const parts = parsed.date.split(DATE_SPLIT_RE)
    if (parts.length !== 3) continue

    // If the first component is a 4-digit year, this is YYYY/MM/DD
    if (parts[0].length === 4) return false

    // If not year-first, no need to keep checking — format is consistent
    // across a single chat export
    return null
  }

  return null
}

/**
 * Detect whether the chat uses DD/MM or MM/DD by running checks
 * in order, falling back to DD/MM if all are ambiguous.
 */
function detectDaysFirst(chatText: string): DaysFirst {
  // First check: YYYY/MM/DD format always means months first after reorder
  const yearFirst = checkYearFirst(chatText)
  if (yearFirst !== null) return yearFirst

  const dates = extractNumericDates(chatText)

  const check1 = checkAbove12(dates)
  if (check1 !== null) return check1

  const check2 = checkDecreasing(dates)
  if (check2 !== null) return check2

  const check3 = checkChangeFrequency(dates)
  if (check3 !== null) return check3

  // Default: DD/MM (most common worldwide)
  return true
}

function parseDate(
  dateStr: string,
  timeStr: string,
  daysFirst: DaysFirst
): Date {
  const [aStr, bStr, yStr] = orderDateComponents(dateStr)

  const a = parseInt(aStr, 10)
  const b = parseInt(bStr, 10)
  let year = parseInt(yStr, 10)

  if (year < 100) {
    year += 2000
  }

  let day: number
  let month: number

  if (daysFirst) {
    day = a
    month = b
  } else {
    month = a
    day = b
  }

  // Safety: if the chosen interpretation is impossible, try swapping
  if (month > 12 && day <= 12) {
    const tmp = day
    day = month
    month = tmp
  }
  if (day > 31) day = 1
  if (month > 12) month = 1

  // Parse time
  let timePart = timeStr.trim()
  const isPm = /pm/i.test(timePart)
  const isAm = /am/i.test(timePart)
  timePart = timePart.replace(/\s*[APap][Mm]\s*/, "")

  const timeParts = timePart.split(":").map(Number)
  let hours = timeParts[0]
  const minutes = timeParts[1] ?? 0
  const seconds = timeParts[2] ?? 0

  if (isPm && hours < 12) hours += 12
  if (isAm && hours === 12) hours = 0

  return new Date(year, month - 1, day, hours, minutes, seconds)
}

export function parseWhatsApp(
  chatText: string,
  mediaMap: Map<string, string>
): ChatData {
  const daysFirst = detectDaysFirst(chatText)
  const lines = chatText.split("\n")
  const messages: Message[] = []
  const participantSet = new Set<string>()
  let currentMessage: Message | null = null

  for (const line of lines) {
    const parsed = parseLine(line)

    if (parsed) {
      // Flush previous message
      if (currentMessage) {
        messages.push(currentMessage)
      }

      const timestamp = parseDate(parsed.date, parsed.time, daysFirst)
      const isSystemMsg = parsed.isSystem || isSystemMessage(parsed.content)

      let msgType: MessageType = isSystemMsg ? "system" : "text"
      let mediaFilename: string | undefined
      let mediaUrl: string | undefined

      if (!isSystemMsg) {
        participantSet.add(parsed.sender)

        const media = detectMediaType(parsed.content)
        if (media.type !== "text") {
          msgType = media.type
          mediaFilename = media.filename
        }
      }

      // Resolve media URL from the map
      if (mediaFilename) {
        mediaUrl = mediaMap.get(mediaFilename)
        // Try fuzzy match if exact match fails (filenames sometimes differ slightly)
        if (!mediaUrl) {
          for (const [key, url] of mediaMap.entries()) {
            if (key.includes(mediaFilename) || mediaFilename.includes(key)) {
              mediaUrl = url
              break
            }
          }
        }
      }

      currentMessage = {
        id: `msg-${messages.length}`,
        timestamp,
        sender: parsed.sender,
        content: parsed.content,
        type: msgType,
        mediaFilename,
        mediaUrl,
        isDeleted: isDeleted(parsed.content),
        isEdited: isEdited(parsed.content),
      }
    } else if (currentMessage) {
      // Continuation line (multi-line message)
      currentMessage.content += "\n" + line
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    messages.push(currentMessage)
  }

  return {
    participants: [...participantSet],
    messages,
    mediaMap,
  }
}
