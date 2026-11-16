<script setup>
import { computed } from 'vue'
import { state } from '../composables/useStore'
import { buildStats } from '../composables/useStats'
import ProgressBar from './ProgressBar.vue'
import TopBar from './TopBar.vue'

const stats = computed(() => buildStats(state.w, state.events, state.st))
</script>

<template>
  <TopBar />
  <h1>İstatistik</h1>
  <p class="sub">Öğrenme durumun</p>

  <div class="card summary">
    <b>🎓 Öğrenilen: {{ stats.learned }} / {{ stats.total }}</b>
    <ProgressBar :value="stats.learned" :max="stats.total" />
    <div class="stat-grid">
      <div>
        <b>{{ stats.learning }}</b>
        <small>Öğrenilmekte olan</small>
      </div>
      <div>
        <b>{{ stats.untouched }}</b>
        <small>Hiç çalışılmamış</small>
      </div>
      <div>
        <b>⭐ {{ stats.stars }}</b>
        <small>Yıldız</small>
      </div>
      <div>
        <b>{{ stats.learned }}</b>
        <small>Öğrenilen kelime</small>
      </div>
    </div>
    <small v-if="stats.negative" class="note">Eksi puanlı kelime: {{ stats.negative }}</small>
  </div>

  <div v-if="!stats.hasHistory" class="card">
    <div class="pop">🌱</div>
    <p class="sub">Henüz çalışma yok</p>
  </div>

  <template v-if="stats.hasHistory">
    <div class="card summary left">
      <b>Doğruluk</b>
      <p>{{ stats.accuracyText || 'Henüz soru yok' }}</p>
      <p class="note">Bugünün doğruluğu: {{ stats.todayAccuracy }}</p>
    </div>

    <div class="card summary left">
      <b>Bugün</b>
      <p>Çözülen soru: {{ stats.todayQuestions }}</p>
      <p>Öğrenilen kelime: {{ stats.todayLearned }}</p>
      <p v-if="stats.cards" class="note">Kart pratiği: {{ stats.cards }}</p>
    </div>

    <div class="card summary left">
      <b>Öğrenme hızı</b>
      <p>{{ stats.speedText }}</p>
      <div class="week" aria-label="Son 7 günde öğrenilen kelime">
        <div v-for="day in stats.days" :key="day.key" class="week-col">
          <b>{{ day.count }}</b>
          <div class="bar-track">
            <div class="week-fill" :style="{ height: day.height }"></div>
          </div>
          <small>{{ day.label }}</small>
        </div>
      </div>
      <small class="note">Çubuklar o gün öğrenilen kelime sayısı</small>
      <p v-if="stats.tempo">{{ stats.tempo }}</p>
    </div>

    <div class="card summary left">
      <b>Seri</b>
      <p>{{ stats.streak }} gün</p>
      <small class="note">Üst üste soru çözdüğün günler. Bugün veya dün ile biter.</small>
    </div>

    <div class="card summary left">
      <b>Oyunlara göre</b>
      <div v-for="mode in stats.modes" :key="mode.key" class="stat-row">
        <span>{{ mode.label }}</span>
        <b>{{ mode.ok }} doğru · {{ mode.bad }} yanlış</b>
      </div>
    </div>

    <div class="card summary left">
      <b>En zor 5 kelime</b>
      <p v-if="!stats.hardest.length" class="note">Henüz yok</p>
      <div v-for="word in stats.hardest" :key="word.id" class="stat-row">
        <span>{{ word.label }}</span>
        <b>Puan {{ word.score }}</b>
      </div>
    </div>

    <div class="card summary left">
      <b>Son öğrenilen</b>
      <p v-if="!stats.recent.length" class="note">Henüz yok</p>
      <div v-for="word in stats.recent" :key="word.id" class="stat-row">
        <span>{{ word.label }}</span>
        <b>{{ word.when }}</b>
      </div>
    </div>
  </template>

  <template v-if="!stats.hasHistory && (stats.learned || stats.learning || stats.negative)">
    <div class="card summary left">
      <b>Öğrenme hızı</b>
      <p>{{ stats.speedText }}</p>
      <div class="week" aria-label="Son 7 günde öğrenilen kelime">
        <div v-for="day in stats.days" :key="day.key" class="week-col">
          <b>{{ day.count }}</b>
          <div class="bar-track">
            <div class="week-fill" :style="{ height: day.height }"></div>
          </div>
          <small>{{ day.label }}</small>
        </div>
      </div>
      <p v-if="stats.tempo">{{ stats.tempo }}</p>
    </div>
    <div class="card summary left">
      <b>En zor 5 kelime</b>
      <p v-if="!stats.hardest.length" class="note">Henüz yok</p>
      <div v-for="word in stats.hardest" :key="word.id" class="stat-row">
        <span>{{ word.label }}</span>
        <b>Puan {{ word.score }}</b>
      </div>
    </div>
    <div class="card summary left">
      <b>Son öğrenilen</b>
      <p v-if="!stats.recent.length" class="note">Henüz yok</p>
      <div v-for="word in stats.recent" :key="word.id" class="stat-row">
        <span>{{ word.label }}</span>
        <b>{{ word.when }}</b>
      </div>
    </div>
  </template>
</template>
