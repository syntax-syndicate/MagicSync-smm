import type { InjectionKey } from 'vue'
import type { InformationSchemaBusinessResponse } from '#layers/BaseScheduler/server/api/v1/ai/information/index.post'

export interface BusinessFormState {
  businessDetails: Partial<{
    name: string
    description: string
    phone: string
    address: string
    website: string
    category: string
  }>
  companyInformation: string
  brandDetails: string
}

export interface BusinessFormActions {
  updateBusinessDetails: (details: Partial<BusinessFormState['businessDetails']>) => void
  updateCompanyInformation: (content: string) => void
  updateBrandDetails: (content: string) => void
  resetForm: (response: InformationSchemaBusinessResponse) => void
  getFormData: () => BusinessFormState
}

export const BusinessFormProviderKey: InjectionKey<{
  state: BusinessFormState
  actions: BusinessFormActions
}> = Symbol('BusinessFormProvider')

export function useBusinessFormProvider() {
  const state = reactive<BusinessFormState>({
    businessDetails: {},
    companyInformation: '',
    brandDetails: '{}'
  })

  const actions: BusinessFormActions = {
    updateBusinessDetails(details) {
      Object.assign(state.businessDetails, details)
    },

    updateCompanyInformation(content) {
      state.companyInformation = content
    },

    updateBrandDetails(content) {
      state.brandDetails = content
    },

    resetForm(response: InformationSchemaBusinessResponse) {
      // Initialize with extracted data
      state.businessDetails = {
        name: response.businessProfile?.name || '',
        description: response.businessProfile?.description || '',
        phone: response.businessProfile?.phone || '',
        address: response.businessProfile?.address || '',
        website: response.businessProfile?.website || '',
        category: response.businessProfile?.category || ''
      }
      state.companyInformation = response.companyInformation || ''
      state.brandDetails = JSON.stringify(response.brandDetails || {}, null, 2)
    },

    getFormData() {
      return { ...state }
    }
  }

  return {
    state,
    actions
  }
}
