<script setup>
import { computed, onBeforeUnmount, reactive } from 'vue'
import { choicesFor, mark, pick, quizDir, say } from '../composables/useStore'
import EndScreen from './EndScreen.vue'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

const timers = []

const session = reactive({
  queue: pick(10),
  index: 0,
  correct: 0,
  answer: null,
  options: null,
  finished: false,
})

const current = computed(() => session.queue[session.index])
const askingTurkish = computed(() => quizDir.value === 'te')

function prepare() {
  const word = session.queue[session.index]
  if (!word) {
    session.finished = true
    return
  }
  if (!session.options) session.options = choicesFor(word)
}

function later(fn, ms) {
  timers.push(setTimeout(fn, ms))
}

function choose(index) {
  if (session.answer !== null || session.finished) return
  const word = current.value
  const ok = session.options[index] === word
  session.answer = index
  if (ok) session.correct += 1
  mark(word, ok)
  say(word.t)
  later(() => {
    session.index += 1
    session.answer = null
    session.options = null
    prepare()
  }, 1100)
}

function restart() {
  session.queue = pick(10)
  session.index = 0
  session.correct = 0
  session.answer = null
  session.options = null
  session.finished = false
  prepare()
}

prepare()

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <EndScreen
    v-if="session.finished"
    :correct="session.correct"
    :total="session.queue.length"
    @replay="restart"
  />
  <template v-else>
    <TopBar />
    <ProgressBar :value="session.index" :max="session.queue.length" />
    <div class="card">
      <div class="sub">{{ askingTurkish ? 'İngilizcesi nedir?' : 'Türkçesi nedir?' }}</div>
      <div class="q">{{ askingTurkish ? current.t : current.e }}</div>
      <p v-if="session.answer !== null && !askingTurkish && current.p" class="okunus">Okunuş: {{ current.p }}</p>
    </div>
    <div class="opts">
      <button
        v-for="(option, index) in session.options"
        :key="option.t"
        class="opt"
        :class="{
          ok: session.answer !== null && option === current,
          no: session.answer === index && option !== current,
        }"
        type="button"
        @click="choose(index)"
      >
        {{ askingTurkish ? option.e : option.t }}
        <small v-if="session.answer !== null && askingTurkish && option === current && option.p">Okunuş: {{ option.p }}</small>
      </button>
    </div>
  </template>
</template>
