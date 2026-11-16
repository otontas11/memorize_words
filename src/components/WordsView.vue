<script setup>
import { computed, ref } from 'vue'
import { addCatalogWord, removeCatalogWord, say, state, tl, toast } from '../composables/useStore'
import TopBar from './TopBar.vue'

const turkish = ref('')
const english = ref('')
const sentence = ref('')
const sentenceEn = ref('')
const saving = ref(false)

const learned = computed(() => state.w.filter((word) => word.L))
const learning = computed(() => state.w.filter((word) => !word.L))

function clean(value) {
  return String(value).replace(/[<>&"'\\]/g, '')
}

async function add() {
  if (saving.value) return
  const t = tl(clean(turkish.value))
  const e = tl(clean(english.value))
  if (!t || !e) {
    toast('İki alanı da doldur')
    return
  }
  if (state.w.some((word) => word.t === t)) {
    toast('Bu kelime zaten var')
    return
  }
  const c = clean(sentence.value).trim()
  if (c && !c.includes('___')) {
    toast('Cümlede ___ boşluğu olmalı')
    return
  }
  saving.value = true
  try {
    const synced = await addCatalogWord({
      t,
      e,
      p: '',
      c,
      ce: clean(sentenceEn.value).trim(),
    })
    turkish.value = ''
    english.value = ''
    sentence.value = ''
    sentenceEn.value = ''
    toast(synced ? `Eklendi: ${t} ✅` : `Eklendi: ${t} (bu cihazda)`)
  } finally {
    saving.value = false
  }
}

async function remove(word) {
  if (saving.value) return
  if (state.w.length <= 4) {
    toast('En az 4 kelime kalmalı')
    return
  }
  if (!confirm(`“${word.t}” silinsin mi?`)) return
  saving.value = true
  try {
    await removeCatalogWord(word)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <TopBar />
  <h1>Kelimelerim</h1>
  <p class="sub">Yeni kelime ekle</p>
  <input v-model="turkish" placeholder="Türkçe (örn. sarı)" maxlength="20" autocapitalize="none" />
  <input v-model="english" placeholder="İngilizce (örn. yellow)" maxlength="20" autocapitalize="none" />
  <input v-model="sentence" placeholder="Örnek cümle, boşluk için ___ yaz (isteğe bağlı)" maxlength="80" />
  <input v-model="sentenceEn" placeholder="Cümlenin İngilizcesi (isteğe bağlı)" maxlength="80" />
  <button class="btn g" type="button" @click="add">➕ Ekle</button>

  <p class="sub gap">🎓 Öğrenilenler ({{ learned.length }})</p>
  <p v-if="!learned.length" class="sub">Henüz yok, devam et!</p>
  <div v-for="word in learned" :key="word.id || word.t" class="li">
    <b>{{ word.t }} = {{ word.e }}<small v-if="word.p">Okunuş: {{ word.p }}</small><small>🎓 öğrenildi</small></b>
    <button type="button" @click="say(word.t)">🔊</button>
    <button type="button" @click="remove(word)">🗑️</button>
  </div>

  <p class="sub gap">Öğreniyorum ({{ learning.length }})</p>
  <div v-for="word in learning" :key="word.id || word.t" class="li">
    <b>{{ word.t }} = {{ word.e }}<small v-if="word.p">Okunuş: {{ word.p }}</small><small>Puan: {{ word.s }} / 5</small></b>
    <button type="button" @click="say(word.t)">🔊</button>
    <button type="button" @click="remove(word)">🗑️</button>
  </div>
</template>
