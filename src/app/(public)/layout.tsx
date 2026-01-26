import { SessionProvider } from "@/components/providers/SessionProvider"
import { Header } from "@/components/layout/Header"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t py-8 bg-gray-50">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Activités. Tous droits réservés.</p>
          </div>
        </footer>
      </div>
    </SessionProvider>
  )
}
