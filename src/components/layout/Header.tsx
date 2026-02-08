"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logoutAction } from "@/app/actions/auth"
import { User, LogOut, Building2, Heart, Menu, Shield, CreditCard, Settings } from "lucide-react"

export function Header() {
  const { data: session, status } = useSession()

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">WADELO</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/recherche" className="text-gray-600 hover:text-gray-900">
            Rechercher
          </Link>
          <Link href="/feed" className="text-gray-600 hover:text-gray-900">
            Feed
          </Link>
          {session?.user?.role === "ESTABLISHMENT" && (
            <>
              <Link href="/etablissement/dashboard" className="text-gray-600 hover:text-gray-900">
                Mon établissement
              </Link>
              <Link href="/etablissement/abonnement" className="text-gray-600 hover:text-gray-900">
                Abonnement
              </Link>
            </>
          )}
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              Administration
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {status === "loading" ? (
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(session.user.name, session.user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session.user.name && (
                      <p className="font-medium">{session.user.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {session.user.role === "USER" && (
                  <DropdownMenuItem asChild>
                    <Link href="/favoris" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Mes favoris
                    </Link>
                  </DropdownMenuItem>
                )}
                {session.user.role === "ESTABLISHMENT" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/etablissement/dashboard" className="cursor-pointer">
                        <Building2 className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/etablissement/parametres" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Parametres
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/etablissement/abonnement" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Abonnement
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {session.user.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutAction}>
                    <button type="submit" className="w-full flex items-center cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/connexion">Connexion</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/inscription">Inscription</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/recherche">Rechercher</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/feed">Feed</Link>
              </DropdownMenuItem>
              {session?.user?.role === "ESTABLISHMENT" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/etablissement/dashboard">Mon établissement</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/etablissement/abonnement">Abonnement</Link>
                  </DropdownMenuItem>
                </>
              )}
              {session?.user?.role === "ADMIN" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">Administration</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
