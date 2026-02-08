"use client"

import { useState, useRef } from "react"
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
import { Plus, Pencil, Trash2, GripVertical, Upload, X, Loader2 } from "lucide-react"

interface ActivityTypeConfig {
  id: string
  slug: string
  label: string
  emoji: string
  iconUrl: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface ActivityTypeManagerProps {
  initialTypes: ActivityTypeConfig[]
  typeCounts: Record<string, number>
}

// Normalize upload URLs to use API route
function normalizeUploadUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

export function ActivityTypeManager({ initialTypes, typeCounts }: ActivityTypeManagerProps) {
  const [types, setTypes] = useState(initialTypes)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingType, setEditingType] = useState<ActivityTypeConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ActivityTypeConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const createIconInputRef = useRef<HTMLInputElement>(null)
  const editIconInputRef = useRef<HTMLInputElement>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    slug: "",
    label: "",
    emoji: "🎯",
    iconUrl: null as string | null,
    sortOrder: types.length + 1,
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    label: "",
    emoji: "",
    iconUrl: null as string | null,
    sortOrder: 0,
  })

  async function uploadIcon(file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", file)

    try {
      setIsUploadingIcon(true)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "Erreur lors de l'upload de l'icone")
        return null
      }
      return data.url
    } catch {
      toast.error("Erreur lors de l'upload de l'icone")
      return null
    } finally {
      setIsUploadingIcon(false)
    }
  }

  async function handleCreateIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadIcon(file)
    if (url) {
      setCreateForm({ ...createForm, iconUrl: url })
    }
    if (createIconInputRef.current) createIconInputRef.current.value = ""
  }

  async function handleEditIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadIcon(file)
    if (url) {
      setEditForm({ ...editForm, iconUrl: url })
    }
    if (editIconInputRef.current) editIconInputRef.current.value = ""
  }

  async function handleCreate() {
    setIsLoading(true)
    const result = await createActivityType({
      slug: createForm.slug.toUpperCase().replace(/\s+/g, "_"),
      label: createForm.label,
      emoji: createForm.emoji,
      iconUrl: createForm.iconUrl,
      sortOrder: createForm.sortOrder,
    })
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.activityType) {
      toast.success("Type cree avec succes")
      setTypes([...types, result.activityType])
      setIsCreateOpen(false)
      setCreateForm({ slug: "", label: "", emoji: "🎯", iconUrl: null, sortOrder: types.length + 2 })
    }
  }

  async function handleEdit() {
    if (!editingType) return
    setIsLoading(true)
    const result = await updateActivityType(editingType.id, {
      label: editForm.label,
      emoji: editForm.emoji,
      iconUrl: editForm.iconUrl,
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
      iconUrl: type.iconUrl,
      sortOrder: type.sortOrder,
    })
    setEditingType(type)
  }

  // Helper to render icon or emoji
  function renderTypeIcon(type: { emoji: string; iconUrl: string | null }, size: "sm" | "lg" = "sm") {
    const sizeClass = size === "lg" ? "h-8 w-8" : "h-6 w-6"
    if (type.iconUrl) {
      return (
        <img
          src={normalizeUploadUrl(type.iconUrl)}
          alt=""
          className={`${sizeClass} object-contain`}
        />
      )
    }
    return <span className={size === "lg" ? "text-2xl" : "text-xl"}>{type.emoji}</span>
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
                  <Label>Emoji (fallback)</Label>
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
              {/* Icon upload */}
              <div className="space-y-2">
                <Label>Icone (png/svg)</Label>
                {createForm.iconUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={normalizeUploadUrl(createForm.iconUrl)}
                      alt="Icone"
                      className="h-10 w-10 object-contain rounded border p-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreateForm({ ...createForm, iconUrl: null })}
                    >
                      <X className="h-4 w-4" />
                      Retirer
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => createIconInputRef.current?.click()}
                    disabled={isUploadingIcon}
                  >
                    {isUploadingIcon ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Uploader une icone
                  </Button>
                )}
                <input
                  ref={createIconInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  className="hidden"
                  onChange={handleCreateIconUpload}
                />
                <p className="text-xs text-muted-foreground">
                  Optionnel. Si aucune icone, l&apos;emoji sera utilise.
                </p>
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
                    {renderTypeIcon(type)}
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
                        {type.iconUrl && " · Icone personnalisee"}
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
                <Label>Emoji (fallback)</Label>
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
            {/* Icon upload */}
            <div className="space-y-2">
              <Label>Icone (png/svg)</Label>
              {editForm.iconUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={normalizeUploadUrl(editForm.iconUrl)}
                    alt="Icone"
                    className="h-10 w-10 object-contain rounded border p-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditForm({ ...editForm, iconUrl: null })}
                  >
                    <X className="h-4 w-4" />
                    Retirer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editIconInputRef.current?.click()}
                    disabled={isUploadingIcon}
                  >
                    {isUploadingIcon ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Remplacer
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editIconInputRef.current?.click()}
                  disabled={isUploadingIcon}
                >
                  {isUploadingIcon ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Uploader une icone
                </Button>
              )}
              <input
                ref={editIconInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/webp,image/jpeg"
                className="hidden"
                onChange={handleEditIconUpload}
              />
              <p className="text-xs text-muted-foreground">
                Optionnel. Si aucune icone, l&apos;emoji sera utilise.
              </p>
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
