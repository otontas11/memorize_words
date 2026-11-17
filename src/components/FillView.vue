<script setup>
import { computed, reactive } from 'vue'
import { sentenceView } from '../data/words'
import { choicesFor, mark, say, state } from '../composables/useStore'
import EndScreen from './EndScreen.vue'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

function takeQueue() {
  return state.w
    .filter((word) => sentenceView(word.c, word.t)?.spoken)
    .map((word) => [word.s + (word.L ? 20 : 0) + Math.random() * 3, word])
    .sort((a, b) => a[0] - b[0])
    .slice(0, 8)
    .map((item) => item[1])
}

const session = reactive({
  queue: takeQueue(),
  index: 0,
  correct: 0,
  answer: null,
  options: null,
  finished: false,
})

const current = computed(() => session.queue[session.index])
const view = computed(() => sentenceView(current.value?.c, current.value?.t))

function prepare() {
  const word = session.queue[session.index]
  if (!word) {
    session.finished = true
    return
  }
  if (!session.options) session.options = choicesFor(word)
}

function choose(index) {
  if (session.answer !== null || session.finished) return
  const word = current.value
  const ok = session.options[index] === word
  session.answer = index
  if (ok) session.correct += 1
  mark(word, ok, 'fill')
  const spoken = sentenceView(word.c, word.t)?.spoken
  if (spoken) say(spoken)
}

function next() {
  if (session.answer === null || session.finished) return
  session.index += 1
  session.answer = null
  session.options = null
  prepare()
}

function restart() {
  session.queue = takeQueue()
  session.index = 0
  session.correct = 0
  session.answer = null
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
      <div class="sub">Boşluğa uyan kelimeyi seç:</div>
      <div class="q sent">
        {{ view?.before }}
        <b v-if="session.answer !== null" class="hit">{{ view?.token }}</b>
        <u v-else>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
        {{ view?.after }}
      </div>
      <div v-if="current.ce" class="sub trans">{{ current.ce }}</div>
      <p v-if="session.answer !== null && current.p" class="okunus">Okunuş: {{ current.p }}</p>
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
        {{ option.t }}
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
