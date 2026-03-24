import * as React from "react"

import {
  getEditModeState,
  subscribe,
  getCommentVersion,
  getComments,
  subscribeComments,
} from "@/lib/edit-mode-store"

export function useEditMode() {
  return React.useSyncExternalStore(
    subscribe,
    getEditModeState,
    getEditModeState
  )
}

/**
 * Subscribe only to comment changes. Components using this hook
 * will NOT re-render on selection/active-day changes, and vice-versa.
 * Returns the current comments Map — the same reference is reused, but
 * the component re-renders when the version counter bumps.
 */
export function useComments() {
  // Subscribe so we re-render on comment changes
  React.useSyncExternalStore(
    subscribeComments,
    getCommentVersion,
    getCommentVersion
  )
  return getComments()
}
