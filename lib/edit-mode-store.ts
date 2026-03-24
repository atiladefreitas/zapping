// Edit-mode state store: selection, comments, active state.
// Follows the same pub/sub pattern as chat-store.
//
// Comments are stored in a separate "silent" map that does NOT
// trigger subscriber notifications, so typing in the editor
// doesn't re-render every component. Only explicit "structural"
// changes (selection, active day, enter/exit) notify subscribers.

type Listener = () => void

type EditModeState = {
  active: boolean
  selectedMessageIds: Set<string>
  /** The date key of the day block currently being edited */
  activeDayKey: string | null
  /** Monotonic counter bumped on comment changes for targeted listeners */
  commentVersion: number
}

let state: EditModeState = {
  active: false,
  selectedMessageIds: new Set(),
  activeDayKey: null,
  commentVersion: 0,
}

/** Comments stored outside the reactive state to avoid full re-renders */
const comments = new Map<string, string>()

const listeners = new Set<Listener>()
const commentListeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function notifyComments(): void {
  for (const listener of commentListeners) {
    listener()
  }
}

// ── Main state accessors ─────────────────────────────────────────

export function getEditModeState(): EditModeState {
  return state
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ── Comment-specific accessors (separate subscription channel) ───

export function getComments(): Map<string, string> {
  return comments
}

export function getCommentVersion(): number {
  return state.commentVersion
}

export function subscribeComments(listener: Listener): () => void {
  commentListeners.add(listener)
  return () => commentListeners.delete(listener)
}

// ── Actions ──────────────────────────────────────────────────────

export function enterEditMode(): void {
  comments.clear()
  state = {
    active: true,
    selectedMessageIds: new Set(),
    activeDayKey: null,
    commentVersion: 0,
  }
  notify()
}

export function exitEditMode(): void {
  comments.clear()
  state = {
    active: false,
    selectedMessageIds: new Set(),
    activeDayKey: null,
    commentVersion: 0,
  }
  notify()
}

export function toggleMessageSelection(messageId: string): void {
  const next = new Set(state.selectedMessageIds)
  if (next.has(messageId)) {
    next.delete(messageId)
  } else {
    next.add(messageId)
  }
  state = { ...state, selectedMessageIds: next }
  notify()
}

export function selectAllMessages(messageIds: string[]): void {
  state = { ...state, selectedMessageIds: new Set(messageIds) }
  notify()
}

export function deselectAllMessages(): void {
  state = { ...state, selectedMessageIds: new Set() }
  notify()
}

/**
 * Update a day comment. Only notifies comment-specific listeners,
 * NOT the main store subscribers — so the message selector, toolbar,
 * etc. are never re-rendered during typing.
 */
export function setDayComment(dayKey: string, html: string): void {
  if (html.trim() === "" || html === "<p></p>") {
    comments.delete(dayKey)
  } else {
    comments.set(dayKey, html)
  }
  state = { ...state, commentVersion: state.commentVersion + 1 }
  notifyComments()
}

export function setActiveDayKey(dayKey: string | null): void {
  state = { ...state, activeDayKey: dayKey }
  notify()
}
