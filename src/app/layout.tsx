import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';

import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { Providers } from './providers';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Gift Exchange",
  description: "Transfer tokens to someone and receive tokens in return",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
