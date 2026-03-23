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

function parseDate(dateStr: string, timeStr: string): Date {
  // Normalize separators
  const parts = dateStr.split(/[/.]/)
  if (parts.length !== 3) return new Date(0)

  let day = parseInt(parts[0], 10)
  let month = parseInt(parts[1], 10)
  let year = parseInt(parts[2], 10)

  // Handle 2-digit year
  if (year < 100) {
    year += 2000
  }

  // Heuristic: if month > 12, assume MM/DD/YYYY format
  if (month > 12 && day <= 12) {
    ;[day, month] = [month, day]
  }

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

export function parseWhatsApp(
  chatText: string,
  mediaMap: Map<string, string>
): ChatData {
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

      const timestamp = parseDate(parsed.date, parsed.time)
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
