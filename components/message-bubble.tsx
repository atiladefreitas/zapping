"use client"

import { cn } from "@/lib/utils"
import { MediaPreview } from "@/components/media-preview"
import { ParticipantAvatar } from "@/components/participant-avatar"
import { useI18n } from "@/lib/i18n"
import { type Message, type Participant } from "@/types/chat"

// Simple URL detection for text messages
const URL_RE = /(https?:\/\/[^\s<]+)/g

function formatTime(date: Date, dateLocale: string): string {
  return date.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function TextContent({ content }: { content: string }) {
  const parts = content.split(URL_RE)

  return (
    <p className="text-sm break-words whitespace-pre-wrap">
      {parts.map((part) =>
        URL_RE.test(part) ? (
          <a
            key={part}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <span key={part}>{part}</span>
        )
      )}
    </p>
  )
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <div data-slot="system-message" className="flex justify-center py-1">
      <p className="max-w-sm rounded-md bg-muted/50 px-3 py-1 text-center text-xs text-muted-foreground">
        {message.content}
      </p>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  showSender,
  participant,
}: {
  message: Message
  isOwn: boolean
  showSender: boolean
  participant?: Participant
}) {
  const { t, dateLocale } = useI18n()

  if (message.type === "system") {
    return <SystemMessage message={message} />
  }

  const senderColor = participant?.color ?? "oklch(0.5 0 0)"

  if (message.isDeleted) {
    return (
      <div
        data-slot="message-bubble"
        className={cn(
          "flex items-end gap-2",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}
      >
        {showSender && !isOwn && participant && (
          <ParticipantAvatar participant={participant} size="sm" />
        )}
        <div
          className={cn(
            "max-w-[75%] rounded-lg px-3 py-2 text-sm text-muted-foreground italic",
            isOwn ? "rounded-br-sm bg-primary/10" : "rounded-bl-sm bg-muted"
          )}
        >
          {t("message.deleted")}
        </div>
      </div>
    )
  }

  const hasMedia = message.type !== "text"

  return (
    <div
      data-slot="message-bubble"
      className={cn(
        "flex items-end gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {showSender && !isOwn && participant && (
        <ParticipantAvatar participant={participant} size="sm" />
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2",
          isOwn ? "rounded-br-sm bg-primary/10" : "rounded-bl-sm bg-muted"
        )}
      >
        {showSender && (
          <p
            className="mb-0.5 text-xs font-semibold"
            style={{ color: senderColor }}
          >
            {message.sender}
          </p>
        )}

        {hasMedia && <MediaPreview message={message} />}

        {message.type === "text" && <TextContent content={message.content} />}

        <div className="mt-1 flex items-center justify-end gap-1">
          {message.isEdited && (
            <span className="text-[10px] text-muted-foreground">
              {t("message.edited")}
            </span>
          )}
          <time className="text-[10px] text-muted-foreground">
            {formatTime(message.timestamp, dateLocale)}
          </time>
        </div>
      </div>
    </div>
  )
}

export { MessageBubble }
