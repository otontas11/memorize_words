<script setup>
import { formatPoints, home, state } from '../composables/useStore'
</script>

<template>
  <div class="top">
    <button class="back" type="button" @click="home()">← Geri</button>
    <div class="badge">⭐ {{ formatPoints(state.st) }}</div>
  </div>
</template>
