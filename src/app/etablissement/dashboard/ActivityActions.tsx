"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MoreHorizontal, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react"
import { toggleActivityStatus, deleteActivity } from "@/app/actions/activities"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface ActivityActionsProps {
  activity: {
    id: string
    title: string
    status: string
  }
}

export function ActivityActions({ activity }: ActivityActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleToggleStatus() {
    setIsLoading(true)
    const result = await toggleActivityStatus(activity.id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        result.activity?.status === "PUBLISHED"
          ? "Activité publiée"
          : "Activité mise en brouillon"
      )
      router.refresh()
    }
  }

  async function handleDelete() {
    setIsLoading(true)
    const result = await deleteActivity(activity.id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Activité supprimée")
      setShowDeleteDialog(false)
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/activite/${activity.id}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir la page
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleStatus}>
            {activity.status === "PUBLISHED" ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Mettre en brouillon
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Publier
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;activité</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{activity.title}&quot; ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
