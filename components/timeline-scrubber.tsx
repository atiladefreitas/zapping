"use client"

import * as React from "react"
import { type Virtualizer } from "@tanstack/react-virtual"

import { useI18n } from "@/lib/i18n"

type RowItem =
  | { kind: "date"; date: Date; key: string }
  | { kind: "message"; message: { timestamp: Date }; key: string }

type MonthEntry = {
  label: string
  shortLabel: string
  year: number
  month: number
  rowIndex: number
}

function buildMonthIndex(rows: RowItem[], dateLocale: string): MonthEntry[] {
  const months: MonthEntry[] = []
  let lastKey = ""

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const date = row.kind === "date" ? row.date : row.message.timestamp
    const year = date.getFullYear()
    const month = date.getMonth()
    const key = `${year}-${month}`

    if (key !== lastKey) {
      lastKey = key
      months.push({
        label: date.toLocaleDateString(dateLocale, {
          month: "long",
          year: "numeric",
        }),
        shortLabel: date.toLocaleDateString(dateLocale, {
          month: "short",
          year: "2-digit",
        }),
        year,
        month,
        rowIndex: i,
      })
    }
  }

  return months
}

function TimelineScrubber({
  rows,
  virtualizer,
  parentRef,
  visibleDate,
}: {
  rows: RowItem[]
  virtualizer: Virtualizer<HTMLDivElement, Element>
  parentRef: React.RefObject<HTMLDivElement | null>
  visibleDate: Date | null
}) {
  const { dateLocale } = useI18n()
  const months = React.useMemo(
    () => buildMonthIndex(rows, dateLocale),
    [rows, dateLocale]
  )
  const [hoveredMonth, setHoveredMonth] = React.useState<string | null>(null)
  const [isScrolling, setIsScrolling] = React.useState(false)
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = React.useState(0)

  // Derive active month from the visibleDate prop (computed by parent from virtualizer)
  const activeMonth = visibleDate
    ? `${visibleDate.getFullYear()}-${visibleDate.getMonth()}`
    : null

  const tooltipDate = visibleDate
    ? visibleDate.toLocaleDateString(dateLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  // Track scroll position for progress indicator and scroll state
  React.useEffect(() => {
    const scrollEl = parentRef.current
    if (!scrollEl) return

    function onScroll() {
      if (!scrollEl) return

      setIsScrolling(true)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 1200)

      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
      if (maxScroll > 0) {
        setScrollProgress(scrollEl.scrollTop / maxScroll)
      }
    }

    scrollEl.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      scrollEl.removeEventListener("scroll", onScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [parentRef])

  function handleMonthClick(entry: MonthEntry) {
    virtualizer.scrollToIndex(entry.rowIndex, { align: "start" })
  }

  // Handle drag-scrubbing on the track
  function handleTrackInteraction(clientY: number) {
    const track = trackRef.current
    if (!track || months.length === 0) return

    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const monthIndex = Math.round(ratio * (months.length - 1))
    const entry = months[monthIndex]
    if (entry) {
      virtualizer.scrollToIndex(entry.rowIndex, { align: "start" })
    }
  }

  const [isDragging, setIsDragging] = React.useState(false)

  const handleTrackInteractionRef = React.useRef(handleTrackInteraction)
  React.useEffect(() => {
    handleTrackInteractionRef.current = handleTrackInteraction
  })

  React.useEffect(() => {
    if (!isDragging) return

    function onMouseMove(e: MouseEvent) {
      e.preventDefault()
      handleTrackInteractionRef.current(e.clientY)
    }

    function onMouseUp() {
      setIsDragging(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [isDragging])

  if (months.length <= 1) return null

  // Decide which labels to show based on density
  const showAllLabels = months.length <= 24
  const showYearOnly = months.length > 48

  return (
    <div
      data-slot="timeline-scrubber"
      className="relative flex h-full w-10 flex-col items-center py-2"
    >
      {/* Floating date tooltip */}
      {(isScrolling || isDragging) && tooltipDate && (
        <div
          className="pointer-events-none absolute right-12 z-50 min-w-[10rem] rounded-md bg-popover px-2 py-2 text-sm font-medium text-popover-foreground shadow-md ring-1 ring-border"
          style={{
            top: `calc(${scrollProgress * 100}% - 14px)`,
          }}
        >
          <p className="shrink-0 flex-nowrap">{tooltipDate}</p>
        </div>
      )}

      {/* Month track */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={months.length - 1}
        aria-valuenow={months.findIndex(
          (m) => `${m.year}-${m.month}` === activeMonth
        )}
        tabIndex={0}
        className="relative flex h-full flex-col justify-between"
        onMouseDown={(e) => {
          setIsDragging(true)
          handleTrackInteraction(e.clientY)
        }}
      >
        {months.map((entry) => {
          const key = `${entry.year}-${entry.month}`
          const isActive = activeMonth === key
          const isHovered = hoveredMonth === key

          return (
            <button
              key={key}
              type="button"
              className="group relative flex items-center justify-center"
              onClick={() => handleMonthClick(entry)}
              onMouseEnter={() => setHoveredMonth(key)}
              onMouseLeave={() => setHoveredMonth(null)}
              title={entry.label}
            >
              {/* Dot indicator */}
              <div
                className={`size-1.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? "scale-150 bg-primary"
                    : isHovered
                      ? "scale-125 bg-muted-foreground"
                      : "bg-border"
                }`}
              />

              {/* Month label on hover or when active */}
              {(isActive || isHovered) && (
                <span
                  className={`pointer-events-none absolute right-5 rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-sm ring-1 ring-border ${
                    isActive
                      ? "bg-primary text-primary-foreground ring-primary/30"
                      : "bg-popover text-popover-foreground"
                  }`}
                >
                  {showYearOnly
                    ? entry.year.toString()
                    : showAllLabels
                      ? entry.shortLabel
                      : entry.shortLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { TimelineScrubber, buildMonthIndex }
export type { RowItem as TimelineRowItem, MonthEntry }
