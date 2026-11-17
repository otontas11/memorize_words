<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { cloudOn, formatPoints, lastCloudError, startCards, startDrag, startFill, startQuiz, startStats, startWords, startWrite, state } from '../composables/useStore'
import ProgressBar from './ProgressBar.vue'

const total = computed(() => state.w.length)
const learned = computed(() => state.w.filter((word) => word.L).length)
const standalone = ref(false)
const ios = ref(false)
let promptEvent = null

function onBeforeInstall(event) {
  event.preventDefault()
  promptEvent = event
}

function onInstalled() {
  promptEvent = null
  standalone.value = true
}

onMounted(() => {
  standalone.value = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  const ua = navigator.userAgent || ''
  ios.value = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})

async function install() {
  if (!promptEvent) return
  promptEvent.prompt()
  try {
    await promptEvent.userChoice
  } catch {
    /* kullanıcı pencereyi kapattıysa oyun açık kalır */
  }
  promptEvent = null
}
</script>

<template>
  <div class="top">
    <div class="badge" :data-cloud="cloudOn ? 'bulutta' : 'cihaz'" :data-cloud-error="lastCloudError">{{ cloudOn ? '☁️ Bulutta' : '💾 Bu cihazda' }}</div>
    <div class="badge">⭐ {{ formatPoints(state.st) }}</div>
  </div>
  <h1>Kelime Macerası</h1>
  <p class="sub">Türkçe kelimeleri öğren! 🇹🇷</p>
  <div class="card summary">
    <b>🎓 Öğrenilen: {{ learned }} / {{ total }}</b>
    <ProgressBar :value="learned" :max="total" />
    <small class="note">Bir kelime 5 puana ulaşınca öğrenilmiş sayılır</small>
  </div>
  <div class="tiles">
    <button class="tile t5" type="button" @click="startCards()"><span>🃏</span>Kartlar</button>
    <button class="tile t1" type="button" @click="startDrag()"><span>🧩</span>Sürükle-Bırak</button>
    <button class="tile t2" type="button" @click="startQuiz('te')"><span>🇹🇷➜🇬🇧</span>Türkçe soru</button>
    <button class="tile t3" type="button" @click="startQuiz('et')"><span>🇬🇧➜🇹🇷</span>İngilizce soru</button>
    <button class="tile t4" type="button" @click="startWrite()"><span>✍️</span>Yazarak</button>
    <button class="tile t1" type="button" @click="startFill()"><span>📝</span>Cümle tamamla</button>
    <button class="tile t6" type="button" @click="startWords()"><span>📚</span>Kelimelerim / Yeni kelime ekle</button>
    <button class="tile t7" type="button" @click="startStats()"><span>📊</span>İstatistik</button>
  </div>
  <button v-if="!standalone" class="btn" type="button" @click="install">📲 Yükle</button>
  <p v-if="!standalone && ios" class="note">Paylaş düğmesine bas, sonra "Ana Ekrana Ekle".</p>
</template>
