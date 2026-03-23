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

export type Participant = {
  name: string
  avatarUrl?: string
  color: string
}

export type ChatData = {
  participants: string[]
  participantMap: Map<string, Participant>
  messages: Message[]
  mediaMap: Map<string, string>
}
