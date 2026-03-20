<script lang="ts" setup>
/**
 *
 * SavedPodcastCard — displays a favorite/saved podcast with remove option
 *
 * @author Ismael Garcia <leamsigc@leamsigc.com>
 * @version 0.0.1
 */

interface Props {
  id: string
  title: string
  author: string
  artwork: string
  feedUrl: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'remove'): void
}>()
</script>

<template>
  <div
    class="group relative rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-primary/30 hover:bg-white/10 cursor-pointer"
    data-testid="podcast-favorite-card"
    @click="emit('select')"
  >
    <UButton
      icon="i-lucide-x"
      variant="ghost"
      size="xs"
      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      @click.stop="emit('remove')"
    />
    <div class="flex items-center gap-3">
      <img
        v-if="artwork"
        :src="artwork"
        :alt="title"
        class="w-14 h-14 rounded-lg object-cover shrink-0"
        loading="lazy"
      >
      <div v-else class="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-microphone" class="w-6 h-6 text-gray-600" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-white line-clamp-2 leading-snug">{{ title }}</h3>
        <p class="text-xs text-gray-500 mt-0.5 truncate">{{ author }}</p>
      </div>
    </div>
  </div>
</template>
