import type { Metadata } from 'next'
import 'katex/dist/katex.min.css'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Smart Scribes | AI-Powered Classroom Intelligence',
  description: 'AI-Powered Classroom Intelligence — Transforming Live Lectures into Interactive Multimedia Knowledge Notes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400;1,600;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}