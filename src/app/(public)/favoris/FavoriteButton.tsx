"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toggleFavorite } from "@/app/actions/favorites"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Heart, Loader2 } from "lucide-react"

interface FavoriteButtonProps {
  activityId: string
}

export function FavoriteButton({ activityId }: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleRemove() {
    setIsLoading(true)
    const result = await toggleFavorite(activityId)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Retiré des favoris")
      router.refresh()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRemove}
      disabled={isLoading}
      className="text-red-500 hover:text-red-600 hover:bg-red-50"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Heart className="h-5 w-5 fill-current" />
      )}
    </Button>
  )
}
