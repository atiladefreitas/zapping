"use client"

import * as React from "react"
import { FileText, Download, Play, Pause, Mic } from "lucide-react"

import { cn } from "@/lib/utils"
import { AudioWaveform } from "@/components/audio-waveform"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"
import { type Message } from "@/types/chat"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function ImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
}: {
  src: string
  alt: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-[90vw] border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-[90vw]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[85vh] rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}

// Keep a single AudioContext across all players to avoid browser limits
let sharedAudioCtx: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext()
  }
  return sharedAudioCtx
}

// WeakMap so each <audio> element gets connected exactly once
const sourceNodes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()

function AudioPlayer({ src }: { src: string }) {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const { t } = useI18n()

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Wire up the Web Audio AnalyserNode on first play
  function ensureAnalyser() {
    const audio = audioRef.current
    if (!audio || analyser) return

    const ctx = getAudioContext()
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    let source = sourceNodes.get(audio)
    if (!source) {
      source = ctx.createMediaElementSource(audio)
      sourceNodes.set(audio, source)
    }

    const node = ctx.createAnalyser()
    node.fftSize = 128
    node.smoothingTimeConstant = 0.7

    source.connect(node)
    node.connect(ctx.destination)

    setAnalyser(node)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      ensureAnalyser()
      audio.play()
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
  }

  return (
    <div className="flex w-full max-w-sm min-w-[240px] items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrentTime(0)
        }}
      >
        <track kind="captions" />
      </audio>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/80"
      >
        {playing ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 translate-x-0.5" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Waveform + seekable overlay */}
        <div
          className="relative cursor-pointer"
          onClick={handleSeek}
          onKeyDown={(e) => {
            const audio = audioRef.current
            if (!audio) return
            if (e.key === "ArrowRight") audio.currentTime += 5
            if (e.key === "ArrowLeft") audio.currentTime -= 5
          }}
          role="slider"
          aria-label={t("mediaPreview.audioProgress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          tabIndex={0}
        >
          <AudioWaveform analyser={analyser} playing={playing} height={28} />

          {/* Progress indicator line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 rounded-full bg-primary/60"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Time */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDuration(currentTime)}
          </span>
          <div className="flex items-center gap-1">
            <Mic className="size-2.5 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {duration > 0 ? formatDuration(duration) : "--:--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaPreview({ message }: { message: Message }) {
  const [lightbox, setLightbox] = React.useState(false)
  const { t } = useI18n()

  if (!message.mediaUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <FileText className="size-4" />
        <span>{message.mediaFilename ?? t("mediaPreview.unavailable")}</span>
      </div>
    )
  }

  switch (message.type) {
    case "image":
      return (
        <>
          <button
            type="button"
            className="block overflow-hidden rounded-md"
            onClick={() => setLightbox(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.mediaUrl}
              alt={message.mediaFilename ?? "Image"}
              loading="lazy"
              className="max-h-64 object-cover"
            />
          </button>
          <ImageLightbox
            src={message.mediaUrl}
            alt={message.mediaFilename ?? "Image"}
            open={lightbox}
            onOpenChange={setLightbox}
          />
        </>
      )

    case "sticker":
      return (
        <>
          <button
            type="button"
            className="block"
            onClick={() => setLightbox(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.mediaUrl}
              alt={message.mediaFilename ?? "Sticker"}
              loading="lazy"
              className="size-32 object-contain"
            />
          </button>
          <ImageLightbox
            src={message.mediaUrl}
            alt={message.mediaFilename ?? "Sticker"}
            open={lightbox}
            onOpenChange={setLightbox}
          />
        </>
      )

    case "video":
      return (
        <video
          src={message.mediaUrl}
          controls
          preload="none"
          className="max-h-64 rounded-md"
        >
          <track kind="captions" />
        </video>
      )

    case "audio":
      return <AudioPlayer src={message.mediaUrl} />

    case "document":
      return (
        <a
          href={message.mediaUrl}
          download={message.mediaFilename}
          className={cn(
            "flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
          )}
        >
          <FileText className="size-4 shrink-0" />
          <span className="min-w-0 truncate">
            {message.mediaFilename ?? t("mediaGallery.document")}
          </span>
          <Download className="ml-auto size-4 shrink-0" />
        </a>
      )

    default:
      return null
  }
}

export { MediaPreview }
