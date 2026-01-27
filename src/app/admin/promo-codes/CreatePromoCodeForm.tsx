"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPromoCode } from "@/app/actions/admin"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

export function CreatePromoCodeForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      code: formData.get("code") as string,
      description: formData.get("description") as string || undefined,
      extraTrialDays: parseInt(formData.get("extraTrialDays") as string) || 0,
      maxRedemptions: formData.get("maxRedemptions")
        ? parseInt(formData.get("maxRedemptions") as string)
        : null,
      expiresAt: formData.get("expiresAt")
        ? new Date(formData.get("expiresAt") as string).toISOString()
        : null,
    }

    const result = await createPromoCode(data)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Code promo cree")
      setIsOpen(false)
      router.refresh()
      // Reset form
      e.currentTarget.reset()
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Creer un code promo
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau code promo</CardTitle>
        <CardDescription>
          Creez un code promotionnel pour etendre la periode d&apos;essai
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                name="code"
                placeholder="ETE2024"
                required
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extraTrialDays">Jours d&apos;essai supplementaires *</Label>
              <Input
                id="extraTrialDays"
                name="extraTrialDays"
                type="number"
                min="0"
                defaultValue="30"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Code promo ete 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRedemptions">Nombre max d&apos;utilisations</Label>
              <Input
                id="maxRedemptions"
                name="maxRedemptions"
                type="number"
                min="1"
                placeholder="Illimite"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Date d&apos;expiration</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creation..." : "Creer le code"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
