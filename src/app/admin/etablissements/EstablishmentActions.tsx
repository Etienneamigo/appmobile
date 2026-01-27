"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, CreditCard, ExternalLink } from "lucide-react"
import { toggleEstablishmentSubscription } from "@/app/actions/admin"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface EstablishmentActionsProps {
  establishment: {
    id: string
    name: string
    subscriptionStatus: string | null
    activity?: { title: string } | null
  }
}

export function EstablishmentActions({ establishment }: EstablishmentActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleToggleSubscription() {
    setIsLoading(true)
    const result = await toggleEstablishmentSubscription(establishment.id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        result.establishment?.subscriptionStatus === "ACTIVE"
          ? "Abonnement active"
          : "Abonnement annule"
      )
      router.refresh()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {establishment.activity && (
          <DropdownMenuItem asChild>
            <Link href={`/activite/${establishment.id}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir l&apos;activite
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleToggleSubscription}>
          <CreditCard className="mr-2 h-4 w-4" />
          {establishment.subscriptionStatus === "ACTIVE"
            ? "Annuler l'abonnement"
            : "Activer l'abonnement"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
