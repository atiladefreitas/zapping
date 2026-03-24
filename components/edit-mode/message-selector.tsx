"use client"

import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useEditMode } from "@/hooks/use-edit-mode"
import { toggleMessageSelection } from "@/lib/edit-mode-store"
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

function SelectorDateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
        {formatDate(date)}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function SelectorMessage({
  message,
  isSelected,
  participant,
}: {
  message: Message
  isSelected: boolean
  participant?: Participant
}) {
  const senderColor = participant?.color ?? "oklch(0.5 0 0)"

  const checkboxId = `msg-check-${message.id}`

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-left transition-colors",
        isSelected ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
      )}
    >
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
        <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">
          {message.type !== "text"
            ? `[${message.type}] ${message.content || message.mediaFilename || ""}`
            : message.content}
        </p>
      </div>
      <Checkbox
        id={checkboxId}
        checked={isSelected}
        onCheckedChange={() => toggleMessageSelection(message.id)}
        className="mt-0.5 shrink-0"
      />
    </label>
  )
}

function MessageSelector({
  messages,
  participantMap,
}: {
  messages: Message[]
  participantMap: Map<string, Participant>
}) {
  const editState = useEditMode()

  const rows = React.useMemo(() => {
    const result: (
      | { kind: "date"; date: Date; key: string }
      | { kind: "message"; message: Message; key: string }
    )[] = []
    let lastDateStr = ""

    for (const msg of messages) {
      if (msg.type === "system") continue
      const dateStr = msg.timestamp.toDateString()
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr
        result.push({
          kind: "date",
          date: msg.timestamp,
          key: `date-${dateStr}`,
        })
      }
      result.push({ kind: "message", message: msg, key: msg.id })
    }

    return result
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Messages
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {rows.map((row) => {
          if (row.kind === "date") {
            return <SelectorDateSeparator key={row.key} date={row.date} />
          }
          return (
            <SelectorMessage
              key={row.key}
              message={row.message}
              isSelected={editState.selectedMessageIds.has(row.message.id)}
              participant={participantMap.get(row.message.sender)}
            />
          )
        })}
      </div>
    </div>
  )
}

export { MessageSelector }
