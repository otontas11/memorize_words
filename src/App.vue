<script setup>
import { watch } from 'vue'
import { screen, toastText } from './composables/useStore'
import HomeView from './components/HomeView.vue'
import CardsView from './components/CardsView.vue'
import QuizView from './components/QuizView.vue'
import WriteView from './components/WriteView.vue'
import DragView from './components/DragView.vue'
import FillView from './components/FillView.vue'
import WordsView from './components/WordsView.vue'
import StatsView from './components/StatsView.vue'

watch(screen, () => window.scrollTo(0, 0))
</script>

<template>
  <HomeView v-if="screen === 'home'" />
  <CardsView v-else-if="screen === 'cards'" />
  <QuizView v-else-if="screen === 'quiz'" />
  <WriteView v-else-if="screen === 'write'" />
  <DragView v-else-if="screen === 'dnd'" />
  <FillView v-else-if="screen === 'fill'" />
  <WordsView v-else-if="screen === 'words'" />
  <StatsView v-else-if="screen === 'stats'" />
  <div v-if="toastText" class="toast">{{ toastText }}</div>
</template>
