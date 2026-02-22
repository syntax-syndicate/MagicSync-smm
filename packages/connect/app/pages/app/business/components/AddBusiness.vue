<i18n src="../business.json"></i18n>
<script lang="ts" setup>
import AddBusinessModal from './AddBusinessModal.vue'

const emit = defineEmits(['add', 'cancel'])
const modalOpen = defineModel<boolean>('open')
</script>

<template>
  <AddBusinessModal v-model:open="modalOpen" @add="emit('add')" @cancel="emit('cancel')" />
</template>
