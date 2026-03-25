"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageSquareText, Shield, Zap } from "lucide-react"

import { ThemeToggle } from "@/components/theme-provider"
import { LanguageSelector } from "@/components/language-selector"
import { UploadZone } from "@/components/upload-zone"
import { useI18n } from "@/lib/i18n"

export default function Page() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="fixed top-4 right-4 flex items-center gap-1">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Zaping
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("home.subtitle")}
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
            <p className="text-xs font-medium">{t("home.private")}</p>
            <p className="text-xs text-muted-foreground">
              {t("home.privateDesc")}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-muted">
              <Zap className="size-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium">{t("home.instant")}</p>
            <p className="text-xs text-muted-foreground">
              {t("home.instantDesc")}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-muted">
              <MessageSquareText className="size-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium">{t("home.fullMedia")}</p>
            <p className="text-xs text-muted-foreground">
              {t("home.fullMediaDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
