"use client";

import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Input,
  Popover,
  Separator,
  ToggleButton,
  Toolbar,
  Tooltip,
} from "@heroui/react";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type PageRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function keepEditorFocus(event: React.PointerEvent) {
  event.preventDefault();
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function ToolTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delay={400}>
      {children}
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function normalizeHref(raw: string) {
  const href = raw.trim();
  if (!href) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) return href;
  return `https://${href}`;
}

export function PageRichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
}: PageRichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value?.trim() ? value : "<p></p>",
    editorProps: {
      attributes: {
        class: "rich-text-editor__prosemirror prose-page",
      },
    },
    onUpdate: ({ editor: next }) => {
      onChange(next.getHTML());
    },
  });

  const ui = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          h1: false,
          h2: false,
          h3: false,
          bullet: false,
          ordered: false,
          quote: false,
          link: false,
          canUndo: false,
          canRedo: false,
          characters: 0,
          words: 0,
        };
      }
      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        h1: current.isActive("heading", { level: 1 }),
        h2: current.isActive("heading", { level: 2 }),
        h3: current.isActive("heading", { level: 3 }),
        bullet: current.isActive("bulletList"),
        ordered: current.isActive("orderedList"),
        quote: current.isActive("blockquote"),
        link: current.isActive("link"),
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        characters: current.storage.characterCount.characters(),
        words: current.storage.characterCount.words(),
      };
    },
  });

  const applyLink = () => {
    if (!editor) return;
    const href = normalizeHref(linkUrl);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    setLinkOpen(false);
  };

  return (
    <div className="rich-text-editor" data-disabled={editor ? undefined : "true"}>
      <div className="rich-text-editor__shell">
        <Toolbar
          aria-label="Text formatting"
          className="rich-text-editor__toolbar"
          onPointerDownCapture={keepEditorFocus}
        >
          <div className="rich-text-editor__toolbar-group">
            <ToolTip label="Bold">
              <ToggleButton
                aria-label="Bold"
                isIconOnly
                isSelected={ui?.bold}
                size="sm"
                onChange={() => editor?.chain().focus().toggleBold().run()}
              >
                <Icon>
                  <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
                  <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
                </Icon>
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Italic">
              <ToggleButton
                aria-label="Italic"
                isIconOnly
                isSelected={ui?.italic}
                size="sm"
                onChange={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Icon>
                  <line x1="19" x2="10" y1="4" y2="4" />
                  <line x1="14" x2="5" y1="20" y2="20" />
                  <line x1="15" x2="9" y1="4" y2="20" />
                </Icon>
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Underline">
              <ToggleButton
                aria-label="Underline"
                isIconOnly
                isSelected={ui?.underline}
                size="sm"
                onChange={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <Icon>
                  <path d="M6 4v6a6 6 0 0 0 12 0V4" />
                  <line x1="4" x2="20" y1="20" y2="20" />
                </Icon>
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Strikethrough">
              <ToggleButton
                aria-label="Strikethrough"
                isIconOnly
                isSelected={ui?.strike}
                size="sm"
                onChange={() => editor?.chain().focus().toggleStrike().run()}
              >
                <Icon>
                  <path d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                </Icon>
              </ToggleButton>
            </ToolTip>
          </div>

          <Separator orientation="vertical" />

          <div className="rich-text-editor__toolbar-group">
            <ToolTip label="Heading 1">
              <ToggleButton
                aria-label="Heading 1"
                isSelected={ui?.h1}
                size="sm"
                onChange={() =>
                  editor?.chain().focus().toggleHeading({ level: 1 }).run()
                }
              >
                H1
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Heading 2">
              <ToggleButton
                aria-label="Heading 2"
                isSelected={ui?.h2}
                size="sm"
                onChange={() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run()
                }
              >
                H2
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Heading 3">
              <ToggleButton
                aria-label="Heading 3"
                isSelected={ui?.h3}
                size="sm"
                onChange={() =>
                  editor?.chain().focus().toggleHeading({ level: 3 }).run()
                }
              >
                H3
              </ToggleButton>
            </ToolTip>
          </div>

          <Separator orientation="vertical" />

          <div className="rich-text-editor__toolbar-group">
            <ToolTip label="Bullet list">
              <ToggleButton
                aria-label="Bullet list"
                isIconOnly
                isSelected={ui?.bullet}
                size="sm"
                onChange={() =>
                  editor?.chain().focus().toggleBulletList().run()
                }
              >
                <Icon>
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </Icon>
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Numbered list">
              <ToggleButton
                aria-label="Numbered list"
                isIconOnly
                isSelected={ui?.ordered}
                size="sm"
                onChange={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
              >
                <Icon>
                  <line x1="10" x2="21" y1="6" y2="6" />
                  <line x1="10" x2="21" y1="12" y2="12" />
                  <line x1="10" x2="21" y1="18" y2="18" />
                  <path d="M4 6h1v4" />
                  <path d="M4 10h2" />
                  <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                </Icon>
              </ToggleButton>
            </ToolTip>
            <ToolTip label="Quote">
              <ToggleButton
                aria-label="Quote"
                isIconOnly
                isSelected={ui?.quote}
                size="sm"
                onChange={() =>
                  editor?.chain().focus().toggleBlockquote().run()
                }
              >
                <Icon>
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
                </Icon>
              </ToggleButton>
            </ToolTip>
          </div>

          <Separator orientation="vertical" />

          <div className="rich-text-editor__toolbar-group">
            <Popover
              isOpen={linkOpen}
              onOpenChange={(open) => {
                setLinkOpen(open);
                if (open && editor) {
                  setLinkUrl(
                    String(editor.getAttributes("link").href ?? ""),
                  );
                }
              }}
            >
              <ToggleButton
                aria-label="Link"
                isIconOnly
                isSelected={ui?.link || linkOpen}
                size="sm"
              >
                <Icon>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </Icon>
              </ToggleButton>
              <Popover.Content className="rich-text-editor__link-popover w-80">
                <Popover.Dialog className="space-y-3">
                  <Popover.Heading>Link</Popover.Heading>
                  <Input
                    aria-label="URL"
                    autoFocus
                    className="rich-text-editor__link-input"
                    fullWidth
                    placeholder="https:// or mailto:"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyLink();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      isDisabled={!ui?.link}
                      size="sm"
                      variant="tertiary"
                      onPress={() => {
                        editor
                          ?.chain()
                          .focus()
                          .extendMarkRange("link")
                          .unsetLink()
                          .run();
                        setLinkUrl("");
                        setLinkOpen(false);
                      }}
                    >
                      Remove
                    </Button>
                    <Button size="sm" onPress={applyLink}>
                      Apply
                    </Button>
                  </div>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </div>

          <Separator orientation="vertical" />

          <ButtonGroup size="sm" variant="tertiary">
            <ToolTip label="Undo">
              <Button
                aria-label="Undo"
                isDisabled={!ui?.canUndo}
                isIconOnly
                onPress={() => editor?.chain().focus().undo().run()}
              >
                <Icon>
                  <path d="M3 7v6h6" />
                  <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
                </Icon>
              </Button>
            </ToolTip>
            <ToolTip label="Redo">
              <Button
                aria-label="Redo"
                isDisabled={!ui?.canRedo}
                isIconOnly
                onPress={() => editor?.chain().focus().redo().run()}
              >
                <ButtonGroup.Separator />
                <Icon>
                  <path d="M21 7v6h-6" />
                  <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
                </Icon>
              </Button>
            </ToolTip>
          </ButtonGroup>
        </Toolbar>

        <div className="rich-text-editor__content">
          <EditorContent editor={editor} />
        </div>

        <div className="rich-text-editor__footer">
          <span className="rich-text-editor__character-count">
            {ui?.characters ?? 0} characters · {ui?.words ?? 0} words
          </span>
        </div>
      </div>
    </div>
  );
}
