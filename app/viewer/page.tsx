"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { ThemeToggle } from "@/components/theme-provider"
import { LanguageSelector } from "@/components/language-selector"
import { Button } from "@/components/ui/button"
import { ChatView } from "@/components/chat-view"
import { EditModeLayout } from "@/components/edit-mode/edit-mode-layout"
import { EditModeToolbar } from "@/components/edit-mode/edit-mode-toolbar"
import { useChatStore } from "@/hooks/use-chat-store"
import { useEditMode } from "@/hooks/use-edit-mode"
import { buildDayBlocks } from "@/components/edit-mode/timeline-preview"
import { exportTimelinePdf } from "@/lib/export-pdf"
import { getComments } from "@/lib/edit-mode-store"
import { useI18n } from "@/lib/i18n"

export default function ViewerPage() {
  const router = useRouter()
  const chatData = useChatStore()
  const editState = useEditMode()
  const { t } = useI18n()

  // Redirect to home if no data loaded
  React.useEffect(() => {
    if (!chatData) {
      router.replace("/")
    }
  }, [chatData, router])

  const handleExportPdf = React.useCallback(async () => {
    if (!chatData) return

    const blocks = buildDayBlocks(
      chatData.messages,
      editState.selectedMessageIds
    )

    await exportTimelinePdf({
      blocks,
      allMessages: chatData.messages,
      comments: getComments(),
      participantMap: chatData.participantMap,
    })
  }, [chatData, editState.selectedMessageIds])

  if (!chatData) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("viewer.loading")}</p>
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/")}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="font-heading text-sm font-semibold">Zaping</span>
        <div className="ml-auto flex items-center gap-2">
          <EditModeToolbar
            messages={chatData.messages}
            onExportPdf={handleExportPdf}
          />
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {editState.active ? (
          <EditModeLayout chatData={chatData} />
        ) : (
          <ChatView chatData={chatData} />
        )}
      </div>
    </div>
  )
}
