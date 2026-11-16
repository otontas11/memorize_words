<script setup>
import { home, save, state } from '../composables/useStore'
import TopBar from './TopBar.vue'

const props = defineProps({
  correct: { type: Number, required: true },
  total: { type: Number, required: true },
})

const emit = defineEmits(['replay'])

const bonus = Math.max(1, Math.round((props.correct / props.total) * 3))
state.st += bonus
save()
</script>

<template>
  <TopBar />
  <div class="card">
    <div class="pop">{{ correct / total > 0.7 ? '🏆' : '👏' }}</div>
    <h1>{{ correct }} / {{ total }}</h1>
    <p class="sub">+{{ bonus }} ⭐ bonus kazandın!</p>
  </div>
  <button class="btn g" type="button" @click="emit('replay')">Tekrar oyna</button>
  <button class="btn l" type="button" @click="home()">Ana sayfa</button>
</template>
