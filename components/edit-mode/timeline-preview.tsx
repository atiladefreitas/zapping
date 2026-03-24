"use client"

import * as React from "react"
import { MessageSquareText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEditMode, useComments } from "@/hooks/use-edit-mode"
import { setActiveDayKey } from "@/lib/edit-mode-store"
import { type Message, type Participant } from "@/types/chat"

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

type DayBlock = {
  dayKey: string
  date: Date
  messages: Message[]
}

function buildDayBlocks(
  messages: Message[],
  selectedIds: Set<string>
): DayBlock[] {
  const selected = messages.filter((m) => selectedIds.has(m.id))
  const blocks: DayBlock[] = []
  let currentBlock: DayBlock | null = null

  for (const msg of selected) {
    const dayKey = msg.timestamp.toDateString()
    if (!currentBlock || currentBlock.dayKey !== dayKey) {
      currentBlock = { dayKey, date: msg.timestamp, messages: [] }
      blocks.push(currentBlock)
    }
    currentBlock.messages.push(msg)
  }

  return blocks
}

function TimelineMessage({
  message,
  participant,
}: {
  message: Message
  participant?: Participant
}) {
  const senderColor = participant?.color ?? "oklch(0.5 0 0)"

  return (
    <div className="flex items-start gap-2 py-1.5">
      <div
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: senderColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-xs font-semibold"
            style={{ color: senderColor }}
          >
            {message.sender}
          </span>
          <time className="text-[10px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </time>
        </div>
        <p className="mt-0.5 text-xs break-words whitespace-pre-wrap text-foreground/80">
          {message.type !== "text"
            ? `[${message.type}] ${message.content || message.mediaFilename || ""}`
            : message.content}
        </p>
      </div>
    </div>
  )
}

function DayBlockCard({
  block,
  participantMap,
  hasComment,
  isActive,
}: {
  block: DayBlock
  participantMap: Map<string, Participant>
  hasComment: boolean
  isActive: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-shadow",
        isActive && "ring-2 ring-primary/30"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold">{formatDate(block.date)}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {block.messages.length}{" "}
            {block.messages.length === 1 ? "message" : "messages"}
          </Badge>
          {hasComment && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <MessageSquareText className="size-2.5" />
              Note
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {block.messages.map((msg) => (
          <TimelineMessage
            key={msg.id}
            message={msg}
            participant={participantMap.get(msg.sender)}
          />
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 text-muted-foreground"
          onClick={() => setActiveDayKey(block.dayKey)}
        >
          <MessageSquareText className="size-3" />
          {hasComment ? "Edit note" : "Add note"}
        </Button>
      </div>
    </div>
  )
}

function TimelinePreview({
  messages,
  participantMap,
}: {
  messages: Message[]
  participantMap: Map<string, Participant>
}) {
  const editState = useEditMode()
  const comments = useComments()
  const blocks = React.useMemo(
    () => buildDayBlocks(messages, editState.selectedMessageIds),
    [messages, editState.selectedMessageIds]
  )

  if (editState.selectedMessageIds.size === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Timeline
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-center text-xs text-muted-foreground">
            Select messages from the left panel to build your timeline
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Timeline
        </h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {blocks.map((block) => (
          <DayBlockCard
            key={block.dayKey}
            block={block}
            participantMap={participantMap}
            hasComment={comments.has(block.dayKey)}
            isActive={editState.activeDayKey === block.dayKey}
          />
        ))}
      </div>
    </div>
  )
}

export { TimelinePreview, buildDayBlocks, type DayBlock }
