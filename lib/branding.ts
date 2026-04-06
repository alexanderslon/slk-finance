/** Единое имя и слоган для UI и SEO */

export const SITE_NAME = 'Sarafan' as const

export const SITE_TAGLINE = 'От человека — к человеку' as const

/** Заголовок вкладки браузера и og:title */
export const SITE_METADATA_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}` as const

/** Meta description / og:description */
export const SITE_METADATA_DESCRIPTION =
  `${SITE_NAME}. ${SITE_TAGLINE} Платформа для учёта, заявок партнёров и бонусов.` as const
