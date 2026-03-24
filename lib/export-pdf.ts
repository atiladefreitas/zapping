import { jsPDF } from "jspdf"

import { type Participant } from "@/types/chat"
import { type DayBlock } from "@/components/edit-mode/timeline-preview"

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
  // Fallback: just use a blue-ish tone
  if (!color || !color.startsWith("oklch")) return COLORS.primary

  // Simple mapping: extract lightness and use it for brightness
  const match = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (!match) return COLORS.primary

  const l = parseFloat(match[1])
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])

  // Very rough oklch-to-rgb approximation for display purposes
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
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

type ExportOptions = {
  blocks: DayBlock[]
  comments: Map<string, string>
  participantMap: Map<string, Participant>
  title?: string
}

export function exportTimelinePdf({
  blocks,
  comments,
  participantMap,
  title = "Chat Timeline",
}: ExportOptions): void {
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

  // Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...COLORS.heading)
  doc.text(title, margin, y)
  y += 10

  // Subtitle with date range
  if (blocks.length > 0) {
    const firstDate = blocks[0].date
    const lastDate = blocks[blocks.length - 1].date
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    doc.text(`${formatDate(firstDate)} — ${formatDate(lastDate)}`, margin, y)
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
    doc.text(formatDate(block.date), margin, y)
    y += 2

    // Message count badge
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    const countText = `${block.messages.length} ${block.messages.length === 1 ? "message" : "messages"}`
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
      doc.text(msg.sender, margin + 5, y)

      // Timestamp
      const senderWidth = doc.getTextWidth(msg.sender)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      doc.text(formatTime(msg.timestamp), margin + 5 + senderWidth + 3, y)
      y += 4

      // Message content
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.text)
      const content =
        msg.type !== "text"
          ? `[${msg.type}] ${msg.content || msg.mediaFilename || ""}`
          : msg.content

      const lines = doc.splitTextToSize(content, contentWidth - 5)
      for (const line of lines) {
        checkPageBreak(5)
        doc.text(line, margin + 5, y)
        y += 3.5
      }
      y += 3
    }

    // Comment section
    if (dayComment) {
      const commentText = stripHtml(dayComment)
      if (commentText.trim()) {
        checkPageBreak(16)

        // Comment background
        const commentLines = doc.splitTextToSize(commentText, contentWidth - 12)
        const commentHeight = commentLines.length * 3.5 + 10

        doc.setFillColor(...COLORS.cardBg)
        doc.setDrawColor(...COLORS.border)
        doc.roundedRect(margin, y - 1, contentWidth, commentHeight, 2, 2, "FD")

        // Comment label
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.primary)
        doc.text("NOTE", margin + 4, y + 4)
        y += 8

        // Comment text
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.text)
        for (const line of commentLines) {
          checkPageBreak(5)
          doc.text(line, margin + 4, y)
          y += 3.5
        }
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

  // Footer on last page
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.muted)
  doc.text(
    `Generated by Zaping on ${new Date().toLocaleDateString()}`,
    margin,
    pageHeight - 8
  )

  doc.save("chat-timeline.pdf")
}
