import JSZip from "jszip"

import { getTranslation } from "@/lib/i18n"

export type ExtractedChat = {
  chatText: string
  mediaMap: Map<string, string>
}

const MEDIA_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".3gp",
  ".mov",
  ".opus",
  ".mp3",
  ".m4a",
  ".ogg",
  ".pdf",
  ".vcf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
])

function isChatFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return (
    lower.endsWith(".txt") &&
    (lower.includes("_chat") || lower.includes("whatsapp chat"))
  )
}

function isMediaFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return [...MEDIA_EXTENSIONS].some((ext) => lower.endsWith(ext))
}

function getBasename(path: string): string {
  return path.split("/").pop() ?? path
}

export async function extractZip(file: File): Promise<ExtractedChat> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  let chatText = ""
  const mediaMap = new Map<string, string>()

  const entries = Object.entries(zip.files).filter(([, f]) => !f.dir)

  // Find the chat text file first
  for (const [path, zipEntry] of entries) {
    const basename = getBasename(path)
    if (isChatFile(basename)) {
      chatText = await zipEntry.async("string")
      break
    }
  }

  if (!chatText) {
    // Fallback: try any .txt file
    for (const [path, zipEntry] of entries) {
      if (path.toLowerCase().endsWith(".txt")) {
        chatText = await zipEntry.async("string")
        break
      }
    }
  }

  if (!chatText) {
    throw new Error(getTranslation("extract.noChatFile"))
  }

  // Extract media files and create object URLs
  for (const [path, zipEntry] of entries) {
    const basename = getBasename(path)
    if (isMediaFile(basename)) {
      const blob = await zipEntry.async("blob")
      const objectUrl = URL.createObjectURL(blob)
      mediaMap.set(basename, objectUrl)
    }
  }

  return { chatText, mediaMap }
}

export function revokeMediaUrls(mediaMap: Map<string, string>): void {
  for (const url of mediaMap.values()) {
    URL.revokeObjectURL(url)
  }
}
