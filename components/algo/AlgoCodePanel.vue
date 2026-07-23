<script setup lang="ts">
/**
 * Python source panel (left). Displays the catalogue entry's code with a
 * tiny hand-rolled highlighter (no dependency for ~20 lines of Python) and
 * highlights the line the current trace step is "executing".
 */
import { useAlgoStore } from '~/stores/algorithms'

const store = useAlgoStore()

const KEYWORDS = new Set([
  'def', 'for', 'while', 'if', 'elif', 'else', 'return', 'in', 'not', 'and',
  'or', 'break', 'continue', 'from', 'import', 'raise', 'lambda', 'pass',
  'is', 'None', 'True', 'False',
])
const BUILTINS = new Set([
  'len', 'range', 'float', 'deque', 'heapq', 'ValueError', 'set', 'list',
  'dict', 'print', 'enumerate', 'min', 'max',
])

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Line-at-a-time tokenizer: comments, strings, words, numbers. */
function highlightLine(line: string): string {
  let out = ''
  let i = 0
  const emit = (text: string, cls?: string) => {
    out += cls ? `<span class="${cls}">${escapeHtml(text)}</span>` : escapeHtml(text)
  }
  while (i < line.length) {
    const ch = line[i]
    if (ch === '#') {
      emit(line.slice(i), 'tok-com')
      break
    }
    if (ch === '"' || ch === "'") {
      const end = line.indexOf(ch, i + 1)
      const j = end === -1 ? line.length : end + 1
      emit(line.slice(i, j), 'tok-str')
      i = j
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++
      const word = line.slice(i, j)
      emit(word, KEYWORDS.has(word) ? 'tok-kw' : BUILTINS.has(word) ? 'tok-fn' : undefined)
      i = j
      continue
    }
    if (/[0-9]/.test(ch)) {
      let j = i + 1
      while (j < line.length && /[0-9.]/.test(line[j])) j++
      emit(line.slice(i, j), 'tok-num')
      i = j
      continue
    }
    emit(ch)
    i++
  }
  return out
}

const lines = computed(() =>
  store.algo.code.split('\n').map(line => highlightLine(line)),
)
const currentLine = computed(() => store.step?.line ?? 0)
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto px-2 py-3">
    <div
      v-for="(html, i) in lines"
      :key="`${store.algo.id}-${i}`"
      class="flex items-baseline border-l-2 transition-colors"
      :class="i + 1 === currentLine ? 'border-live bg-live/10' : 'border-transparent'"
    >
      <span class="w-8 shrink-0 select-none pr-3 text-right font-mono text-[11px] leading-6 text-paper-faint">
        {{ i + 1 }}
      </span>
      <!-- eslint-disable-next-line vue/no-v-html — html is generated locally from the catalogue's code string -->
      <code class="whitespace-pre font-mono text-[13px] leading-6 text-paper" v-html="html" />
    </div>
  </div>
</template>
