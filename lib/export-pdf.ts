import { jsPDF } from "jspdf"

import { type Message, type Participant } from "@/types/chat"
import { type DayBlock } from "@/components/edit-mode/timeline-preview"
import { getTranslation, getDateLocale } from "@/lib/i18n"

/** Hex from oklch is unreliable in jsPDF, so we use safe fallbacks */
const COLORS = {
  heading: [30, 30, 30] as [number, number, number],
  text: [60, 60, 60] as [number, number, number],
  muted: [130, 130, 130] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
  primary: [60, 90, 220] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  cardBg: [248, 248, 250] as [number, number, number],
}

/** Parse simple oklch color to a rough hex approximation for PDF */
function participantColorToRgb(color: string): [number, number, number] {
  if (!color || !color.startsWith("oklch")) return COLORS.primary

  const match = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (!match) return COLORS.primary

  const l = parseFloat(match[1])
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])

  const brightness = Math.round(l * 255)
  const hueRad = (h * Math.PI) / 180
  const chroma = c * 400

  const r = Math.max(
    0,
    Math.min(255, Math.round(brightness + chroma * Math.cos(hueRad)))
  )
  const g = Math.max(
    0,
    Math.min(255, Math.round(brightness + chroma * Math.cos(hueRad - 2.094)))
  )
  const b = Math.max(
    0,
    Math.min(255, Math.round(brightness + chroma * Math.cos(hueRad + 2.094)))
  )

  return [r, g, b]
}

function formatTime(date: Date, dateLocale: string): string {
  return date.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(date: Date, dateLocale: string): string {
  return date.toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** Strip HTML tags for plain text output in PDF */
function stripHtml(html: string): string {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.textContent ?? ""
}

/**
 * Sanitise text for jsPDF's built-in Helvetica font which only
 * supports WinAnsiEncoding (Latin-1 subset). This:
 *  - Replaces common Unicode punctuation with ASCII equivalents
 *  - Strips emoji and other unsupported codepoints
 *  - Normalises whitespace (tabs → spaces, collapses runs)
 *  - Preserves explicit newlines so callers can split on them
 */
function sanitizeForPdf(text: string): string {
  return (
    text
      // Common smart quotes / dashes → ASCII
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
      // Zero-width / directional / joiner chars
      .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
      // Strip emoji and supplementary Unicode symbols
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{E0020}-\u{E007F}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{E000}-\u{F8FF}]/gu,
        ""
      )
      // Variation selectors + combining enclosing keycap (combining marks, separate regex)
      .replace(/[\uFE00-\uFE0F\u20E3]/g, "")
      // Tabs → space
      .replace(/\t/g, " ")
      // Collapse multiple spaces (but not newlines)
      .replace(/[^\S\n]+/g, " ")
      // Collapse 3+ consecutive newlines into 2
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}

/**
 * Render a multi-line text block into the PDF, respecting explicit
 * newlines in the source text and wrapping long lines.
 * Returns the new Y position after rendering.
 */
function renderTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  maxWidth: number,
  lineHeight: number,
  startY: number,
  pageHeight: number,
  marginBottom: number,
  addPage: () => void
): number {
  let cy = startY
  const clean = sanitizeForPdf(text)
  const paragraphs = clean.split("\n")

  for (const para of paragraphs) {
    if (para.trim() === "") {
      // Empty line → small vertical gap
      cy += lineHeight * 0.6
      continue
    }
    const wrapped = doc.splitTextToSize(para, maxWidth) as string[]
    for (const wl of wrapped) {
      if (cy + lineHeight > pageHeight - marginBottom) {
        addPage()
        cy = 16 // margin
      }
      doc.text(wl, x, cy)
      cy += lineHeight
    }
  }

  return cy
}

/**
 * Convert a blob URL (or any image URL) to a base64 data URL.
 * Returns null if the fetch or conversion fails.
 */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Get the natural dimensions of an image from its data URL.
 * Returns { width, height } in pixels.
 */
function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

const VISUAL_MEDIA = new Set(["image", "sticker", "video"])

/** Max image width in mm for the PDF */
const IMG_MAX_W = 60
/** Max image height in mm for the PDF */
const IMG_MAX_H = 45

type ExportOptions = {
  blocks: DayBlock[]
  allMessages: Message[]
  comments: Map<string, string>
  participantMap: Map<string, Participant>
  title?: string
}

export async function exportTimelinePdf({
  blocks,
  allMessages,
  comments,
  participantMap,
  title,
}: ExportOptions): Promise<void> {
  const dateLocale = getDateLocale()
  const pdfTitle = title ?? getTranslation("pdf.title")

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = margin

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  // Pre-load all image data URLs in parallel so PDF generation is fast
  const imageCache = new Map<string, string>()
  const imageUrls: { id: string; url: string }[] = []
  for (const block of blocks) {
    for (const msg of block.messages) {
      if (VISUAL_MEDIA.has(msg.type) && msg.mediaUrl) {
        imageUrls.push({ id: msg.id, url: msg.mediaUrl })
      }
    }
  }
  const dataUrls = await Promise.all(
    imageUrls.map(({ url }) => urlToDataUrl(url))
  )
  for (let i = 0; i < imageUrls.length; i++) {
    const dataUrl = dataUrls[i]
    if (dataUrl) {
      imageCache.set(imageUrls[i].id, dataUrl)
    }
  }

  // Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...COLORS.heading)
  doc.text(pdfTitle, margin, y)
  y += 10

  // Subtitle with date range
  if (blocks.length > 0) {
    const firstDate = blocks[0].date
    const lastDate = blocks[blocks.length - 1].date
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    doc.text(
      `${formatDate(firstDate, dateLocale)} — ${formatDate(lastDate, dateLocale)}`,
      margin,
      y
    )
    y += 8
  }

  // Divider
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  for (const block of blocks) {
    const dayComment = comments.get(block.dayKey)

    // Estimate space needed for this block
    const estimatedHeight =
      12 + block.messages.length * 12 + (dayComment ? 20 : 0)
    checkPageBreak(Math.min(estimatedHeight, 60))

    // Day header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...COLORS.heading)
    doc.text(formatDate(block.date, dateLocale), margin, y)
    y += 2

    // Message count badge
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    const countText = `${block.messages.length} ${block.messages.length === 1 ? getTranslation("pdf.message") : getTranslation("pdf.messages")} ${getTranslation("pdf.of")} ${block.totalMessages}`
    doc.text(countText, margin, y + 4)
    y += 8

    // Messages
    for (const msg of block.messages) {
      checkPageBreak(14)

      const participant = participantMap.get(msg.sender)
      const color = participant
        ? participantColorToRgb(participant.color)
        : COLORS.primary

      // Sender dot
      doc.setFillColor(...color)
      doc.circle(margin + 1.5, y - 1, 1, "F")

      // Sender name
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(...color)
      const safeSender = sanitizeForPdf(msg.sender)
      doc.text(safeSender, margin + 5, y)

      // Timestamp
      const senderWidth = doc.getTextWidth(safeSender)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      doc.text(
        formatTime(msg.timestamp, dateLocale),
        margin + 5 + senderWidth + 3,
        y
      )
      y += 4

      // Image embed
      const imgData = imageCache.get(msg.id)
      if (imgData) {
        try {
          const dims = await getImageDimensions(imgData)
          const ratio = dims.width / dims.height
          let imgW = Math.min(IMG_MAX_W, contentWidth - 5)
          let imgH = imgW / ratio
          if (imgH > IMG_MAX_H) {
            imgH = IMG_MAX_H
            imgW = imgH * ratio
          }

          checkPageBreak(imgH + 4)

          const format = imgData.includes("image/png") ? "PNG" : "JPEG"
          doc.addImage(imgData, format, margin + 5, y, imgW, imgH)
          y += imgH + 3
        } catch {
          // If image fails to embed, fall through to text label
        }
      }

      // Message content
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.text)
      const content =
        msg.type !== "text"
          ? `[${msg.type}] ${msg.content || msg.mediaFilename || ""}`
          : msg.content

      if (content.trim()) {
        y = renderTextBlock(
          doc,
          content,
          margin + 5,
          contentWidth - 5,
          3.5,
          y,
          pageHeight,
          margin,
          () => {
            doc.addPage()
            y = margin
          }
        )
      }
      y += 3
    }

    // Comment section
    if (dayComment) {
      const commentText = sanitizeForPdf(stripHtml(dayComment))
      if (commentText.trim()) {
        checkPageBreak(16)

        // Measure comment height (count all wrapped lines across paragraphs)
        const paragraphs = commentText.split("\n")
        let totalLines = 0
        for (const p of paragraphs) {
          if (p.trim() === "") {
            totalLines += 0.6
          } else {
            const wl = doc.splitTextToSize(p, contentWidth - 12) as string[]
            totalLines += wl.length
          }
        }
        const commentHeight = totalLines * 3.5 + 10

        doc.setFillColor(...COLORS.cardBg)
        doc.setDrawColor(...COLORS.border)
        doc.roundedRect(margin, y - 1, contentWidth, commentHeight, 2, 2, "FD")

        // Comment label
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.primary)
        doc.text(getTranslation("pdf.note"), margin + 4, y + 4)
        y += 8

        // Comment text
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.text)
        y = renderTextBlock(
          doc,
          commentText,
          margin + 4,
          contentWidth - 12,
          3.5,
          y,
          pageHeight,
          margin,
          () => {
            doc.addPage()
            y = margin
          }
        )
        y += 6
      }
    }

    // Block separator
    y += 4
    checkPageBreak(4)
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
  }

  // ── Appendix: full day logs ──────────────────────────────────────
  // Collect all dayKeys that appear in the selected blocks
  const includedDays = new Set(blocks.map((b) => b.dayKey))

  // Group ALL messages by day for the included days (skip system messages)
  const fullDayMessages = new Map<string, Message[]>()
  for (const msg of allMessages) {
    if (msg.type === "system") continue
    const dayKey = msg.timestamp.toDateString()
    if (!includedDays.has(dayKey)) continue
    let arr = fullDayMessages.get(dayKey)
    if (!arr) {
      arr = []
      fullDayMessages.set(dayKey, arr)
    }
    arr.push(msg)
  }

  if (fullDayMessages.size > 0) {
    // Start appendix on a new page
    doc.addPage()
    y = margin

    // Appendix title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.heading)
    doc.text(getTranslation("pdf.appendix"), margin, y)
    y += 5

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)
    doc.text(getTranslation("pdf.appendixDesc"), margin, y)
    y += 8

    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    // Render each day in chronological order
    for (const block of blocks) {
      const dayMessages = fullDayMessages.get(block.dayKey)
      if (!dayMessages || dayMessages.length === 0) continue

      checkPageBreak(12)

      // Day header
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.heading)
      doc.text(formatDate(block.date, dateLocale), margin, y)
      y += 5

      // Each message as a plain line: [HH:MM] Sender: content
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.text)

      for (const msg of dayMessages) {
        const time = formatTime(msg.timestamp, dateLocale)
        const mediaLabel =
          msg.type !== "text"
            ? msg.mediaFilename
              ? `<${msg.mediaFilename}>`
              : `<${msg.type}>`
            : ""
        const textPart = msg.content || ""
        const raw = `[${time}] ${msg.sender}: ${mediaLabel}${mediaLabel && textPart ? " " : ""}${textPart}`

        y = renderTextBlock(
          doc,
          raw,
          margin,
          contentWidth,
          3.2,
          y,
          pageHeight,
          margin,
          () => {
            doc.addPage()
            y = margin
          }
        )
      }

      // Day separator
      y += 3
      checkPageBreak(3)
      doc.setDrawColor(...COLORS.border)
      doc.setLineWidth(0.15)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
    }
  }

  // Footer on last page
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text(
    `${getTranslation("pdf.footer")} ${new Date().toLocaleDateString(dateLocale)}`,
    margin,
    pageHeight - 8
  )

  doc.save(getTranslation("pdf.filename"))
}
