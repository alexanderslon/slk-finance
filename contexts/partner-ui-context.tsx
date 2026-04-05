'use client'

import * as React from 'react'

type PartnerUiValue = {
  newRequestOpen: boolean
  setNewRequestOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const PartnerUiContext = React.createContext<PartnerUiValue | null>(null)

export function PartnerUiProvider({ children }: { children: React.ReactNode }) {
  const [newRequestOpen, setNewRequestOpen] = React.useState(false)
  const value = React.useMemo(
    () => ({ newRequestOpen, setNewRequestOpen }),
    [newRequestOpen],
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
