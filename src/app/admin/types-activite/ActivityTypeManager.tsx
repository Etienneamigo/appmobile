"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  createActivityType,
  updateActivityType,
  deleteActivityType,
  toggleActivityTypeActive,
} from "@/app/actions/activity-types"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react"

interface ActivityTypeConfig {
  id: string
  slug: string
  label: string
  emoji: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface ActivityTypeManagerProps {
  initialTypes: ActivityTypeConfig[]
  typeCounts: Record<string, number>
}

export function ActivityTypeManager({ initialTypes, typeCounts }: ActivityTypeManagerProps) {
  const [types, setTypes] = useState(initialTypes)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingType, setEditingType] = useState<ActivityTypeConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ActivityTypeConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    slug: "",
    label: "",
    emoji: "🎯",
    sortOrder: types.length + 1,
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    label: "",
    emoji: "",
    sortOrder: 0,
  })

  async function handleCreate() {
    setIsLoading(true)
    const result = await createActivityType({
      slug: createForm.slug.toUpperCase().replace(/\s+/g, "_"),
      label: createForm.label,
      emoji: createForm.emoji,
      sortOrder: createForm.sortOrder,
    })
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.activityType) {
      toast.success("Type cree avec succes")
      setTypes([...types, result.activityType])
      setIsCreateOpen(false)
      setCreateForm({ slug: "", label: "", emoji: "🎯", sortOrder: types.length + 2 })
    }
  }

  async function handleEdit() {
    if (!editingType) return
    setIsLoading(true)
    const result = await updateActivityType(editingType.id, {
      label: editForm.label,
      emoji: editForm.emoji,
      sortOrder: editForm.sortOrder,
    })
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.activityType) {
      toast.success("Type modifie avec succes")
      setTypes(types.map((t) => (t.id === editingType.id ? result.activityType : t)))
      setEditingType(null)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setIsLoading(true)
    const result = await deleteActivityType(deleteConfirm.id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Type supprime avec succes")
      setTypes(types.filter((t) => t.id !== deleteConfirm.id))
      setDeleteConfirm(null)
    }
  }

  async function handleToggleActive(type: ActivityTypeConfig) {
    const result = await toggleActivityTypeActive(type.id)
    if (result.error) {
      toast.error(result.error)
    } else if (result.activityType) {
      setTypes(types.map((t) => (t.id === type.id ? result.activityType : t)))
      toast.success(result.activityType.isActive ? "Type active" : "Type desactive")
    }
  }

  function openEdit(type: ActivityTypeConfig) {
    setEditForm({
      label: type.label,
      emoji: type.emoji,
      sortOrder: type.sortOrder,
    })
    setEditingType(type)
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Creer un type d&apos;activite</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau type d&apos;activite a la plateforme
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Slug (identifiant unique)</Label>
                <Input
                  placeholder="Ex: ROLLER_CLUB"
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, slug: e.target.value.toUpperCase().replace(/\s+/g, "_") })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Majuscules, chiffres et underscores uniquement
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nom affiche</Label>
                <Input
                  placeholder="Ex: Club de roller"
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <Input
                    placeholder="🎯"
                    value={createForm.emoji}
                    onChange={(e) => setCreateForm({ ...createForm, emoji: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordre</Label>
                  <Input
                    type="number"
                    min="0"
                    value={createForm.sortOrder}
                    onChange={(e) => setCreateForm({ ...createForm, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreate} disabled={isLoading || !createForm.slug || !createForm.label}>
                  Creer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Types list */}
      <Card>
        <CardHeader>
          <CardTitle>Types d&apos;activite ({types.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {types.map((type) => {
              const count = typeCounts[type.slug] || 0
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl">{type.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{type.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {type.slug}
                        </Badge>
                        {!type.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {count} activite{count !== 1 ? "s" : ""} &middot; Ordre: {type.sortOrder}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(type)}
                    >
                      {type.isActive ? "Desactiver" : "Activer"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(type)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(type)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {types.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Aucun type d&apos;activite configure
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le type</DialogTitle>
            <DialogDescription>
              Modifier {editingType?.label} ({editingType?.slug})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom affiche</Label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={editForm.emoji}
                  onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordre</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.sortOrder}
                  onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingType(null)}>
                Annuler
              </Button>
              <Button onClick={handleEdit} disabled={isLoading}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer le type &quot;{deleteConfirm?.emoji} {deleteConfirm?.label}&quot; ?
              {(typeCounts[deleteConfirm?.slug || ""] || 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Attention : {typeCounts[deleteConfirm?.slug || ""]} activite(s) utilisent ce type.
                  La suppression sera bloquee.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
