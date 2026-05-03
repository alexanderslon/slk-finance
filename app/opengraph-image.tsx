import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE, SITE_METADATA_DESCRIPTION } from '@/lib/branding'

export const runtime = 'edge'
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 } as const
export const contentType = 'image/png'

/**
 * Open Graph картинка для соцсетей и автоскриншотов превью (Telegram, X, LinkedIn,
 * Vercel Dashboard и т.д.). Рендерится edge-функцией при первом обращении и
 * кешируется CDN-ом — поэтому не бьёт по runtime страницы.
 *
 * Стиль выдержан в фирменных зелёно-синих тонах (oklch-палитра проекта,
 * пересчитанная в близкий sRGB), чтобы не плодить кастомные ассеты.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          color: '#0F172A',
          background:
            'linear-gradient(135deg, #ECFDF5 0%, #DBEAFE 55%, #E0F2FE 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontSize: '34px',
            fontWeight: 700,
            color: '#0F766E',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background:
                'linear-gradient(135deg, #10B981 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '36px',
              fontWeight: 800,
              letterSpacing: '-1px',
            }}
          >
            S
          </div>
          {SITE_NAME}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: '92px',
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-2px',
              color: '#0F172A',
              maxWidth: '900px',
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div
            style={{
              fontSize: '32px',
              lineHeight: 1.3,
              color: '#334155',
              maxWidth: '880px',
            }}
          >
            {SITE_METADATA_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap',
            fontSize: '24px',
            fontWeight: 600,
            color: '#0F766E',
          }}
        >
          {['Учёт финансов', 'Заявки партнёров', 'Сметы A4', 'Аналитика KPI'].map((tag) => (
            <div
              key={tag}
              style={{
                padding: '10px 22px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(15, 118, 110, 0.25)',
                display: 'flex',
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
