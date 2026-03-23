"use client"

import { cn } from "@/lib/utils"
import { MediaPreview } from "@/components/media-preview"
import { type Message } from "@/types/chat"

// Simple URL detection for text messages
const URL_RE = /(https?:\/\/[^\s<]+)/g

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
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
  senderColor,
}: {
  message: Message
  isOwn: boolean
  showSender: boolean
  senderColor: string
}) {
  if (message.type === "system") {
    return <SystemMessage message={message} />
  }

  if (message.isDeleted) {
    return (
      <div
        data-slot="message-bubble"
        className={cn("flex", isOwn ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "max-w-[75%] rounded-lg px-3 py-2 text-sm text-muted-foreground italic",
            isOwn ? "rounded-br-sm bg-primary/10" : "rounded-bl-sm bg-muted"
          )}
        >
          This message was deleted
        </div>
      </div>
    )
  }

  const hasMedia = message.type !== "text"

  return (
    <div
      data-slot="message-bubble"
      className={cn("flex", isOwn ? "justify-end" : "justify-start")}
    >
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
            <span className="text-[10px] text-muted-foreground">edited</span>
          )}
          <time className="text-[10px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </time>
        </div>
      </div>
    </div>
  )
}

export { MessageBubble }
