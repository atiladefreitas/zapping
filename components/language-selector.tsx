"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useI18n, type Locale } from "@/lib/i18n"

function USFlag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 7410 3900"
      className={className}
      role="img"
      aria-label="US Flag"
    >
      <title>US Flag</title>
      <rect width="7410" height="3900" fill="#b22234" />
      <path
        d="M0,450H7410m0,600H0m0,600H7410m0,600H0m0,600H7410m0,600H0"
        stroke="#fff"
        strokeWidth="300"
      />
      <rect width="2964" height="2100" fill="#3c3b6e" />
      <g fill="#fff">
        <g id="s18">
          <g id="s9">
            <g id="s5">
              <g id="s4">
                <path
                  id="s"
                  d="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z"
                />
                <use xlinkHref="#s" y="420" />
                <use xlinkHref="#s" y="840" />
                <use xlinkHref="#s" y="1260" />
              </g>
              <use xlinkHref="#s" y="1680" />
            </g>
            <use xlinkHref="#s4" x="494" y="210" />
          </g>
          <use xlinkHref="#s9" x="988" />
        </g>
        <use xlinkHref="#s18" x="1976" />
        <use xlinkHref="#s9" x="2964" />
      </g>
    </svg>
  )
}

function BrazilFlag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 504"
      className={className}
      role="img"
      aria-label="Brazil Flag"
    >
      <title>Brazil Flag</title>
      <rect width="720" height="504" fill="#009b3a" />
      <polygon points="360,42 668,252 360,462 52,252" fill="#fedf00" />
      <circle cx="360" cy="252" r="115" fill="#002776" />
      <path
        d="M232,252 C232,252 300,320 360,320 C420,320 488,252 488,252 C488,220 432,182 360,182 C288,182 232,220 232,252Z"
        fill="#fff"
      />
    </svg>
  )
}

const LOCALES: { id: Locale; flag: React.ElementType; label: string }[] = [
  { id: "en", flag: USFlag, label: "EN" },
  { id: "pt-BR", flag: BrazilFlag, label: "PT" },
]

function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]
  const CurrentFlag = current.flag

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        aria-label={`${t("lang.english")} / ${t("lang.portuguese")}`}
      >
        <CurrentFlag className="size-4 shrink-0 rounded-sm object-cover" />
        <span className="hidden sm:inline">{current.label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("size-3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        >
          <title>Chevron</title>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[8rem] rounded-md border bg-popover p-1 shadow-md">
          {LOCALES.map((l) => {
            const Flag = l.flag
            const isActive = locale === l.id
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLocale(l.id)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Flag className="size-4 shrink-0 rounded-sm" />
                <span>
                  {l.id === "en" ? t("lang.english") : t("lang.portuguese")}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { LanguageSelector }
