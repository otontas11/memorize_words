<script setup>
import { computed } from 'vue'
import { startCards, startDrag, startFill, startQuiz, startWords, startWrite, state } from '../composables/useStore'
import ProgressBar from './ProgressBar.vue'

const total = computed(() => state.w.length)
const learned = computed(() => state.w.filter((word) => word.L).length)
</script>

<template>
  <div class="top">
    <div class="badge">💾 Bu cihazda</div>
    <div class="badge">⭐ {{ state.st }}</div>
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
  </div>
</template>
