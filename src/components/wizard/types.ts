import type {
  ComponentType,
  Dispatch,
  ReactNode,
  SetStateAction,
} from 'react'

export type WizardStepComponent<T extends object = Record<string, unknown>> =
  ComponentType<Record<string, never>>

export type WizardContextValue<T extends object> = {
  currentStepIndex: number
  totalSteps: number
  wizardData: T
  setWizardData: Dispatch<SetStateAction<T>>
  updateWizardData: (updates: Partial<T>) => void
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void
  cancel: () => void
  title?: string
  showStepCounter: boolean
}

export type WizardProviderProps<T extends object> = {
  steps: WizardStepComponent<T>[]
  initialData?: T
  onComplete: (data: T) => void
  onCancel?: () => void
  children?: ReactNode
  title?: string
  showStepCounter?: boolean
}
