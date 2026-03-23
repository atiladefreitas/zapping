function DateSeparator({ date }: { date: Date }) {
  const formatted = date.toLocaleDateString(undefined, {
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
