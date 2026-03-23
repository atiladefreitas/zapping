export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "sticker"
  | "document"
  | "system"

export type Message = {
  id: string
  timestamp: Date
  sender: string
  content: string
  type: MessageType
  mediaFilename?: string
  mediaUrl?: string
  isDeleted: boolean
  isEdited: boolean
}

export type ChatData = {
  participants: string[]
  messages: Message[]
  mediaMap: Map<string, string>
}
