import { type ChatData } from "@/types/chat"

// Simple event-driven store for chat data shared across client components.
// Avoids prop-drilling through the router boundary (page → viewer page).

type Listener = () => void

let chatData: ChatData | null = null
const listeners = new Set<Listener>()

export function setChatData(data: ChatData | null): void {
  chatData = data
  for (const listener of listeners) {
    listener()
  }
}

export function getChatData(): ChatData | null {
  return chatData
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
