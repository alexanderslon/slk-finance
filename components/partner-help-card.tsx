'use client'

import { useState, useEffect } from 'react'
import { Phone, Send, ChevronDown, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RuPhoneField } from '@/components/ru-phone-field'
import {
  formatRuPhoneInput,
  formatCustomerPhoneDisplay,
  isCompleteRuMobile,
  ruPhoneDigits,
  RU_PHONE_FIELD_PREFIX,
} from '@/lib/phone-format'
import {
  PARTNER_HELP_PHONE_DISPLAY,
  PARTNER_HELP_TEL_HREF,
  partnerHelpMailtoHref,
  partnerHelpTelegramHref,
} from '@/lib/partner-support-links'
import { cn } from '@/lib/utils'
import { usePartnerUi } from '@/contexts/partner-ui-context'

function initialPhoneFromProfile(profilePhone: string | null | undefined) {
  const d = ruPhoneDigits(profilePhone || '')
  return isCompleteRuMobile(d) ? formatRuPhoneInput(d) : RU_PHONE_FIELD_PREFIX
}

export function PartnerHelpCard({
  profilePhone = null,
}: {
  profilePhone?: string | null
}) {
  const telegramHref = partnerHelpTelegramHref()
  const mailHref = partnerHelpMailtoHref()
  const { registerOpenPartnerHelpForm } = usePartnerUi()

  const profileDigits = ruPhoneDigits(profilePhone || '')
  const hasProfilePhone = isCompleteRuMobile(profileDigits)

  const [formOpen, setFormOpen] = useState(false)
  const [useOtherPhone, setUseOtherPhone] = useState(false)
  const [phone, setPhone] = useState(() => initialPhoneFromProfile(profilePhone))
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  const skipPhoneInForm = hasProfilePhone && !useOtherPhone

  useEffect(() => {
    registerOpenPartnerHelpForm(() => {
      document.getElementById('partner-help-feedback')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      window.setTimeout(() => setFormOpen(true), 320)
    })
    return () => registerOpenPartnerHelpForm(null)
  }, [registerOpenPartnerHelpForm])

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!skipPhoneInForm && !isCompleteRuMobile(ruPhoneDigits(phone))) {
      setError('Введите полный номер: +7 и 10 цифр')
      return
    }
    setLoading(true)
    try {
      const payload = skipPhoneInForm
        ? { question: question.trim() }
        : { phone: phone.trim(), question: question.trim() }
      const res = await fetch('/api/partner-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
      if (!res.ok) {
        let msg = data?.error || 'Не удалось отправить'
        if (data?.detail) msg += ` — ${data.detail}`
        setError(msg)
        return
      }
      setFormSuccess(true)
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  function resetFormBlock() {
    setFormSuccess(false)
    setError('')
    setUseOtherPhone(false)
    setPhone(initialPhoneFromProfile(profilePhone))
    setQuestion('')
  }

  return (
    <Card
      id="partner-help-feedback"
      className="scroll-mt-[max(5.5rem,env(safe-area-inset-top,0px))] border-success/30 bg-gradient-to-b from-success/[0.06] to-card shadow-sm dark:from-success/10 dark:to-card"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-snug sm:text-lg">
          Нужна помощь по бонусам или заявкам?
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Наши менеджеры помогут быстро разобраться
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-xs text-muted-foreground sm:text-sm">
          Номер для связи:{' '}
          <a
            href={PARTNER_HELP_TEL_HREF}
            className="font-semibold tabular-nums text-foreground underline-offset-2 hover:underline"
          >
            {PARTNER_HELP_PHONE_DISPLAY}
          </a>
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            size="lg"
            className="h-12 flex-1 gap-2 bg-success text-base font-semibold text-success-foreground hover:bg-success/90 sm:min-w-[10rem]"
            asChild
          >
            <a href={PARTNER_HELP_TEL_HREF}>
              <Phone className="h-5 w-5 shrink-0" aria-hidden />
              Позвонить
            </a>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-12 flex-1 gap-2 border-[#229ED9]/55 text-base hover:bg-[#229ED9]/10 dark:hover:bg-[#229ED9]/15 sm:min-w-[10rem]"
            asChild
          >
            <a href={telegramHref} target="_blank" rel="noopener noreferrer">
              <Send className="h-5 w-5 shrink-0 text-[#229ED9]" aria-hidden />
              Telegram
            </a>
          </Button>
        </div>

        {mailHref ? (
          <p className="text-center text-sm sm:text-left">
            <a href={mailHref} className="text-primary underline-offset-2 hover:underline">
              Написать на почту
            </a>
          </p>
        ) : null}

        <Collapsible
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) resetFormBlock()
          }}
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex h-auto w-full items-center justify-between gap-2 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Описать вопрос текстом</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 transition-transform', formOpen && 'rotate-180')}
                aria-hidden
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 overflow-hidden pt-1">
            {formSuccess ? (
              <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Мы свяжемся с вами в течение 15 минут
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                  Закрыть
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs text-muted-foreground">
                  Отправим менеджеру уведомление. Можно также позвонить или написать в мессенджер — так
                  часто быстрее.
                </p>
                {hasProfilePhone && !useOtherPhone ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Для обратного звонка используем номер из вашего профиля:{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCustomerPhoneDisplay(profilePhone)}
                    </span>
                    . Если удобнее другой номер —{' '}
                    <button
                      type="button"
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        setUseOtherPhone(true)
                        setError('')
                      }}
                    >
                      укажите вручную
                    </button>
                    .
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor="help_form_phone">Телефон для связи</Label>
                      {hasProfilePhone ? (
                        <button
                          type="button"
                          className="text-xs text-primary underline-offset-2 hover:underline"
                          onClick={() => {
                            setUseOtherPhone(false)
                            setPhone(initialPhoneFromProfile(profilePhone))
                            setError('')
                          }}
                        >
                          Взять номер из профиля
                        </button>
                      ) : null}
                    </div>
                    <RuPhoneField
                      id="help_form_phone"
                      value={phone}
                      onChange={(v) => {
                        setPhone(v)
                        setError('')
                      }}
                    />
                    {!hasProfilePhone ? (
                      <p className="text-[11px] text-muted-foreground">
                        Номер можно также добавить в карточке партнёра в админке — тогда поле здесь
                        заполнится само.
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="help_form_question">Вопрос</Label>
                  <Textarea
                    id="help_form_question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Кратко опишите ситуацию"
                    className="min-h-[100px] resize-y text-base sm:text-sm"
                    maxLength={4000}
                    required
                    minLength={3}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                  {loading ? 'Отправка…' : 'Отправить вопрос'}
                </Button>
              </form>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
