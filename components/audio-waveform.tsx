"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const BAR_WIDTH = 3
const BAR_GAP = 2
const BAR_RADIUS = 1.5
const FADE_WIDTH = 16
const MIN_BAR_HEIGHT = 2

/**
 * Canvas-based audio waveform visualizer driven by an AnalyserNode.
 * Renders real-time frequency bars while the audio is playing and
 * shows a static idle pattern when paused.
 */
function AudioWaveform({
  analyser,
  playing,
  className,
  height = 32,
  barColor,
}: {
  analyser: AnalyserNode | null
  playing: boolean
  className?: string
  height?: number
  barColor?: string
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const rafRef = React.useRef<number>(0)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    function resize() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let dataArray: Uint8Array<ArrayBuffer> | null = null
    if (analyser) {
      dataArray = new Uint8Array(
        analyser.frequencyBinCount
      ) as Uint8Array<ArrayBuffer>
    }

    function getColor(): string {
      if (barColor) return barColor
      // Read the CSS --primary color from the canvas element
      const style = getComputedStyle(canvas!)
      return style.getPropertyValue("color") || "currentColor"
    }

    function draw() {
      if (!canvas || !ctx) return

      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      const barCount = Math.floor(w / (BAR_WIDTH + BAR_GAP))

      ctx.clearRect(0, 0, w, h)

      const color = getColor()

      // Get frequency data
      const values: number[] = []
      if (analyser && dataArray && playing) {
        analyser.getByteFrequencyData(dataArray)

        // Downsample frequency bins to bar count
        const binSize = Math.floor(dataArray.length / barCount)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < binSize; j++) {
            sum += dataArray[i * binSize + j]
          }
          // Normalize to 0..1
          values.push(sum / binSize / 255)
        }
      } else {
        // Idle: show a small static waveform pattern
        for (let i = 0; i < barCount; i++) {
          const t = i / barCount
          values.push(playing ? 0 : 0.08 + 0.06 * Math.sin(t * Math.PI * 4))
        }
      }

      // Create fade mask gradient
      const gradient = ctx.createLinearGradient(0, 0, w, 0)
      gradient.addColorStop(0, "rgba(0,0,0,0)")
      gradient.addColorStop(FADE_WIDTH / w, "rgba(0,0,0,1)")
      gradient.addColorStop(1 - FADE_WIDTH / w, "rgba(0,0,0,1)")
      gradient.addColorStop(1, "rgba(0,0,0,0)")

      // Draw to offscreen then apply fade via globalCompositeOperation
      ctx.save()

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.max(MIN_BAR_HEIGHT, values[i] * (h - 4))
        const x = i * (BAR_WIDTH + BAR_GAP)
        const y = (h - barHeight) / 2

        ctx.beginPath()
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, BAR_RADIUS)
        ctx.fillStyle = color
        ctx.fill()
      }

      // Apply fade edges
      ctx.globalCompositeOperation = "destination-in"
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [analyser, playing, barColor])

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full text-primary", className)}
      style={{ height }}
    />
  )
}

export { AudioWaveform }
