import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Link as LinkIcon, Highlighter,
  Undo, Redo, Type,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolbarButton({
  active, onClick, title, children,
}: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-200" />;
}

export default function BlockEditor({ value, onChange, placeholder, minHeight = 400 }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'not-prose' } },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-orange-600 underline cursor-pointer' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your content here… Press "/" for blocks.',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none font-bengali',
        style: `min-height:${minHeight}px`,
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl('');
  };

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* ── Fixed Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
        {/* History */}
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} active={false}>
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} active={false}>
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Divider />

        {/* Headings */}
        <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Paragraph" active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}>
          <Type className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Divider />

        {/* Marks */}
        <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Inline Code" active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Highlight" active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Divider />

        {/* Lists */}
        <ToolbarButton title="Bullet List" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Ordered List" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Divider" active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Divider />

        {/* Alignment */}
        <ToolbarButton title="Align Left" active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Align Center" active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Align Right" active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Justify" active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Divider />

        {/* Link */}
        <div className="relative">
          <ToolbarButton title="Link" active={editor.isActive('link')}
            onClick={() => {
              setLinkUrl(editor.getAttributes('link').href ?? '');
              setLinkOpen(v => !v);
            }}>
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          {linkOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 flex w-72 items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-orange-400 focus:outline-none"
                placeholder="https://…"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setLink(); if (e.key === 'Escape') setLinkOpen(false); }}
                autoFocus
              />
              <button type="button" onClick={setLink}
                className="rounded-lg bg-orange-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700">
                Set
              </button>
              <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor Canvas ── */}
      <div className="px-6 py-5">
        <EditorContent editor={editor} />
      </div>

      {/* ── Word count footer ── */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-1.5 text-[10px] text-gray-400">
        <span>{editor.storage.characterCount?.words() ?? 0} words</span>
        <span>{editor.getHTML().replace(/<[^>]+>/g, '').length} chars</span>
      </div>
    </div>
  );
}
