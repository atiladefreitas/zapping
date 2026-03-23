"use client"

import * as React from "react"
import { Image as ImageIcon, Film, Mic, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { type Message, type MessageType } from "@/types/chat"

type MediaTab = "images" | "videos" | "audio" | "documents"

const TABS: { id: MediaTab; label: string; icon: React.ElementType }[] = [
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Film },
  { id: "audio", label: "Audio", icon: Mic },
  { id: "documents", label: "Docs", icon: FileText },
]

function matchesTab(type: MessageType, tab: MediaTab): boolean {
  switch (tab) {
    case "images":
      return type === "image" || type === "sticker"
    case "videos":
      return type === "video"
    case "audio":
      return type === "audio"
    case "documents":
      return type === "document"
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function MediaGallery({ mediaMessages }: { mediaMessages: Message[] }) {
  const [tab, setTab] = React.useState<MediaTab>("images")
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null)

  const counts = React.useMemo(() => {
    const c = { images: 0, videos: 0, audio: 0, documents: 0 }
    for (const msg of mediaMessages) {
      if (msg.type === "image" || msg.type === "sticker") c.images++
      else if (msg.type === "video") c.videos++
      else if (msg.type === "audio") c.audio++
      else if (msg.type === "document") c.documents++
    }
    return c
  }, [mediaMessages])

  const filtered = React.useMemo(
    () => mediaMessages.filter((m) => matchesTab(m.type, tab)),
    [mediaMessages, tab]
  )

  // Default to first non-empty tab
  React.useEffect(() => {
    if (counts.images > 0) return
    for (const t of TABS) {
      if (counts[t.id] > 0) {
        setTab(t.id)
        return
      }
    }
  }, [counts])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <ImageIcon className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shared Media</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-2">
          {TABS.map((t) => {
            const count = counts[t.id]
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  tab === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No {tab} shared in this chat</p>
            </div>
          ) : tab === "images" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {filtered.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-md bg-muted"
                  onClick={() => setSelectedImage(msg.mediaUrl ?? null)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={msg.mediaUrl}
                    alt={msg.mediaFilename ?? "Image"}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-[10px] text-white">
                      {msg.sender}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : tab === "videos" ? (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <video
                    src={msg.mediaUrl}
                    controls
                    preload="none"
                    className="w-full rounded-md"
                  >
                    <track kind="captions" />
                  </video>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">{msg.sender}</span>
                    <span>{formatDate(msg.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "audio" ? (
            <div className="space-y-2">
              {filtered.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Mic className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {msg.mediaFilename ?? "Audio message"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {msg.sender} &middot; {formatDate(msg.timestamp)}
                    </p>
                  </div>
                  <audio
                    src={msg.mediaUrl}
                    controls
                    preload="none"
                    className="h-8 w-32 shrink-0"
                  >
                    <track kind="captions" />
                  </audio>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((msg) => (
                <a
                  key={msg.id}
                  href={msg.mediaUrl}
                  download={msg.mediaFilename}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <FileText className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {msg.mediaFilename ?? "Document"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {msg.sender} &middot; {formatDate(msg.timestamp)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Image lightbox nested dialog */}
        <Dialog
          open={!!selectedImage}
          onOpenChange={(open) => {
            if (!open) setSelectedImage(null)
          }}
        >
          <DialogContent
            showCloseButton
            className="max-w-[90vw] border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-[90vw]"
          >
            {selectedImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedImage}
                alt="Full size preview"
                className="mx-auto max-h-[85vh] rounded-lg object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

export { MediaGallery }
