import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { Header } from "@/components/layout/Header"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"

export default async function EstablishmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/auth/connexion")
  }

  if (session.user.role !== "ESTABLISHMENT") {
    redirect("/")
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-mobile-nav">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </SessionProvider>
  )
}
