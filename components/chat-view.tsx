"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Search, X, MessageSquare } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { MessageBubble } from "@/components/message-bubble"
import { DateSeparator } from "@/components/date-separator"
import { MediaGallery } from "@/components/media-gallery"
import { ParticipantAvatar } from "@/components/participant-avatar"
import { type ChatData, type Message } from "@/types/chat"

type RowItem =
  | { kind: "date"; date: Date; key: string }
  | { kind: "message"; message: Message; key: string }

function buildRows(messages: Message[]): RowItem[] {
  const rows: RowItem[] = []
  let lastDateStr = ""

  for (const msg of messages) {
    const dateStr = msg.timestamp.toDateString()
    if (dateStr !== lastDateStr) {
      lastDateStr = dateStr
      rows.push({
        kind: "date",
        date: msg.timestamp,
        key: `date-${dateStr}`,
      })
    }
    rows.push({ kind: "message", message: msg, key: msg.id })
  }

  return rows
}

function ChatView({ chatData }: { chatData: ChatData }) {
  const [search, setSearch] = React.useState("")
  const [showSearch, setShowSearch] = React.useState(false)
  const parentRef = React.useRef<HTMLDivElement>(null)

  const showSenderNames = chatData.participants.length >= 2

  // Detect "own" participant: the one with the most messages
  const ownParticipant = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const msg of chatData.messages) {
      if (msg.sender) {
        counts.set(msg.sender, (counts.get(msg.sender) ?? 0) + 1)
      }
    }
    let max = 0
    let maxSender = ""
    for (const [sender, count] of counts) {
      if (count > max) {
        max = count
        maxSender = sender
      }
    }
    return maxSender
  }, [chatData.messages])

  const mediaMessages = React.useMemo(
    () =>
      chatData.messages.filter(
        (m) =>
          m.mediaUrl &&
          (m.type === "image" ||
            m.type === "sticker" ||
            m.type === "video" ||
            m.type === "audio" ||
            m.type === "document")
      ),
    [chatData.messages]
  )

  const filteredMessages = React.useMemo(() => {
    if (!search.trim()) return chatData.messages
    const lower = search.toLowerCase()
    return chatData.messages.filter(
      (m) =>
        m.content.toLowerCase().includes(lower) ||
        m.sender.toLowerCase().includes(lower)
    )
  }, [chatData.messages, search])

  const rows = React.useMemo(
    () => buildRows(filteredMessages),
    [filteredMessages]
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index]
      if (row.kind === "date") return 52
      const msg = row.message
      if (msg.type === "system") return 40
      if (msg.type === "image" || msg.type === "sticker") return 300
      if (msg.type === "video") return 300
      if (msg.type === "audio") return 100
      if (msg.type === "document") return 80
      // Text: rough estimate based on content length
      const lines = Math.ceil(msg.content.length / 60) + 1
      return Math.max(64, lines * 20 + 40)
    },
    overscan: 10,
    measureElement: (el) => el.getBoundingClientRect().height,
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <AvatarGroup>
            {chatData.participants.slice(0, 3).map((name) => {
              const participant = chatData.participantMap.get(name)
              if (!participant) return null
              return (
                <ParticipantAvatar
                  key={name}
                  participant={participant}
                  size="sm"
                  editable
                />
              )
            })}
            {chatData.participants.length > 3 && (
              <AvatarGroupCount>
                +{chatData.participants.length - 3}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          <div>
            <h2 className="text-sm font-semibold">
              {chatData.participants.length <= 3
                ? chatData.participants.join(", ")
                : `${chatData.participants.slice(0, 2).join(", ")} +${chatData.participants.length - 2}`}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="size-3" />
              <span>{chatData.messages.length.toLocaleString()} messages</span>
              {chatData.mediaMap.size > 0 && (
                <span>
                  &middot; {chatData.mediaMap.size.toLocaleString()} media
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {mediaMessages.length > 0 && (
            <MediaGallery mediaMessages={mediaMessages} />
          )}
          {showSearch ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-48"
                autoFocus
              />
              {search && (
                <Badge variant="secondary" className="shrink-0">
                  {filteredMessages.length.toLocaleString()} results
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowSearch(false)
                  setSearch("")
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
            >
              <Search className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Virtualized message list */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          className="relative mx-auto w-full max-w-3xl"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]

            return (
              <div
                key={row.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full px-4 pb-1"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.kind === "date" ? (
                  <DateSeparator date={row.date} />
                ) : (
                  <MessageBubble
                    message={row.message}
                    isOwn={row.message.sender === ownParticipant}
                    showSender={showSenderNames}
                    participant={chatData.participantMap.get(
                      row.message.sender
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { ChatView }
