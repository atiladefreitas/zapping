"use client"

import { useI18n } from "@/lib/i18n"

function DateSeparator({ date }: { date: Date }) {
  const { dateLocale } = useI18n()

  const formatted = date.toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div data-slot="date-separator" className="flex items-center gap-3 py-4">
      <div className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {formatted}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export { DateSeparator }
