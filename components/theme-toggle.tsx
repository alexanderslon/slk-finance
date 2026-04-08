'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeToggle({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button type="button" variant={variant} size="icon" disabled aria-label="Тема" className="shrink-0">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark'

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      className="shrink-0"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
