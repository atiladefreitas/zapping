"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { useEditMode } from "@/hooks/use-edit-mode"
import {
  setDayComment,
  setActiveDayKey,
  getComments,
} from "@/lib/edit-mode-store"
import { useI18n } from "@/lib/i18n"

function formatDate(dateString: string, dateLocale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function EditorToolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditor> | null
}) {
  const { t } = useI18n()

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label={t("commentEditor.bold")}
      >
        <Bold className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label={t("commentEditor.italic")}
      >
        <Italic className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label={t("commentEditor.underline")}
      >
        <UnderlineIcon className="size-3.5" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label={t("commentEditor.bulletList")}
      >
        <List className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label={t("commentEditor.orderedList")}
      >
        <ListOrdered className="size-3.5" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <Toggle
        size="sm"
        pressed={editor.isActive("link")}
        onPressedChange={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run()
          } else {
            const url = window.prompt(t("commentEditor.urlPrompt"))
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }
        }}
        aria-label={t("commentEditor.link")}
      >
        <LinkIcon className="size-3.5" />
      </Toggle>
    </div>
  )
}

function CommentEditor() {
  const editState = useEditMode()
  const { t, dateLocale } = useI18n()
  const activeDayKey = editState.activeDayKey
  // Read comments directly (not via reactive hook) to avoid
  // re-creating the editor on every keystroke.
  const existingComment = activeDayKey
    ? (getComments().get(activeDayKey) ?? "")
    : ""

  // Refs for the debounced save callback — kept stable across renders
  // so the tiptap onUpdate closure always writes to the correct day.
  const dayKeyRef = React.useRef(activeDayKey)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync the dayKey ref inside an effect (not during render) to satisfy
  // React Compiler rules while still giving onUpdate the latest value.
  React.useEffect(() => {
    dayKeyRef.current = activeDayKey
  }, [activeDayKey])

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          code: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
          },
        }),
      ],
      content: existingComment,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm dark:prose-invert min-h-[120px] max-w-none px-3 py-2 text-xs focus:outline-none",
            "[&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4",
            "[&_li]:my-0.5 [&_p]:my-1"
          ),
        },
      },
      onUpdate: ({ editor: ed }) => {
        // Debounce store writes so typing stays instant.
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          const key = dayKeyRef.current
          if (key) {
            setDayComment(key, ed.getHTML())
          }
        }, 300)
      },
    },
    [activeDayKey]
  )

  // Flush pending comment when switching to a different day so
  // in-flight edits from the previous day are not lost.
  // We read `activeDayKey` to trigger cleanup on change; the actual
  // flush uses `dayKeyRef` which still holds the *previous* value
  // at cleanup time.
  React.useEffect(() => {
    // Read activeDayKey so the linter sees it's used
    const _currentKey = activeDayKey
    void _currentKey
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      const key = dayKeyRef.current
      if (key && editor) {
        setDayComment(key, editor.getHTML())
      }
    }
  }, [activeDayKey, editor])

  if (!activeDayKey) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("commentEditor.notes")}
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-center text-xs text-muted-foreground">
            {t("commentEditor.emptyState")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("commentEditor.notes")}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {formatDate(activeDayKey, dateLocale)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setActiveDayKey(null)}
          title={t("commentEditor.closeEditor")}
        >
          <X className="size-3" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <EditorToolbar editor={editor} />
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}

export { CommentEditor }
