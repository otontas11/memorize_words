<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, required: true },
})

const width = computed(() => (props.max ? Math.max(0, (props.value / props.max) * 100) : 0))
</script>

<template>
  <div class="bar"><i :style="{ width: width + '%' }"></i></div>
</template>
