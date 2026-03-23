# 🗺️ Masterplan — WhatsApp Conversation Viewer

## Stack & Tooling

- **Next.js 14+ (App Router)**
- **shadcn/ui** (default theme) + **Tailwind CSS**
- **JSZip** — client-side ZIP decompression
- **100% client-side** — zero backend, zero data uploaded to any server
- **TypeScript**

---

## Phase 1 — Scaffolding

```bash
npx create-next-app@latest wa-viewer --typescript --tailwind --app
cd wa-viewer
npx shadcn@latest init
npx shadcn@latest add card scroll-area avatar badge button
pnpm add jszip
```

Relevant folder structure:
```
src/
  app/
    page.tsx              ← Upload screen
    viewer/page.tsx       ← Conversation viewer
  components/
    upload-zone.tsx
    chat-view.tsx
    message-bubble.tsx
    media-preview.tsx
    date-separator.tsx
  lib/
    parse-whatsapp.ts     ← Core parser
    extract-zip.ts        ← ZIP handler
  types/
    chat.ts
```

---

## Phase 2 — ZIP Extraction (client-side)

`extract-zip.ts` uses **JSZip** to read the file directly in the browser:

- Reads the `.zip` via `FileReader` → `ArrayBuffer`
- Extracts the `_chat.txt` file (or `WhatsApp Chat with *.txt`)
- Extracts all media files (`.jpg`, `.mp4`, `.opus`, `.webp`, etc.)
- Creates a `Map<filename, ObjectURL>` using `URL.createObjectURL()` to serve media locally without any network requests

---

## Phase 3 — Chat Parser (`parse-whatsapp.ts`)

WhatsApp export format varies slightly by region/OS version, but the two common patterns are:

```
[DD/MM/YYYY, HH:MM:SS] Name: message
```
or
```
DD/MM/YYYY HH:MM - Name: message
```

The parser will:

1. **Auto-detect the format** (bracketed vs. dash-separated, `/` vs `.` date separator, 12h vs. 24h clock)
2. **Adaptive regex** to cover both variants
3. Build a `Message[]` array:

```ts
// types/chat.ts
type Message = {
  id: string
  timestamp: Date
  sender: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'sticker' | 'document' | 'system'
  mediaFilename?: string   // original filename inside the zip
  mediaUrl?: string        // resolved Object URL
  isDeleted: boolean       // "This message was deleted"
  isEdited: boolean        // "(edited)"
}

type ChatData = {
  participants: string[]
  messages: Message[]
  mediaMap: Map<string, string>  // filename → objectURL
}
```

4. Detect system messages ("created the group", "added", "left")
5. Resolve `mediaFilename` → `mediaUrl` via the `mediaMap`

---

## Phase 4 — UI / Components

### `upload-zone.tsx`
- Drag & drop zone (or click to select)
- Accepts `.zip` only
- Shows extraction/parse progress
- Built with shadcn's `Card`

### `chat-view.tsx`
- Virtualized (or paginated) message list — long chats can have 50k+ messages
- Groups messages by date with `DateSeparator`
- Uses shadcn's `ScrollArea`
- Header showing participant names + message count

### `message-bubble.tsx`
- Left/right bubble based on sender ("you" is detected as the participant with the most messages, or the user can pick manually)
- Formatted timestamp
- Sender name badge for group chats
- Conditional rendering by `type`:
  - `text` → paragraph with link detection
  - `image` → `<img>` with a simple lightbox
  - `video` → `<video controls>`
  - `audio` → `<audio controls>` (`.opus` files have native support in Chrome/Firefox)
  - `document` → icon + download link
  - `system` → centered muted text

### `date-separator.tsx`
- Centered date line between groups of messages from different days

---

## Phase 5 — Performance

Exported chats can have **tens of thousands** of messages. Strategy:

- **Windowing**: render only visible messages using `@tanstack/react-virtual`
- **Lazy media**: `loading="lazy"` on images, load videos only on demand
- Parser runs in a **Web Worker** to avoid blocking the UI (optional but recommended)
- `useMemo` on date grouping computation

---

## Phase 6 — Extra Features (nice to have)

- 🔍 **Search** — full-text search across messages
- 📊 **Stats** — message count per participant, media sent, most active day
- 🌙 **Dark/Light mode** — shadcn supports this natively
- 📅 **Jump to date** — calendar picker to navigate directly to a specific date
- 💾 **Persistence** — save the parsed chat in `localStorage`/`IndexedDB` so the user doesn't need to re-upload

---

## Execution Order

| # | Step | Deliverable |
|---|------|-------------|
| 1 | Scaffold + shadcn setup | Project running locally |
| 2 | `extract-zip.ts` | ZIP opens, txt + media extracted |
| 3 | `parse-whatsapp.ts` | Correct `Message[]` array |
| 4 | Upload zone + parse flow | Upload → data visible in console |
| 5 | `chat-view` + basic `message-bubble` | Conversation rendering on screen |
| 6 | Media support | Images/videos/audio playing inline |
| 7 | Performance (virtualization) | Smooth with 50k+ messages |
| 8 | Polish + extras | Search, stats, etc. |

---

Ready to start building? We can kick off with Phase 1 right now.
