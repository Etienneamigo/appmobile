"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { verifyEmailAction } from "@/app/actions/auth"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function VerificationContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error")
        setErrorMessage("Token de verification manquant")
        return
      }

      const result = await verifyEmailAction(token)

      if (result.error) {
        setStatus("error")
        setErrorMessage(result.error)
      } else if (result.alreadyVerified) {
        setStatus("already")
      } else {
        setStatus("success")
      }
    }

    verify()
  }, [token])

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Verification email</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verification en cours...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div>
              <p className="font-medium text-green-700">Email verifie avec succes !</p>
              <p className="text-muted-foreground mt-2">
                Votre compte est maintenant actif. Vous pouvez vous connecter.
              </p>
            </div>
            <Button asChild className="mt-4">
              <Link href="/auth/connexion">Se connecter</Link>
            </Button>
          </div>
        )}

        {status === "already" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-blue-500" />
            <div>
              <p className="font-medium text-blue-700">Email deja verifie</p>
              <p className="text-muted-foreground mt-2">
                Votre email a deja ete verifie. Vous pouvez vous connecter.
              </p>
            </div>
            <Button asChild className="mt-4">
              <Link href="/auth/connexion">Se connecter</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <div>
              <p className="font-medium text-red-700">Erreur de verification</p>
              <p className="text-muted-foreground mt-2">{errorMessage}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button asChild variant="outline">
                <Link href="/auth/connexion">Retour a la connexion</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Verification email</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerificationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <VerificationContent />
      </Suspense>
    </div>
  )
}
