import type { Metadata } from 'next'
import 'highlight.js/styles/github.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Write Check',
  description: 'Local markdown writing checker: grammar, spelling and AI-style analysis for German and English',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
