<script setup>
import { reactive } from 'vue'
import { home, pick, save, say, state } from '../composables/useStore'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

const session = reactive({
  deck: pick(10),
  index: 0,
  flip: false,
  done: false,
})

const current = () => session.deck[session.index]

function toggle() {
  session.flip = !session.flip
}

function next() {
  if (session.done) return
  session.index += 1
  session.flip = false
  if (session.index >= session.deck.length) {
    session.done = true
    state.st += 2
    save()
  }
}

function restart() {
  session.deck = pick(10)
  session.index = 0
  session.flip = false
  session.done = false
}
</script>

<template>
  <template v-if="session.done">
    <TopBar />
    <div class="card">
      <div class="pop">🌟</div>
      <h1>Harika!</h1>
      <p class="sub">Kartları bitirdin. +2 ⭐</p>
    </div>
    <button class="btn g" type="button" @click="restart">Yeni kartlar</button>
    <button class="btn l" type="button" @click="home()">Ana sayfa</button>
  </template>
  <template v-else>
    <TopBar />
    <ProgressBar :value="session.index" :max="session.deck.length" />
    <div class="card flipcard" @click="toggle">
      <div class="q">{{ current().t }}</div>
      <div class="q en-line">{{ session.flip ? current().e : '?' }}</div>
      <p v-if="session.flip && current().p" class="okunus">Okunuş: {{ current().p }}</p>
      <div v-if="!session.flip" class="sub">Dokun, İngilizcesini gör</div>
    </div>
    <div class="row">
      <button class="btn y" type="button" @click="say(current().t)">🔊 Türkçe</button>
      <button class="btn y" type="button" @click="say(current().e, 'en-US')">🔊 English</button>
    </div>
    <button class="btn g" type="button" @click="next">Sıradaki ➜</button>
  </template>
</template>
