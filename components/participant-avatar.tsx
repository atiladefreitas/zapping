"use client"

import * as React from "react"
import { Camera } from "lucide-react"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/participants"
import { setParticipantAvatar } from "@/lib/chat-store"
import { useI18n } from "@/lib/i18n"
import { type Participant } from "@/types/chat"

function ParticipantAvatar({
  participant,
  size = "default",
  editable = false,
  className,
}: {
  participant: Participant
  size?: "default" | "sm" | "lg"
  editable?: boolean
  className?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const initials = getInitials(participant.name)
  const { t } = useI18n()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setParticipantAvatar(participant.name, url)
  }

  function handleClick(e: React.MouseEvent) {
    if (!editable) return
    e.stopPropagation()
    inputRef.current?.click()
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setParticipantAvatar(participant.name, undefined)
  }

  return (
    <div className={cn("group/participant-avatar relative", className)}>
      <Avatar
        size={size}
        className={cn(
          editable && "cursor-pointer transition-opacity hover:opacity-80"
        )}
        onClick={handleClick}
      >
        {participant.avatarUrl && (
          <AvatarImage src={participant.avatarUrl} alt={participant.name} />
        )}
        <AvatarFallback
          className="font-semibold text-white"
          style={{ backgroundColor: participant.color }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          <button
            type="button"
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover/participant-avatar:opacity-100"
            onClick={handleClick}
          >
            <Camera className="size-3 text-white" />
          </button>

          {participant.avatarUrl && (
            <button
              type="button"
              className="text-destructive-foreground absolute -top-0.5 -right-0.5 z-10 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold opacity-0 transition-opacity group-hover/participant-avatar:opacity-100"
              onClick={handleRemove}
              title={t("participant.removePhoto")}
            >
              x
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}

export { ParticipantAvatar }
