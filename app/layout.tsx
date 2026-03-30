import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner' // Placeholder - create later
import DashboardLayout from '@/components/DashboardLayout' // Role-based layout

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ViewOnce Airbnb Stays - Next.js Dashboards',
  description: 'Role-based dashboard platform with AI, real-time, charts & maps',
}

export default function RootLayout({
  children,
}: {
  children
