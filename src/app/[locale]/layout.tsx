import type { Metadata } from "next"
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"

import "@/app/globals.css"
import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/layout/theme-provider"

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] })
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"] })
const mono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Prompt Agent",
  description: "Agent-driven prompt asset management",
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${serif.variable} ${mono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
