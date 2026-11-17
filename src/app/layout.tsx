import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { MotionProvider } from "@/components/motion-provider";
import { NavigationTracker } from "@/components/navigation-tracker";
import { PengamanViewTransition } from "@/components/pengaman-view-transition";
import { ToastProvider } from "@/components/toast";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Rekomendasi Kos Jatinangor`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-ink">
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
        <PengamanViewTransition />
        {/* Mencatat navigasi internal untuk tombol back (lib/riwayat.ts). */}
        <Suspense fallback={null}>
          <NavigationTracker />
        </Suspense>
      </body>
    </html>
  );
}
