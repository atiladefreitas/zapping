"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { ThemeToggle } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { ChatView } from "@/components/chat-view"
import { useChatStore } from "@/hooks/use-chat-store"

export default function ViewerPage() {
  const router = useRouter()
  const chatData = useChatStore()

  // Redirect to home if no data loaded
  React.useEffect(() => {
    if (!chatData) {
      router.replace("/")
    }
  }, [chatData, router])

  if (!chatData) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
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
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ChatView chatData={chatData} />
      </div>
    </div>
  )
}
