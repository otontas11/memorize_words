<script setup>
import { onBeforeUnmount, reactive } from 'vue'
import { mark, pick, say, shuffle, toast } from '../composables/useStore'
import EndScreen from './EndScreen.vue'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

const timers = []
let cleanupDrag = null
let suppressClick = false

function deal() {
  const deck = pick(5)
  return {
    targets: shuffle([...deck]),
    chips: shuffle([...deck]),
    done: [],
    selected: null,
    bad: -1,
    erred: {},
    finished: false,
    correct: 0,
  }
}

const game = reactive(deal())

function later(fn, ms) {
  const id = setTimeout(fn, ms)
  timers.push(id)
  return id
}

function drop(word, index) {
  const target = game.targets[index]
  if (!target || game.done.includes(target)) return
  if (target === word) {
    game.done.push(word)
    if (!game.erred[word.t]) mark(word, true)
    say(word.t)
    game.bad = -1
    if (game.done.length === game.targets.length) {
      game.correct = game.targets.length - Object.keys(game.erred).length
      later(() => {
        game.finished = true
      }, 900)
    }
    return
  }
  if (!game.erred[word.t]) {
    game.erred[word.t] = 1
    mark(word, false)
  }
  game.bad = index
  game.selected = null
  toast('Olmadı, −1 puan. Tekrar dene!')
  later(() => {
    if (game.bad === index) game.bad = -1
  }, 600)
}

function zoneClick(index) {
  if (suppressClick) return
  if (game.selected && !game.done.includes(game.targets[index])) {
    const word = game.selected
    game.selected = null
    drop(word, index)
  }
}

function onDown(event, word) {
  if (game.done.includes(word)) return
  event.preventDefault()
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const offsetY = event.clientY - rect.top
  const startX = event.clientX
  const startY = event.clientY
  let moved = false
  const clone = el.cloneNode(true)
  clone.className = 'chip2 fl'
  clone.style.width = `${rect.width}px`
  document.body.appendChild(clone)
  el.style.opacity = '0.3'

  const place = (point) => {
    clone.style.left = `${point.clientX - offsetX}px`
    clone.style.top = `${point.clientY - offsetY}px`
  }
  place(event)

  const move = (point) => {
    if (Math.abs(point.clientX - startX) + Math.abs(point.clientY - startY) > 8) moved = true
    place(point)
  }

  const finish = (point) => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', finish)
    document.removeEventListener('pointercancel', finish)
    cleanupDrag = null
    clone.remove()
    el.style.opacity = '1'
    if (!moved) {
      game.selected = word
      say(word.t)
      return
    }
    const hit = document.elementFromPoint(point.clientX, point.clientY)
    const zone = hit && hit.closest ? hit.closest('.zone') : null
    if (zone) {
      suppressClick = true
      drop(word, Number(zone.dataset.i))
      later(() => {
        suppressClick = false
      }, 0)
    }
  }

  cleanupDrag = () => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', finish)
    document.removeEventListener('pointercancel', finish)
    clone.remove()
    el.style.opacity = '1'
  }
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', finish)
  document.addEventListener('pointercancel', finish)
}

function restart() {
  Object.assign(game, deal())
}

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  if (cleanupDrag) cleanupDrag()
  document.querySelectorAll('.chip2.fl').forEach((node) => node.remove())
})
</script>

<template>
  <EndScreen
    v-if="game.finished"
    :correct="game.correct"
    :total="game.targets.length"
    @replay="restart"
  />
  <template v-else>
    <TopBar />
    <ProgressBar :value="game.done.length" :max="game.targets.length" />
    <p class="sub hint">Türkçe kelimeyi sürükle, İngilizcesinin kutusuna bırak (ya da dokun, sonra kutuya dokun)</p>
    <div
      v-for="(word, index) in game.targets"
      :key="word.t"
      class="zone"
      :class="{ ok: game.done.includes(word), bad: game.bad === index }"
      :data-i="index"
      @click="zoneClick(index)"
    >
      <b>{{ word.e }}</b>
      <template v-if="game.done.includes(word)">
        {{ word.t }} ✓
        <span v-if="word.p" class="okunus">Okunuş: {{ word.p }}</span>
      </template>
      <template v-else>Türkçesini buraya bırak</template>
    </div>
    <div class="tray">
      <div
        v-for="word in game.chips"
        v-show="!game.done.includes(word)"
        :key="word.t"
        class="chip2"
        :class="{ s: game.selected === word }"
        @pointerdown="onDown($event, word)"
      >
        {{ word.t }}
      </div>
    </div>
  </template>
</template>
