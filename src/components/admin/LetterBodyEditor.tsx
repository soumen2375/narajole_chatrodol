/**
 * LetterBodyEditor — the letter body, written the way a letter is written.
 *
 * The body used to be a textarea, which meant a letter could hold words and
 * nothing else. This is the same box with a word processor behind it:
 * headings, bold and italic, underline, lists, quotations, rules, alignment,
 * links whose display text is not the address, page breaks, and pictures.
 *
 * A picture is a block in the flow, not an attachment: there is text above it
 * and text below it, and the buttons on a selected picture put a fresh
 * paragraph on either side without the writer having to aim a cursor at the
 * edge of an image. Its width comes from a ladder rather than a drag handle,
 * because the A4 preview and the PDF have to agree on the width to agree on
 * where the page breaks.
 *
 * What comes out is the editor's HTML, set in the letter's own face at the
 * letter's own proportions (see letterBodyCss), so this box already looks
 * like the sheet next to it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Extension, Mark, Node, mergeAttributes } from '@tiptap/core';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type ReactNodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowUp, Baseline, Bold, Crop,
  Expand, FileImage, Heading1, Heading2, Heading3, Highlighter, ImagePlus, Italic,
  Link as LinkIcon, List, ListOrdered, Loader2, Minus, Quote, Redo2, RemoveFormatting, Scissors,
  Strikethrough, Trash2, Underline as UnderlineIcon, Undo2, Unlink,
} from 'lucide-react';
import { FONT_STACK, LAYOUT } from '@/lib/letterpad';
import {
  IMAGE_WIDTHS, LETTER_COLORS, LETTER_FONTS, LETTER_HIGHLIGHTS, LETTER_SIZES, letterBodyCss,
} from '@/lib/letter-body';
import { UPLOAD_MAX_BYTES, fitImageForLetter, readableSize } from '@/lib/letter-image';
import { useInjectedCss, useLetterpadFonts } from '@/components/admin/letterpad-styles';

const TEAL = '#0c756f';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const CREAM = '#faf8f5';

// ── Tabs ─────────────────────────────────────────────────────────────────────

/**
 * Tab, as a letter writer expects it.
 *
 * Inside a list it indents the item, which is what every editor does. Anywhere
 * else it inserts a real tab character: the stylesheet advances it to the next
 * half-inch stop, and the PDF measures the same stops, so an indented first
 * line is indented by the same distance on screen and on paper.
 *
 * Trapping Tab means it can no longer move focus out of the box, so Escape is
 * bound to leave it — the way a code editor does.
 */
const TabStops = Extension.create({
  name: 'letterTabs',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('listItem')) return this.editor.commands.sinkListItem('listItem');
        return this.editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) tr.insertText('\t');
          return true;
        });
      },

      'Shift-Tab': () => {
        if (this.editor.isActive('listItem')) return this.editor.commands.liftListItem('listItem');
        const { selection, doc } = this.editor.state;
        if (!selection.empty || selection.from === 0) return false;
        // Undo a tab, but leave an ordinary backspace to do anything else.
        if (doc.textBetween(selection.from - 1, selection.from) !== '\t') return false;
        return this.editor.commands.deleteRange({ from: selection.from - 1, to: selection.from });
      },

      Escape: () => this.editor.commands.blur(),
    };
  },
});

// ── Face and size ────────────────────────────────────────────────────────────

/**
 * The face a stretch of text is set in.
 *
 * It is written as `<span data-font="calibri">` rather than an inline
 * font-family, because three renderers read this HTML and a key they all look
 * up in one table cannot drift the way a CSS string would. The stylesheet
 * turns the key into a font stack; the PDF turns it into an embedded file.
 */
const LetterFont = Mark.create({
  name: 'letterFont',

  addAttributes() {
    return {
      font: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-font'),
        renderHTML: (attributes) => (attributes.font ? { 'data-font': String(attributes.font) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-font]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

/** The ink a stretch of text is printed in. */
const LetterColor = Mark.create({
  name: 'letterColor',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-color'),
        renderHTML: (attributes) => (attributes.color ? { 'data-color': String(attributes.color) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-color]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

/** The highlighter drawn behind a stretch of text. */
const LetterHighlight = Mark.create({
  name: 'letterHighlight',

  addAttributes() {
    return {
      highlight: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-highlight'),
        renderHTML: (attributes) => (attributes.highlight ? { 'data-highlight': String(attributes.highlight) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-highlight]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

/** The size a stretch of text is set at, in points. */
const LetterSize = Mark.create({
  name: 'letterSize',

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => Number(element.getAttribute('data-size')) || null,
        renderHTML: (attributes) => (attributes.size ? { 'data-size': String(attributes.size) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-size]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

// ── The picture node ─────────────────────────────────────────────────────────

/**
 * A picture in the body.
 *
 * It renders as a plain `<img>` carrying data-width and data-align, which is
 * exactly what the sheet's stylesheet and the PDF's parser read — no wrapper,
 * no inline styles, nothing that would have to be understood twice.
 */
const LetterImage = Node.create({
  name: 'letterImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      // A width and an alignment mean nothing to a picture that has a sheet
      // to itself, so they are not written out for one.
      width: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute('data-width')) || 100,
        renderHTML: (attributes) =>
          (attributes.page === 'full' ? {} : { 'data-width': String(attributes.width ?? 100) }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) =>
          (attributes.page === 'full' ? {} : { 'data-align': String(attributes.align ?? 'center') }),
      },
      /** 'inline' sits in the text; 'full' takes a bare sheet of its own. */
      page: {
        default: 'inline',
        parseHTML: (element) => (element.getAttribute('data-page') === 'full' ? 'full' : 'inline'),
        renderHTML: (attributes) => (attributes.page === 'full' ? { 'data-page': 'full' } : {}),
      },
      /** How a full-page picture meets the edges of its sheet. */
      fit: {
        default: 'fit',
        parseHTML: (element) => (element.getAttribute('data-fit') === 'fill' ? 'fill' : 'fit'),
        renderHTML: (attributes) =>
          (attributes.page === 'full' ? { 'data-fit': attributes.fit === 'fill' ? 'fill' : 'fit' } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

function ImageView({ node, editor, selected, getPos, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const width = Number(node.attrs.width) || 100;
  const align = String(node.attrs.align || 'center');
  const full = node.attrs.page === 'full';
  const fill = node.attrs.fit === 'fill';

  /** Puts an empty paragraph on one side of the picture and goes to it. */
  const addParagraph = (side: 'above' | 'below') => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const at = side === 'above' ? pos : pos + node.nodeSize;
    editor.chain().focus().insertContentAt(at, { type: 'paragraph' }).setTextSelection(at + 1).run();
  };

  return (
    <NodeViewWrapper
      className="lp-image"
      style={{ position: 'relative', outline: selected ? `2px solid ${TEAL}` : 'none', outlineOffset: 2 }}
    >
      {full ? (
        // Shown as the sheet it will become, at A4's proportions, so it is
        // obvious that this picture is not sitting in the paragraph above it.
        <div className="my-3 flex flex-col items-center gap-1.5">
          <div
            style={{
              width: '46%',
              minWidth: 150,
              aspectRatio: '210 / 297',
              border: `1px dashed ${selected ? TEAL : RULE}`,
              background: '#ffffff',
              padding: 3,
            }}
          >
            <img
              src={node.attrs.src}
              alt={node.attrs.alt || ''}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: fill ? 'cover' : 'contain', margin: 0 }}
            />
          </div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            full page · no letterhead
          </div>
        </div>
      ) : (
        <img src={node.attrs.src} alt={node.attrs.alt || ''} data-width={width} data-align={align} draggable={false} />
      )}

      {selected && editor.isEditable && (
        <div
          contentEditable={false}
          className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-wrap items-center gap-1 rounded-full px-2 py-1 shadow-sm"
          style={{ background: '#ffffff', border: `1px solid ${RULE}` }}
        >
          {full ? (
            <>
              <ToolButton label="Fit the whole picture on the sheet" active={!fill} onClick={() => updateAttributes({ fit: 'fit' })}>
                <Expand className="h-3.5 w-3.5" />
              </ToolButton>
              <ToolButton label="Fill the sheet, cropping the overhang" active={fill} onClick={() => updateAttributes({ fit: 'fill' })}>
                <Crop className="h-3.5 w-3.5" />
              </ToolButton>
              <Divider />
              <ToolButton label="Put it back in the text" onClick={() => updateAttributes({ page: 'inline', width: 75 })}>
                <ImagePlus className="h-3.5 w-3.5" />
              </ToolButton>
            </>
          ) : (
            <>
              {IMAGE_WIDTHS.map((pct) => (
                <ToolButton
                  key={pct}
                  label={`${pct}% of the width`}
                  active={width === pct}
                  onClick={() => updateAttributes({ width: pct })}
                >
                  <span className="text-[10px] font-semibold">{pct}</span>
                </ToolButton>
              ))}
              <Divider />
              <ToolButton label="Align left" active={align === 'left'} onClick={() => updateAttributes({ align: 'left' })}><AlignLeft className="h-3.5 w-3.5" /></ToolButton>
              <ToolButton label="Centre" active={align === 'center'} onClick={() => updateAttributes({ align: 'center' })}><AlignCenter className="h-3.5 w-3.5" /></ToolButton>
              <ToolButton label="Align right" active={align === 'right'} onClick={() => updateAttributes({ align: 'right' })}><AlignRight className="h-3.5 w-3.5" /></ToolButton>
              <Divider />
              <ToolButton label="Give it a page of its own" onClick={() => updateAttributes({ page: 'full' })}>
                <FileImage className="h-3.5 w-3.5" />
              </ToolButton>
            </>
          )}
          <Divider />
          <ToolButton label="Add a paragraph above" onClick={() => addParagraph('above')}><ArrowUp className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label="Add a paragraph below" onClick={() => addParagraph('below')}><ArrowDown className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label="Remove the picture" onClick={deleteNode}><Trash2 className="h-3.5 w-3.5" /></ToolButton>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// ── The page break ───────────────────────────────────────────────────────────

/** An explicit "start the next sheet here", honoured by the preview and the PDF. */
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },

  renderHTML() {
    return ['div', { 'data-page-break': 'true' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakView);
  },
});

function PageBreakView({ selected }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="lp-page-break" contentEditable={false}>
      <div
        className="my-2 flex select-none items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: selected ? TEAL : MUTED }}
      >
        <span className="h-px flex-1" style={{ background: selected ? TEAL : RULE }} />
        <Scissors className="h-3 w-3" /> page break
        <span className="h-px flex-1" style={{ background: selected ? TEAL : RULE }} />
      </div>
    </NodeViewWrapper>
  );
}

// ── Toolbar furniture ────────────────────────────────────────────────────────

function ToolButton({
  onClick, active = false, disabled = false, label, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="flex h-7 min-w-7 items-center justify-center rounded px-1 transition-colors disabled:opacity-40"
      style={active ? { background: TEAL, color: '#ffffff' } : { color: INK2 }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px" style={{ background: RULE }} />;
}

/** One colour in a tray. */
function Swatch({
  hex, label, active, crossed = false, onClick,
}: {
  hex: string; label: string; active: boolean; crossed?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="relative h-6 w-6 rounded-full transition-transform hover:scale-110"
      style={{
        background: hex,
        border: `1px solid ${active ? TEAL : 'rgba(0,0,0,0.18)'}`,
        boxShadow: active ? `0 0 0 2px ${TEAL}` : 'none',
      }}
    >
      {crossed && (
        <span
          className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 rotate-45"
          style={{ background: '#b91c1c' }}
        />
      )}
    </button>
  );
}

/** A toolbar dropdown — the face and the size, as a word processor has them. */
function ToolSelect({
  value, onChange, label, width, children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      aria-label={label}
      className="h-7 cursor-pointer rounded px-1 text-[11.5px] outline-none"
      style={{ border: `1px solid ${RULE}`, background: '#ffffff', color: INK2, width }}
    >
      {children}
    </select>
  );
}

/** Turns what someone typed into an address a PDF reader will follow. */
function normalizeHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}

// ── The editor ───────────────────────────────────────────────────────────────

export interface LetterBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
  /**
   * Uploads a picture and returns the URL to print. Without it the picture
   * button is not offered — a letter may not carry an image the PDF renderer
   * has no way to fetch.
   */
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
  minHeight?: number;
  /** Bengali labels when the admin is in Bengali. */
  tr?: (en: string, bn: string) => string;
}

export default function LetterBodyEditor({
  value,
  onChange,
  onUploadImage,
  placeholder,
  minHeight = 320,
  tr = (en) => en,
}: LetterBodyEditorProps) {
  useLetterpadFonts();
  useInjectedCss('letter-body-editor', EDITOR_CSS);

  const fileRef = useRef<HTMLInputElement>(null);
  /** Which button opened the file picker: in the text, or on a sheet of its own. */
  const pickAs = useRef<'inline' | 'full'>('inline');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState<{ text: string; href: string; hadSelection: boolean } | null>(null);
  /** Which swatch tray is open, if either. */
  const [palette, setPalette] = useState<'color' | 'highlight' | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // The letterhead has no way to set code, and a letter has no use for it.
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noreferrer' } },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write the letter…' }),
      TabStops,
      LetterFont,
      LetterSize,
      LetterColor,
      LetterHighlight,
      LetterImage,
      PageBreak,
    ],
    content: value,
    // Without this ProseMirror folds every run of spaces and every tab back
    // into one space as it reads the letter in — which is exactly what the
    // writer did not type.
    parseOptions: { preserveWhitespace: 'full' },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: 'lp-body lp-editor focus:outline-none',
        style: `min-height:${minHeight}px`,
      },
    },
  });

  // An external change — opening another letter, or applying a template —
  // replaces the content; a keystroke does not, or the cursor would jump.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
    }
  }, [value, editor]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    // With the cursor merely inside a link, the whole link is what is being
    // edited — the same thing Word does.
    if (editor.isActive('link')) editor.chain().focus().extendMarkRange('link').run();
    const { from, to } = editor.state.selection;
    setLinkForm({
      text: editor.state.doc.textBetween(from, to, ' '),
      href: editor.getAttributes('link').href ?? '',
      hadSelection: from !== to,
    });
  }, [editor]);

  const applyLink = () => {
    if (!editor || !linkForm) return;
    const href = normalizeHref(linkForm.href);
    if (!href) { setLinkForm(null); return; }

    const { from, to } = editor.state.selection;
    const text = linkForm.text.trim();
    const selected = editor.state.doc.textBetween(from, to, ' ');

    if (!text) {
      // Nothing to show: link whatever is selected, or the address itself.
      if (from === to) {
        editor.chain().focus()
          .insertContentAt(from, href)
          .setTextSelection({ from, to: from + href.length })
          .setLink({ href })
          .run();
      } else {
        editor.chain().focus().setLink({ href }).run();
      }
    } else if (text === selected && from !== to) {
      editor.chain().focus().setLink({ href }).run();
    } else {
      editor.chain().focus()
        .insertContentAt({ from, to }, text)
        .setTextSelection({ from, to: from + text.length })
        .setLink({ href })
        .run();
    }
    setLinkForm(null);
  };

  const pickImage = async (file: File) => {
    if (!editor || !onUploadImage) return;
    setUploadError(null);
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setUploadError(tr('Only PNG and JPEG pictures can be printed on the letterhead.',
                        'লেটারহেডে শুধু PNG ও JPEG ছবি ছাপা যায়।'));
      return;
    }
    setUploading(true);
    try {
      // A photograph off a phone is several megabytes and far more pixels
      // than 169 mm of paper can show, and storage would refuse it outright.
      // It is redrawn at print size first, so the secretary never has to go
      // and shrink it somewhere else and come back.
      const ready = await fitImageForLetter(file);
      if (ready.size > UPLOAD_MAX_BYTES) {
        setUploadError(tr(
          `This picture is still ${readableSize(ready.size)} after being sized for print, and the limit is ${readableSize(UPLOAD_MAX_BYTES)}. Please save it as a JPEG and try again.`,
          `ছবিটি ছাপার মাপে আনার পরেও ${readableSize(ready.size)}, সীমা ${readableSize(UPLOAD_MAX_BYTES)}। JPEG হিসেবে সংরক্ষণ করে আবার চেষ্টা করুন।`,
        ));
        setUploading(false);
        return;
      }

      const url = await onUploadImage(ready);
      const full = pickAs.current === 'full';
      editor.chain().focus().insertContent([
        {
          type: 'letterImage',
          attrs: {
            src: url,
            alt: file.name.replace(/\.[^.]+$/, ''),
            width: 75,
            align: 'center',
            page: full ? 'full' : 'inline',
            fit: 'fit',
          },
        },
        { type: 'paragraph' },
      ]).run();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setUploadError(/maximum allowed size|payload too large|413/i.test(message)
        ? tr('The picture was too large for storage even after being sized for print. Please save it as a JPEG and try again.',
             'ছাপার মাপে আনার পরেও ছবিটি স্টোরেজের পক্ষে বড়। JPEG হিসেবে সংরক্ষণ করে আবার চেষ্টা করুন।')
        : message);
    }
    setUploading(false);
  };

  if (!editor) return null;

  const can = editor.can();

  return (
    <div className="overflow-hidden rounded-[8px]" style={{ border: `1px solid ${RULE}`, background: '#ffffff' }}>
      {/* ── Toolbar ── */}
      <div className="overflow-x-auto" style={{ borderBottom: `1px solid ${RULE}`, background: CREAM }}>
        <div className="flex min-w-max items-center gap-0.5 px-2 py-1.5">
          <ToolButton label={tr('Undo', 'পূর্বাবস্থা')} onClick={() => editor.chain().focus().undo().run()} disabled={!can.undo()}><Undo2 className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Redo', 'পুনরায়')} onClick={() => editor.chain().focus().redo().run()} disabled={!can.redo()}><Redo2 className="h-3.5 w-3.5" /></ToolButton>
          <Divider />

          <ToolSelect
            label={tr('Face', 'হরফ')}
            width={116}
            value={String(editor.getAttributes('letterFont').font ?? '')}
            onChange={(key) => {
              const chain = editor.chain().focus();
              if (key) chain.setMark('letterFont', { font: key }).run();
              else chain.unsetMark('letterFont').run();
            }}
          >
            <option value="">{tr('Times New Roman', 'টাইমস নিউ রোমান')}</option>
            {LETTER_FONTS.filter((font) => font.key !== 'times').map((font) => (
              <option key={font.key} value={font.key}>{font.label}</option>
            ))}
          </ToolSelect>

          <ToolSelect
            label={tr('Size', 'মাপ')}
            width={62}
            value={String(editor.getAttributes('letterSize').size ?? '')}
            onChange={(size) => {
              const chain = editor.chain().focus();
              if (size) chain.setMark('letterSize', { size: Number(size) }).run();
              else chain.unsetMark('letterSize').run();
            }}
          >
            <option value="">{tr('Default', 'ডিফল্ট')}</option>
            {LETTER_SIZES.map((size) => (
              <option key={size} value={size}>{size} pt</option>
            ))}
          </ToolSelect>
          <Divider />

          <ToolButton label={tr('Bold', 'গাঢ়')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Italic', 'তির্যক')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Underline', 'নিম্নরেখ')} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Strikethrough', 'কাটা')} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></ToolButton>
          <Divider />

          <ToolButton label={tr('Heading 1', 'শিরোনাম ১')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Heading 2', 'শিরোনাম ২')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Heading 3', 'শিরোনাম ৩')} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-3.5 w-3.5" /></ToolButton>
          <Divider />

          <ToolButton label={tr('Bulleted list', 'বুলেট তালিকা')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Numbered list', 'সংখ্যা তালিকা')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Quotation', 'উদ্ধৃতি')} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Horizontal rule', 'অনুভূমিক রেখা')} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-3.5 w-3.5" /></ToolButton>
          <Divider />

          <ToolButton label={tr('Align left', 'বাঁ ধার')} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Centre', 'মাঝ বরাবর')} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Align right', 'ডান ধার')} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Justify', 'উভয় ধার')} active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="h-3.5 w-3.5" /></ToolButton>
          <Divider />

          <ToolButton label={tr('Insert link', 'লিংক দিন')} active={editor.isActive('link')} onClick={openLinkDialog}><LinkIcon className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Remove link', 'লিংক সরান')} disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="h-3.5 w-3.5" /></ToolButton>

          <ToolButton
            label={tr('Text colour', 'লেখার রং')}
            active={palette === 'color' || editor.isActive('letterColor')}
            onClick={() => { setLinkForm(null); setPalette(palette === 'color' ? null : 'color'); }}
          >
            <Baseline className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label={tr('Highlight', 'হাইলাইট')}
            active={palette === 'highlight' || editor.isActive('letterHighlight')}
            onClick={() => { setLinkForm(null); setPalette(palette === 'highlight' ? null : 'highlight'); }}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </ToolButton>
          <Divider />

          {onUploadImage && (
            <>
              <ToolButton
                label={tr('Insert picture', 'ছবি দিন')}
                onClick={() => { pickAs.current = 'inline'; fileRef.current?.click(); }}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              </ToolButton>
              <ToolButton
                label={tr('Picture on a page of its own', 'আলাদা পাতায় ছবি')}
                onClick={() => { pickAs.current = 'full'; fileRef.current?.click(); }}
                disabled={uploading}
              >
                <FileImage className="h-3.5 w-3.5" />
              </ToolButton>
            </>
          )}
          <ToolButton label={tr('Page break', 'পাতা ভাঙুন')} onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}><Scissors className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton label={tr('Clear formatting', 'সাজসজ্জা মুছুন')} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-3.5 w-3.5" /></ToolButton>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ''; }}
      />

      {/* ── Colours ── */}
      {palette && (
        <div
          className="flex flex-wrap items-center gap-1.5 px-3 py-2.5"
          style={{ borderBottom: `1px solid ${RULE}`, background: CREAM }}
        >
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            {palette === 'color' ? tr('Text colour', 'লেখার রং') : tr('Highlight', 'হাইলাইট')}
          </span>

          {palette === 'color'
            ? LETTER_COLORS.map((colour) => (
              <Swatch
                key={colour.key}
                label={colour.label}
                hex={colour.hex}
                active={(editor.getAttributes('letterColor').color ?? 'black') === colour.key}
                onClick={() => {
                  const chain = editor.chain().focus();
                  // Black is the letter's own ink, so choosing it takes the
                  // colour off rather than writing black over black.
                  if (colour.key === 'black') chain.unsetMark('letterColor').run();
                  else chain.setMark('letterColor', { color: colour.key }).run();
                  setPalette(null);
                }}
              />
            ))
            : (
              <>
                <Swatch
                  label={tr('None', 'কিছু না')}
                  hex="#ffffff"
                  crossed
                  active={!editor.isActive('letterHighlight')}
                  onClick={() => { editor.chain().focus().unsetMark('letterHighlight').run(); setPalette(null); }}
                />
                {LETTER_HIGHLIGHTS.map((colour) => (
                  <Swatch
                    key={colour.key}
                    label={colour.label}
                    hex={colour.hex}
                    active={editor.getAttributes('letterHighlight').highlight === colour.key}
                    onClick={() => {
                      editor.chain().focus().setMark('letterHighlight', { highlight: colour.key }).run();
                      setPalette(null);
                    }}
                  />
                ))}
              </>
            )}
        </div>
      )}

      {/* ── Insert link ── */}
      {linkForm && (
        <div className="space-y-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${RULE}`, background: CREAM }}>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
                {tr('Text to show', 'যে লেখা দেখাবে')}
              </span>
              <input
                autoFocus
                value={linkForm.text}
                onChange={(e) => setLinkForm({ ...linkForm, text: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
                placeholder={tr('Watch last year’s programme', 'গত বছরের অনুষ্ঠান দেখুন')}
                className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
                {tr('Address', 'ঠিকানা')}
              </span>
              <input
                value={linkForm.href}
                onChange={(e) => setLinkForm({ ...linkForm, href: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
                placeholder="https://youtu.be/…"
                className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                style={{ border: `1px solid ${RULE}`, color: INK }}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyLink}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
              style={{ background: TEAL }}
            >
              {tr('Apply', 'প্রয়োগ')}
            </button>
            <button
              type="button"
              onClick={() => setLinkForm(null)}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
              style={{ border: `1px solid ${RULE}`, color: INK2 }}
            >
              {tr('Cancel', 'বাতিল')}
            </button>
            <span className="text-[11.5px]" style={{ color: MUTED }}>
              {tr('The words are what prints; the address is what the reader clicks.',
                  'কাগজে লেখাটাই ছাপা হয়; ঠিকানাটা পাঠক ক্লিক করেন।')}
            </span>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="px-3 py-2 text-[12.5px]" style={{ background: 'rgba(194,65,12,0.1)', color: '#c2410c' }}>
          {uploadError}
        </div>
      )}

      {/* ── The page itself ── */}
      {/* The box is set at the letter's own body size, so "14 pt" here is the
          14 pt that will be printed rather than 14 points of something else. */}
      <div className="px-4 py-4" style={{ fontFamily: FONT_STACK.serif, fontSize: `${LAYOUT.body.size}pt`, color: INK }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/**
 * The letter's own typography inside the editor, plus the few rules that only
 * make sense while it is being written — the placeholder, the gap cursor that
 * lets a paragraph be started above a picture, and the selected-node tint.
 */
const EDITOR_CSS = [
  letterBodyCss('.lp-editor'),
  '.lp-editor:focus{outline:none;}',
  '.lp-editor p.is-editor-empty:first-child::before{content:attr(data-placeholder);float:left;height:0;pointer-events:none;color:#a8a29e;}',
  '.lp-editor .lp-image img{cursor:pointer;}',
  '.lp-editor .ProseMirror-selectednode{outline:2px solid rgba(12,117,111,0.6);outline-offset:2px;}',
  // The gap cursor is what makes "click above the picture and type" work.
  '.lp-editor .ProseMirror-gapcursor{display:none;pointer-events:none;position:relative;}',
  '.lp-editor .ProseMirror-gapcursor:after{content:"";display:block;position:absolute;top:-2px;width:100%;border-top:1px solid currentColor;animation:lp-blink 1.1s steps(2,start) infinite;}',
  '.lp-editor .ProseMirror-focused .ProseMirror-gapcursor,.ProseMirror-focused .lp-editor .ProseMirror-gapcursor{display:block;}',
  '@keyframes lp-blink{to{visibility:hidden;}}',
].join('\n');
