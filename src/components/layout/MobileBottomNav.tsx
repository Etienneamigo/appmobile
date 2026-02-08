"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Play,
  Search,
  Heart,
  User,
  Building2,
  Settings,
  Shield,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

function getNavItems(role?: string): NavItem[] {
  const iconClass = "h-5 w-5"

  switch (role) {
    case "ESTABLISHMENT":
      return [
        { href: "/feed", label: "Feed", icon: <Play className={iconClass} /> },
        { href: "/etablissement/dashboard", label: "Activité", icon: <Building2 className={iconClass} /> },
        { href: "/etablissement/parametres", label: "Profil", icon: <Settings className={iconClass} /> },
        { href: "/etablissement/abonnement", label: "Compte", icon: <User className={iconClass} /> },
      ]
    case "ADMIN":
      return [
        { href: "/admin", label: "Admin", icon: <Shield className={iconClass} /> },
        { href: "/feed", label: "Feed", icon: <Play className={iconClass} /> },
        { href: "/recherche", label: "Recherche", icon: <Search className={iconClass} /> },
        { href: "/admin/parametres", label: "Compte", icon: <User className={iconClass} /> },
      ]
    default:
      // USER or unauthenticated
      return [
        { href: "/feed", label: "Feed", icon: <Play className={iconClass} /> },
        { href: "/recherche", label: "Recherche", icon: <Search className={iconClass} /> },
        { href: "/favoris", label: "Favoris", icon: <Heart className={iconClass} /> },
        { href: "/auth/connexion", label: "Compte", icon: <User className={iconClass} /> },
      ]
  }
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = session?.user?.role
  const items = getNavItems(role)

  // If user is authenticated, replace "Compte" link for USER role
  if (role === "USER") {
    const compteItem = items.find(i => i.label === "Compte")
    if (compteItem) {
      compteItem.href = "/favoris"
    }
  }

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active
                  ? "text-gray-900"
                  : "text-gray-400 active:text-gray-600"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
