"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageSquareText, Shield, Zap } from "lucide-react"

import { UploadZone } from "@/components/upload-zone"

export default function Page() {
  const router = useRouter()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Zaping
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View your exported WhatsApp conversations — entirely in your
            browser.
          </p>
        </div>

        {/* Upload */}
        <UploadZone onComplete={() => router.push("/viewer")} />

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1.5">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-muted">
              <Shield className="size-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium">100% Private</p>
            <p className="text-xs text-muted-foreground">
              Nothing leaves your device
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-muted">
              <Zap className="size-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium">Instant</p>
            <p className="text-xs text-muted-foreground">
              Parsed entirely in your browser
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-muted">
              <MessageSquareText className="size-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium">Full Media</p>
            <p className="text-xs text-muted-foreground">
              Images, video, audio &amp; docs
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Export a chat from WhatsApp &rarr; More &rarr; Export chat &rarr;
          Attach media &rarr; Upload the .zip here.
        </p>
      </div>
    </div>
  )
}
