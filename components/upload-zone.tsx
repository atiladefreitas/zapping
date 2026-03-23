"use client"

import * as React from "react"
import { Upload, FileArchive, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { extractZip } from "@/lib/extract-zip"
import { parseWhatsApp } from "@/lib/parse-whatsapp"
import { setChatData } from "@/lib/chat-store"

type UploadState = "idle" | "dragging" | "extracting" | "parsing" | "error"

function UploadZone({ onComplete }: { onComplete: () => void }) {
  const [state, setState] = React.useState<UploadState>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Please upload a .zip file exported from WhatsApp.")
      setState("error")
      return
    }

    try {
      setError(null)
      setState("extracting")

      const { chatText, mediaMap } = await extractZip(file)

      setState("parsing")
      const chatData = parseWhatsApp(chatText, mediaMap)

      if (chatData.messages.length === 0) {
        throw new Error("No messages found in the chat file.")
      }

      setChatData(chatData)
      onComplete()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process file."
      setError(message)
      setState("error")
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setState("idle")

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setState("dragging")
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setState("idle")
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const isProcessing = state === "extracting" || state === "parsing"

  return (
    <Card
      data-slot="upload-zone"
      className={cn(
        "relative cursor-pointer border-2 border-dashed p-12 transition-colors",
        state === "dragging" && "border-primary bg-primary/5",
        state === "error" && "border-destructive",
        isProcessing && "pointer-events-none opacity-70"
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isProcessing && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={onChange}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {isProcessing ? (
          <>
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
            <div>
              <p className="font-medium">
                {state === "extracting"
                  ? "Extracting ZIP..."
                  : "Parsing messages..."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This may take a moment for large chats
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              {state === "dragging" ? (
                <FileArchive className="size-6 text-primary" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {state === "dragging"
                  ? "Drop your file here"
                  : "Drop your WhatsApp export here"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse. Accepts .zip files only
              </p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Card>
  )
}

export { UploadZone }
