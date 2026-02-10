import { SessionProvider } from "@/components/providers/SessionProvider"
import { Header } from "@/components/layout/Header"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pb-mobile-nav">
          {children}
        </main>
        <footer className="border-t py-8 bg-gray-50 hidden md:block">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Activités. Tous droits réservés.</p>
          </div>
        </footer>
        <MobileBottomNav />
      </div>
    </SessionProvider>
  )
}
