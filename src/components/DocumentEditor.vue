<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { OrderedList } from '@tiptap/extension-list';
import Menu from 'primevue/menu';
import { useI18n } from 'vue-i18n';

/**
 * The editor for what a party writes to the Board — the statement of appeal.
 * It carries the formatting a legal document needs: headings, numbered
 * paragraphs in the styles pleadings use (1, a, i), tables for figures,
 * alignment. The server keeps exactly this and nothing more, so what is typed
 * is what the Board's document prints. (The same editor as the staff portal's.)
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 10 },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  /** Standard wording the typist can drop in: [{ label, html }]. */
  phrases: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const L = computed(() => ({
  undo: t('editor.undo'),
  redo: t('editor.redo'),
  style: t('editor.style'),
  paragraph: t('editor.paragraph'),
  heading: t('editor.heading'),
  subheading: t('editor.subheading'),
  bold: t('editor.bold'),
  italic: t('editor.italic'),
  underline: t('editor.underline'),
  bullets: t('editor.bullets'),
  numbers: t('editor.numbers'),
  numbering: t('editor.numbering'),
  indent: t('editor.indent'),
  outdent: t('editor.outdent'),
  alignLeft: t('editor.alignLeft'),
  alignCenter: t('editor.alignCenter'),
  alignRight: t('editor.alignRight'),
  justify: t('editor.justify'),
  quote: t('editor.quote'),
  table: t('editor.table'),
  insertTable: t('editor.insertTable'),
  addRow: t('editor.addRow'),
  addColumn: t('editor.addColumn'),
  deleteRow: t('editor.deleteRow'),
  deleteColumn: t('editor.deleteColumn'),
  headerRow: t('editor.headerRow'),
  deleteTable: t('editor.deleteTable'),
  clear: t('editor.clear'),
  phrases: t('editor.phrases'),
  words: (n) => t('editor.words', { n }),
}));

// Browsers read a list's type="i" and type="I" alike when matching styles, so
// the editor marks each numbering style by name to show it; the saved HTML
// keeps only the type, which the printed document reads as it should.
const NUMBERING_STYLES = { a: 'lower-alpha', A: 'upper-alpha', i: 'lower-roman', I: 'upper-roman' };
const NumberedParagraphs = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute('type'),
        renderHTML: (attributes) =>
          NUMBERING_STYLES[attributes.type] ? { type: attributes.type, 'data-numbering': NUMBERING_STYLES[attributes.type] } : {},
      },
    };
  },
});

// What Word leaves on pasted text that means nothing here.
const cleanPastedHtml = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
    .replace(/\sclass="?Mso[^"\s>]*"?/gi, '');

const editor = useEditor({
  content: props.modelValue || '',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [3, 4] },
      code: false,
      codeBlock: false,
      strike: false,
      link: false,
      horizontalRule: false,
      orderedList: false,
    }),
    NumberedParagraphs,
    TextAlign.configure({
      types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: () => props.placeholder }),
    CharacterCount,
  ],
  editorProps: {
    attributes: { 'aria-label': props.ariaLabel, 'aria-multiline': 'true', role: 'textbox' },
    transformPastedHTML: cleanPastedHtml,
  },
  onUpdate: ({ editor: e }) => emit('update:modelValue', e.isEmpty ? '' : e.getHTML()),
});

watch(
  () => props.modelValue,
  (value) => {
    const e = editor.value;
    if (!e) return;
    const current = e.isEmpty ? '' : e.getHTML();
    // Only a change from outside is written back, so typing is not disturbed.
    if ((value || '') !== current) e.commands.setContent(value || '', { emitUpdate: false });
  },
);
watch(
  () => props.disabled,
  (disabled) => editor.value?.setEditable(!disabled),
);
onBeforeUnmount(() => editor.value?.destroy());

const run = (fn) => {
  if (!editor.value || props.disabled) return;
  fn(editor.value.chain().focus()).run();
};
const active = (name, attrs) => !!editor.value?.isActive(name, attrs);
const inTable = computed(() => active('table'));
const inOrderedList = computed(() => active('orderedList'));
const words = computed(() => editor.value?.storage.characterCount.words() ?? 0);

const styleValue = computed(() => (active('heading', { level: 3 }) ? 'h3' : active('heading', { level: 4 }) ? 'h4' : 'p'));
const setStyle = (value) => run((c) => (value === 'p' ? c.setParagraph() : c.setHeading({ level: value === 'h3' ? 3 : 4 })));

const NUMBERING = [
  { value: '1', label: '1, 2, 3' },
  { value: 'a', label: 'a, b, c' },
  { value: 'A', label: 'A, B, C' },
  { value: 'i', label: 'i, ii, iii' },
  { value: 'I', label: 'I, II, III' },
];
const numbering = computed(() => editor.value?.getAttributes('orderedList').type || '1');
const setNumbering = (type) => run((c) => c.updateAttributes('orderedList', { type: type === '1' ? null : type }));

const indent = () => run((c) => c.sinkListItem('listItem'));
const outdent = () => run((c) => c.liftListItem('listItem'));

const tableMenu = ref(null);
const tableItems = computed(() =>
  inTable.value
    ? [
        { label: L.value.addRow, icon: 'pi pi-arrow-down', command: () => run((c) => c.addRowAfter()) },
        { label: L.value.addColumn, icon: 'pi pi-arrow-right', command: () => run((c) => c.addColumnAfter()) },
        { label: L.value.deleteRow, icon: 'pi pi-minus', command: () => run((c) => c.deleteRow()) },
        { label: L.value.deleteColumn, icon: 'pi pi-minus', command: () => run((c) => c.deleteColumn()) },
        { label: L.value.headerRow, icon: 'pi pi-bars', command: () => run((c) => c.toggleHeaderRow()) },
        { separator: true },
        { label: L.value.deleteTable, icon: 'pi pi-trash', command: () => run((c) => c.deleteTable()) },
      ]
    : [
        {
          label: L.value.insertTable,
          icon: 'pi pi-table',
          command: () => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })),
        },
      ],
);

const phraseMenu = ref(null);
const phraseItems = computed(() => props.phrases.map((p) => ({ label: p.label, command: () => run((c) => c.insertContent(p.html)) })));
</script>

<template>
  <div class="doc-editor" :class="{ disabled }">
    <div class="toolbar" role="toolbar" :aria-label="L.style">
      <div class="group">
        <button
          v-tooltip.top="L.undo"
          type="button"
          :aria-label="L.undo"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.undo())"
        >
          <i class="pi pi-undo"></i>
        </button>
        <button
          v-tooltip.top="L.redo"
          type="button"
          :aria-label="L.redo"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.redo())"
        >
          <i class="pi pi-refresh"></i>
        </button>
      </div>
      <div class="group">
        <select class="style-select" :value="styleValue" :aria-label="L.style" :disabled="disabled" @change="setStyle($event.target.value)">
          <option value="p">{{ L.paragraph }}</option>
          <option value="h3">{{ L.heading }}</option>
          <option value="h4">{{ L.subheading }}</option>
        </select>
      </div>
      <div class="group">
        <button
          v-for="mark in [
            { name: 'bold', letter: 'B', title: L.bold, cmd: (c) => c.toggleBold() },
            { name: 'italic', letter: 'I', title: L.italic, cmd: (c) => c.toggleItalic() },
            { name: 'underline', letter: 'U', title: L.underline, cmd: (c) => c.toggleUnderline() },
          ]"
          :key="mark.name"
          v-tooltip.top="mark.title"
          type="button"
          :aria-label="mark.title"
          :aria-pressed="active(mark.name)"
          :class="{ on: active(mark.name) }"
          :disabled="disabled"
          @mousedown.prevent
          @click="run(mark.cmd)"
        >
          <span class="letter" :class="`letter-${mark.name}`">{{ mark.letter }}</span>
        </button>
      </div>
      <div class="group">
        <button
          v-tooltip.top="L.bullets"
          type="button"
          :aria-label="L.bullets"
          :class="{ on: active('bulletList') }"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.toggleBulletList())"
        >
          <i class="pi pi-list"></i>
        </button>
        <button
          v-tooltip.top="L.numbers"
          type="button"
          :aria-label="L.numbers"
          :class="{ on: inOrderedList }"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.toggleOrderedList())"
        >
          <span class="letter small">1.</span>
        </button>
        <select
          v-if="inOrderedList"
          class="style-select narrow"
          :value="numbering"
          :aria-label="L.numbering"
          :disabled="disabled"
          @change="setNumbering($event.target.value)"
        >
          <option v-for="n in NUMBERING" :key="n.value" :value="n.value">{{ n.label }}</option>
        </select>
        <button v-tooltip.top="L.outdent" type="button" :aria-label="L.outdent" :disabled="disabled" @mousedown.prevent @click="outdent">
          <i class="pi pi-angle-left"></i>
        </button>
        <button v-tooltip.top="L.indent" type="button" :aria-label="L.indent" :disabled="disabled" @mousedown.prevent @click="indent">
          <i class="pi pi-angle-right"></i>
        </button>
      </div>
      <div class="group">
        <button
          v-for="a in [
            { value: 'left', icon: 'pi-align-left', title: L.alignLeft },
            { value: 'center', icon: 'pi-align-center', title: L.alignCenter },
            { value: 'right', icon: 'pi-align-right', title: L.alignRight },
            { value: 'justify', icon: 'pi-align-justify', title: L.justify },
          ]"
          :key="a.value"
          v-tooltip.top="a.title"
          type="button"
          :aria-label="a.title"
          :class="{ on: editor?.isActive({ textAlign: a.value }) }"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.setTextAlign(a.value))"
        >
          <i class="pi" :class="a.icon"></i>
        </button>
      </div>
      <div class="group">
        <button
          v-tooltip.top="L.quote"
          type="button"
          :aria-label="L.quote"
          :class="{ on: active('blockquote') }"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.toggleBlockquote())"
        >
          <i class="pi pi-comment"></i>
        </button>
        <button
          v-tooltip.top="L.table"
          type="button"
          :aria-label="L.table"
          aria-haspopup="true"
          :class="{ on: inTable }"
          :disabled="disabled"
          @mousedown.prevent
          @click="tableMenu.toggle($event)"
        >
          <i class="pi pi-table"></i>
        </button>
        <Menu ref="tableMenu" :model="tableItems" popup />
        <button
          v-tooltip.top="L.clear"
          type="button"
          :aria-label="L.clear"
          :disabled="disabled"
          @mousedown.prevent
          @click="run((c) => c.unsetAllMarks().clearNodes())"
        >
          <i class="pi pi-eraser"></i>
        </button>
      </div>
      <div v-if="phrases.length" class="group">
        <button
          v-tooltip.top="L.phrases"
          type="button"
          class="phrases"
          :aria-label="L.phrases"
          aria-haspopup="true"
          :disabled="disabled"
          @mousedown.prevent
          @click="phraseMenu.toggle($event)"
        >
          <i class="pi pi-bookmark"></i> <span>{{ L.phrases }}</span>
        </button>
        <Menu ref="phraseMenu" :model="phraseItems" popup />
      </div>
    </div>
    <EditorContent :editor="editor" class="area" :style="{ minHeight: `${rows * 1.6}rem` }" />
    <div class="status">{{ L.words(words) }}</div>
  </div>
</template>

<style scoped>
.doc-editor {
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.doc-editor:focus-within {
  border-color: var(--trab-primary);
}
.doc-editor.disabled {
  background: #f8fafc;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--trab-border);
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 1;
}
.group {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  padding-right: 0.3rem;
  margin-right: 0.1rem;
  border-right: 1px solid #e2e8f0;
}
.group:last-child {
  border-right: 0;
}
.toolbar button {
  min-width: 1.9rem;
  height: 1.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 0;
  border-radius: 6px;
  background: none;
  color: #475569;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0 0.35rem;
}
.toolbar button:hover:not(:disabled),
.toolbar button.on {
  background: #e2e8f0;
  color: var(--trab-primary);
}
.toolbar button:disabled,
.style-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.toolbar button.phrases span {
  font-size: 0.75rem;
}
.style-select {
  height: 1.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 0.78rem;
  color: #334155;
  padding: 0 0.3rem;
}
.style-select.narrow {
  width: 6.2rem;
}
.letter {
  font-family: 'Times New Roman', Times, serif;
  font-size: 0.95rem;
  line-height: 1;
}
.letter.small {
  font-size: 0.8rem;
  font-weight: 700;
}
.letter-bold {
  font-weight: 700;
}
.letter-italic {
  font-style: italic;
}
.letter-underline {
  text-decoration: underline;
}
.area {
  max-height: 32rem;
  overflow-y: auto;
  cursor: text;
}
/* The text as it will print: the Board's paper, not the screen's. */
.area :deep(.ProseMirror) {
  padding: 0.9rem 1.1rem;
  outline: none;
  min-height: inherit;
  font-family: 'Times New Roman', Times, serif;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #111;
}
.area :deep(.ProseMirror p) {
  margin: 0 0 0.6rem;
}
.area :deep(.ProseMirror h3) {
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  margin: 1rem 0 0.4rem;
}
.area :deep(.ProseMirror h4) {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0.8rem 0 0.3rem;
}
.area :deep(.ProseMirror ol),
.area :deep(.ProseMirror ul) {
  padding-left: 1.6rem;
  margin: 0.4rem 0;
}
/* The page's own reset takes list markers away; a legal document needs them. */
.area :deep(.ProseMirror ol) {
  list-style-type: decimal;
}
.area :deep(.ProseMirror ol[data-numbering='lower-alpha']) {
  list-style-type: lower-alpha;
}
.area :deep(.ProseMirror ol[data-numbering='upper-alpha']) {
  list-style-type: upper-alpha;
}
.area :deep(.ProseMirror ol[data-numbering='lower-roman']) {
  list-style-type: lower-roman;
}
.area :deep(.ProseMirror ol[data-numbering='upper-roman']) {
  list-style-type: upper-roman;
}
.area :deep(.ProseMirror ul) {
  list-style-type: disc;
}
.area :deep(.ProseMirror li p) {
  margin: 0 0 0.3rem;
}
.area :deep(.ProseMirror blockquote) {
  border-left: 3px solid #c8a415;
  margin: 0.6rem 0;
  padding-left: 0.8rem;
  color: #333;
}
.area :deep(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6rem 0;
  table-layout: fixed;
}
.area :deep(.ProseMirror th),
.area :deep(.ProseMirror td) {
  border: 1px solid #94a3b8;
  padding: 0.3rem 0.5rem;
  vertical-align: top;
  position: relative;
}
.area :deep(.ProseMirror th) {
  background: #f1f5f9;
  font-weight: 700;
  text-align: left;
}
.area :deep(.ProseMirror .selectedCell::after) {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(37, 99, 235, 0.12);
  pointer-events: none;
}
.area :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #94a3b8;
  float: left;
  height: 0;
  pointer-events: none;
}
.status {
  padding: 0.25rem 0.7rem;
  border-top: 1px solid #f1f5f9;
  font-size: 0.7rem;
  color: #94a3b8;
  text-align: right;
}
</style>
