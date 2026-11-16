<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { mark, pick, say, tl } from '../composables/useStore'
import EndScreen from './EndScreen.vue'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

const inputEl = ref(null)
const answer = ref('')
const timers = []

const session = reactive({
  queue: pick(8),
  index: 0,
  correct: 0,
  phase: 'ask',
  lastOk: false,
  finished: false,
})

const current = computed(() => session.queue[session.index])

function focus() {
  inputEl.value?.focus()
}

function later(fn, ms) {
  timers.push(setTimeout(fn, ms))
}

function check() {
  if (session.phase !== 'ask' || session.finished) return
  const word = current.value
  if (!answer.value.trim()) return
  const ok = tl(answer.value) === tl(word.t)
  session.lastOk = ok
  if (ok) session.correct += 1
  mark(word, ok)
  say(word.t)
  session.phase = 'result'
  later(() => {
    session.index += 1
    answer.value = ''
    if (session.index >= session.queue.length) session.finished = true
    else session.phase = 'ask'
  }, 1400)
}

function restart() {
  session.queue = pick(8)
  session.index = 0
  session.correct = 0
  session.phase = 'ask'
  session.lastOk = false
  session.finished = false
  answer.value = ''
  nextTick(focus)
}

watch(
  () => [session.phase, session.finished],
  () => {
    if (session.phase === 'ask' && !session.finished) nextTick(focus)
  },
)

onMounted(() => nextTick(focus))
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <EndScreen
    v-if="session.finished"
    :correct="session.correct"
    :total="session.queue.length"
    @replay="restart"
  />
  <template v-else-if="session.phase === 'result'">
    <TopBar />
    <div class="card">
      <div class="pop">{{ session.lastOk ? '✅' : '❌' }}</div>
      <div class="q">{{ current.t }}</div>
      <p class="sub">{{ current.e }}</p>
      <p v-if="current.p" class="okunus">Okunuş: {{ current.p }}</p>
      <p class="sub">{{ session.lastOk ? 'Doğru! +1 puan' : 'Doğrusu bu. −1 puan' }}</p>
    </div>
  </template>
  <template v-else>
    <TopBar />
    <ProgressBar :value="session.index" :max="session.queue.length" />
    <div class="card">
      <div class="sub">Türkçesini yaz:</div>
      <div class="q">{{ current.e }}</div>
    </div>
    <input
      ref="inputEl"
      v-model="answer"
      autocomplete="off"
      autocapitalize="none"
      placeholder="Türkçe kelime…"
      @keydown.enter="check"
    />
    <button class="btn g" type="button" @click="check">Kontrol et ✅</button>
    <button class="btn y" type="button" @click="say(current.t)">🔊 İpucu (dinle)</button>
  </template>
</template>
