"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { registerUserAction, registerEstablishmentAction } from "@/app/actions/auth"
import { toast } from "sonner"
import { User, Building2 } from "lucide-react"

type AccountType = "user" | "establishment" | null

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleUserSubmit(formData: FormData) {
    setIsLoading(true)
    const result = await registerUserAction(formData)
    setIsLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Compte créé avec succès !")
      router.push("/")
      router.refresh()
    }
  }

  async function handleEstablishmentSubmit(formData: FormData) {
    setIsLoading(true)
    const result = await registerEstablishmentAction(formData)
    setIsLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Compte établissement créé avec succès !")
      router.push("/etablissement/dashboard")
      router.refresh()
    }
  }

  if (!accountType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-3xl">🎯</span>
                <span className="font-bold text-2xl">Activités</span>
              </Link>
            </div>
            <CardTitle className="text-2xl text-center">Créer un compte</CardTitle>
            <CardDescription className="text-center">
              Choisissez votre type de compte
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setAccountType("user")}
              className="flex flex-col items-center p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <User className="h-12 w-12 mb-4 text-primary" />
              <h3 className="font-semibold text-lg">Utilisateur</h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Je cherche des activités à faire
              </p>
            </button>
            <button
              onClick={() => setAccountType("establishment")}
              className="flex flex-col items-center p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Building2 className="h-12 w-12 mb-4 text-primary" />
              <h3 className="font-semibold text-lg">Établissement</h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Je propose des activités
              </p>
            </button>
          </CardContent>
          <CardFooter className="justify-center">
            <div className="text-sm text-gray-600">
              Déjà un compte ?{" "}
              <Link href="/auth/connexion" className="text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (accountType === "user") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-3xl">🎯</span>
                <span className="font-bold text-2xl">Activités</span>
              </Link>
            </div>
            <CardTitle className="text-2xl text-center">Créer un compte utilisateur</CardTitle>
            <CardDescription className="text-center">
              Inscrivez-vous pour sauvegarder vos favoris
            </CardDescription>
          </CardHeader>
          <form action={handleUserSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom (optionnel)</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jean Dupont"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="exemple@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Création..." : "Créer mon compte"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setAccountType(null)}
                disabled={isLoading}
              >
                Retour
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-3xl">🎯</span>
              <span className="font-bold text-2xl">Activités</span>
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">Créer un compte établissement</CardTitle>
          <CardDescription className="text-center">
            Inscrivez votre établissement pour publier des activités
          </CardDescription>
        </CardHeader>
        <form action={handleEstablishmentSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="establishmentName">Nom de l&apos;établissement *</Label>
              <Input
                id="establishmentName"
                name="establishmentName"
                type="text"
                placeholder="Mon Bowling"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contact@monbowling.fr"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01 23 45 67 89"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://www.monbowling.fr"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="123 rue de la Paix"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Paris"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Code postal</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  placeholder="75001"
                  disabled={isLoading}
                />
              </div>
            </div>
            <input type="hidden" name="country" value="France" />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Création..." : "Créer mon compte établissement"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setAccountType(null)}
              disabled={isLoading}
            >
              Retour
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
