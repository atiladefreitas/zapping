"use client"

import * as React from "react"

import { MessageSelector } from "@/components/edit-mode/message-selector"
import { TimelinePreview } from "@/components/edit-mode/timeline-preview"
import { CommentEditor } from "@/components/edit-mode/comment-editor"
import { type ChatData } from "@/types/chat"

function EditModeLayout({ chatData }: { chatData: ChatData }) {
  return (
    <div className="grid h-full grid-cols-[1fr_1.2fr_1fr] divide-x divide-border overflow-hidden">
      {/* Left column: message selector with checkboxes */}
      <div className="min-h-0">
        <MessageSelector
          messages={chatData.messages}
          participantMap={chatData.participantMap}
        />
      </div>

      {/* Middle column: timeline preview (sticky within viewport) */}
      <div className="min-h-0">
        <TimelinePreview
          messages={chatData.messages}
          participantMap={chatData.participantMap}
        />
      </div>

      {/* Right column: rich text comment editor (sticky within viewport) */}
      <div className="min-h-0">
        <CommentEditor />
      </div>
    </div>
  )
}

export { EditModeLayout }
