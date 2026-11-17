<script setup>
import { computed, reactive } from 'vue'
import { awardQuiz, buzz, choicesFor, pick, quizDir, say } from '../composables/useStore'
import EndScreen from './EndScreen.vue'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

const QUIZ_GAINS = [1, 0.5, 0.25, 0]

const session = reactive({
  queue: pick(10),
  index: 0,
  correct: 0,
  answer: null,
  missed: [],
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

function choose(index) {
  if (session.answer !== null || session.finished || session.missed.includes(index)) return
  const word = current.value
  const ok = session.options[index] === word
  if (!ok) {
    session.missed.push(index)
    buzz()
    return
  }
  const gain = QUIZ_GAINS[Math.min(session.missed.length, QUIZ_GAINS.length - 1)]
  session.answer = index
  if (gain === 1) session.correct += 1
  awardQuiz(word, gain)
  say(word.t)
}

function next() {
  if (session.answer === null || session.finished) return
  session.index += 1
  session.answer = null
  session.missed = []
  session.options = null
  prepare()
}

function restart() {
  session.queue = pick(10)
  session.index = 0
  session.correct = 0
  session.answer = null
  session.missed = []
  session.options = null
  session.finished = false
  prepare()
}

prepare()
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
    <div class="opts" :class="{ locked: session.answer !== null }">
      <button
        v-for="(option, index) in session.options"
        :key="option.t"
        class="opt"
        :class="{
          ok: session.answer !== null && option === current,
          no: session.missed.includes(index),
        }"
        type="button"
        @click="choose(index)"
      >
        {{ askingTurkish ? option.e : option.t }}
        <small v-if="session.answer !== null && askingTurkish && option === current && option.p">Okunuş: {{ option.p }}</small>
      </button>
    </div>
    <button
      v-if="session.answer !== null"
      class="btn g"
      type="button"
      @click="next"
      @keydown.enter.prevent
    >Sıradaki ➜</button>
  </template>
</template>
