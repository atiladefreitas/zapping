import { type ChatData } from "@/types/chat"

// Simple event-driven store for chat data shared across client components.
// Avoids prop-drilling through the router boundary (page → viewer page).

type Listener = () => void

let chatData: ChatData | null = null
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function setChatData(data: ChatData | null): void {
  chatData = data
  notify()
}

export function getChatData(): ChatData | null {
  return chatData
}

/**
 * Update a participant's avatar URL. Creates a new ChatData reference
 * so React picks up the change via useSyncExternalStore.
 */
export function setParticipantAvatar(
  name: string,
  avatarUrl: string | undefined
): void {
  if (!chatData) return

  const participant = chatData.participantMap.get(name)
  if (!participant) return

  const newMap = new Map(chatData.participantMap)
  newMap.set(name, { ...participant, avatarUrl })

  chatData = { ...chatData, participantMap: newMap }
  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
