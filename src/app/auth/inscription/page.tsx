"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { registerUserAction, registerEstablishmentAction } from "@/app/actions/auth"
import { toast } from "sonner"
import { User, Building2, Mail, CheckCircle } from "lucide-react"

type AccountType = "user" | "establishment" | null

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string>("")

  async function handleUserSubmit(formData: FormData) {
    setIsLoading(true)
    const email = formData.get("email") as string
    const result = await registerUserAction(formData)
    setIsLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else if (result?.requiresVerification) {
      setRegisteredEmail(email)
      setRegistrationSuccess(true)
    }
  }

  async function handleEstablishmentSubmit(formData: FormData) {
    setIsLoading(true)
    const email = formData.get("email") as string
    const result = await registerEstablishmentAction(formData)
    setIsLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else if (result?.requiresVerification) {
      setRegisteredEmail(email)
      setRegistrationSuccess(true)
    }
  }

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Vérifiez votre email</CardTitle>
            <CardDescription className="text-center">
              Un email de vérification a été envoyé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Compte créé avec succès !</p>
                  <p className="text-sm text-green-700 mt-1">
                    Nous avons envoyé un email de vérification à{" "}
                    <strong>{registeredEmail}</strong>
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Pour activer votre compte :</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ouvrez l&apos;email que nous vous avons envoyé</li>
                <li>Cliquez sur le lien de vérification</li>
                <li>Connectez-vous à votre compte</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">
              Vous ne trouvez pas l&apos;email ? Vérifiez votre dossier spam.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/auth/connexion">
                Aller à la connexion
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
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

            <div className="pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="promoCode">Code promo (optionnel)</Label>
                <Input
                  id="promoCode"
                  name="promoCode"
                  type="text"
                  placeholder="CODE2024"
                  disabled={isLoading}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Beneficiez de jours d&apos;essai supplementaires
                </p>
              </div>
            </div>

            <div className="pt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>2 mois d&apos;essai gratuit</strong> inclus a l&apos;inscription.
                Aucun moyen de paiement requis.
              </p>
            </div>
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
