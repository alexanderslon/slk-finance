'use client'

import * as React from 'react'

type PartnerUiValue = {
  newRequestOpen: boolean
  setNewRequestOpen: React.Dispatch<React.SetStateAction<boolean>>
  /** Перед открытием с кнопки «Новая заявка» / моб. «Заявка» — сбросить категорию (регистрирует PartnerDashboard). */
  registerPrepareGenericNewRequest: (fn: (() => void) | null) => void
  openGenericNewRequest: () => void
  /** Карточка «Нужна помощь» регистрирует прокрутку и раскрытие формы (моб. нижняя навигация). */
  registerOpenPartnerHelpForm: (fn: (() => void) | null) => void
  openPartnerHelpForm: () => void
}

const PartnerUiContext = React.createContext<PartnerUiValue | null>(null)

export function PartnerUiProvider({ children }: { children: React.ReactNode }) {
  const [newRequestOpen, setNewRequestOpen] = React.useState(false)
  const prepareGenericRef = React.useRef<(() => void) | null>(null)
  const openPartnerHelpFormRef = React.useRef<(() => void) | null>(null)

  const registerPrepareGenericNewRequest = React.useCallback((fn: (() => void) | null) => {
    prepareGenericRef.current = fn
  }, [])

  const openGenericNewRequest = React.useCallback(() => {
    prepareGenericRef.current?.()
    setNewRequestOpen(true)
  }, [])

  const registerOpenPartnerHelpForm = React.useCallback((fn: (() => void) | null) => {
    openPartnerHelpFormRef.current = fn
  }, [])

  const openPartnerHelpForm = React.useCallback(() => {
    openPartnerHelpFormRef.current?.()
  }, [])

  const value = React.useMemo(
    () => ({
      newRequestOpen,
      setNewRequestOpen,
      registerPrepareGenericNewRequest,
      openGenericNewRequest,
      registerOpenPartnerHelpForm,
      openPartnerHelpForm,
    }),
    [
      newRequestOpen,
      registerPrepareGenericNewRequest,
      openGenericNewRequest,
      registerOpenPartnerHelpForm,
      openPartnerHelpForm,
    ],
  )

  return <PartnerUiContext.Provider value={value}>{children}</PartnerUiContext.Provider>
}

export function usePartnerUi() {
  const ctx = React.useContext(PartnerUiContext)
  if (!ctx) {
    throw new Error('usePartnerUi must be used within PartnerUiProvider')
  }
  return ctx
}
