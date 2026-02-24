<i18n src="../business.json"></i18n>
<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import z from 'zod'
import { provide } from 'vue'

import { CreateBusinessProfileSchema } from '#layers/BaseDB/db/schema'
import BusinessTabs from './BusinessTabs.vue'
import BusinessDetailsTab from './BusinessDetailsTab.vue'
import CompanyInfoTab from './CompanyInfoTab.vue'
import BrandIdentityTab from './BrandIdentityTab.vue'
import type { InformationSchemaBusinessResponse } from '#layers/BaseScheduler/server/api/v1/ai/information/index.post'
import { useBusinessFormProvider, BusinessFormProviderKey } from '../composables/useBusinessFormProvider'

const emit = defineEmits<{
  submit: [payload: FormSubmitEvent<BusinessForm>],
  cancel: []
}>()

const { t } = useI18n()

interface Props {
  result: InformationSchemaBusinessResponse;
}

const props = defineProps<Props>()

// Schema and types
const schema = CreateBusinessProfileSchema.omit({ userId: true });
type BusinessForm = z.infer<typeof schema>;

// Initialize provider with extracted data
const { state, actions } = useBusinessFormProvider()
provide(BusinessFormProviderKey, { state, actions })

// Initialize form with extracted data
onMounted(() => {
  actions.resetForm(props.result)
})

const selectedTab = ref('business');

const tabs = computed(() => [
  { label: t('tabs.business_details'), value: 'business', icon: 'lucide:building-2' },
  { label: t('tabs.company_info'), value: 'company', icon: 'lucide:file-text' },
  { label: t('tabs.brand_identity'), value: 'brand', icon: 'lucide:paint-bucket' }
]);

const handleSubmit = (payload: FormSubmitEvent<BusinessForm>) => {
  // Get current form data from provider
  const formData = actions.getFormData()

  // Combine business details with company info and brand details
  const finalPayload = {
    name: formData.businessDetails.name || '',
    description: formData.businessDetails.description || '',
    phone: formData.businessDetails.phone || '',
    address: formData.businessDetails.address || '',
    website: formData.businessDetails.website || '',
    category: formData.businessDetails.category || '',
    companyInformation: formData.companyInformation,
    brandDetails: formData.brandDetails
  }

  emit('submit', { ...payload, data: finalPayload })
}

const handleCancel = () => {
  emit('cancel');
}
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px] grid grid-cols-1 content-center">
    <UForm :schema="schema" :state="state.businessDetails" @submit="handleSubmit" class="space-y-6">
      <!-- Enhanced Tab System -->
      <BusinessTabs v-model="selectedTab" :tabs="tabs">
        <template #default="{ selectedTab }">
          <!-- Business Details Tab -->
          <BusinessDetailsTab v-if="selectedTab === 'business'" />

          <!-- Company Info Tab -->
          <CompanyInfoTab v-else-if="selectedTab === 'company'" />

          <!-- Brand Identity Tab -->
          <BrandIdentityTab v-else-if="selectedTab === 'brand'" />
        </template>
      </BusinessTabs>

      <!-- Form Actions -->
      <div
        class="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-8 border-t border-gray-200 dark:border-gray-800 -mx-6 -mb-6 px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <UButton color="neutral" variant="ghost" class="w-full sm:w-auto justify-center" @click="handleCancel">
          {{ t('form.cancel') }}
        </UButton>
        <UButton type="submit" color="primary" size="md" icon="lucide:check-circle-2"
          class="w-full sm:w-auto justify-center shadow-md">
          {{ t('form.save') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
