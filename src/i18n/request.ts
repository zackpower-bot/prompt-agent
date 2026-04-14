import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

type SupportedLocale = (typeof routing.locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale
  const resolvedLocale =
    locale && routing.locales.includes(locale as SupportedLocale)
      ? (locale as SupportedLocale)
      : routing.defaultLocale

  return {
    locale: resolvedLocale,
    messages: (await import(`../../messages/${resolvedLocale}.json`)).default,
  }
})
