'use client'

import { useCallback, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

type ConfirmOptions = {
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `destructive` красит кнопку подтверждения в красный — для удалений. */
  variant?: 'default' | 'destructive'
}

type DialogState = ConfirmOptions & {
  resolve: (ok: boolean) => void
}

/**
 * Хук-замена `window.confirm`, рендерит aware-of-theme `<AlertDialog>`.
 * Возвращает `confirm(opts)` (промис → true/false) и `<dialog>` для рендера.
 *
 * Использование:
 * ```tsx
 * const { confirm, dialog } = useConfirmDialog()
 * if (await confirm({ title: 'Удалить?', variant: 'destructive' })) {
 *   // ...
 * }
 * return (<>... {dialog}</>)
 * ```
 */
export function useConfirmDialog() {
  const [state, setState] = useState<DialogState | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve })
    })
  }, [])

  const handleClose = (ok: boolean) => {
    if (state) state.resolve(ok)
    setState(null)
  }

  const dialog = (
    <AlertDialog
      open={!!state}
      onOpenChange={(open) => {
        if (!open && state) {
          state.resolve(false)
          setState(null)
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title ?? ''}</AlertDialogTitle>
          {state?.description ? (
            <AlertDialogDescription asChild>
              <div>{state.description}</div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)}>
            {state?.cancelLabel ?? 'Отмена'}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              state?.variant === 'destructive'
                ? buttonVariants({ variant: 'destructive' })
                : '',
            )}
            onClick={() => handleClose(true)}
          >
            {state?.confirmLabel ?? 'Удалить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, dialog }
}
