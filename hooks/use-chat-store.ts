import * as React from "react"

import { getChatData, subscribe } from "@/lib/chat-store"

export function useChatStore() {
  return React.useSyncExternalStore(subscribe, getChatData, () => null)
}
