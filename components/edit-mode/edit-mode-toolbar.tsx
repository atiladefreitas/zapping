"use client"

import * as React from "react"
import { Pencil, X, FileDown, CheckSquare, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useEditMode } from "@/hooks/use-edit-mode"
import {
  enterEditMode,
  exitEditMode,
  selectAllMessages,
  deselectAllMessages,
} from "@/lib/edit-mode-store"
import { type Message } from "@/types/chat"

function EditModeToolbar({
  messages,
  onExportPdf,
}: {
  messages: Message[]
  onExportPdf: () => void
}) {
  const editState = useEditMode()

  const nonSystemMessages = React.useMemo(
    () => messages.filter((m) => m.type !== "system"),
    [messages]
  )

  if (!editState.active) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={enterEditMode}
        className="gap-1.5"
      >
        <Pencil className="size-3" />
        Edit Mode
      </Button>
    )
  }

  const selectedCount = editState.selectedMessageIds.size
  const totalCount = nonSystemMessages.length
  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="gap-1">
        {selectedCount} / {totalCount} selected
      </Badge>

      <Separator orientation="vertical" className="h-4" />

      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          if (allSelected) {
            deselectAllMessages()
          } else {
            selectAllMessages(nonSystemMessages.map((m) => m.id))
          }
        }}
        className="gap-1"
      >
        {allSelected ? (
          <Square className="size-3" />
        ) : (
          <CheckSquare className="size-3" />
        )}
        {allSelected ? "Deselect all" : "Select all"}
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={onExportPdf}
        disabled={selectedCount === 0}
        className="gap-1.5"
      >
        <FileDown className="size-3" />
        Export PDF
      </Button>

      <Separator orientation="vertical" className="h-4" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={exitEditMode}
        title="Exit edit mode"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

export { EditModeToolbar }
