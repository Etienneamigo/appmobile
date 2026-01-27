import { getSiteSettings } from "@/app/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VideoSettingsForm } from "./VideoSettingsForm"
import { ImageSettingsForm } from "./ImageSettingsForm"
import { Info } from "lucide-react"

export default async function ParametresPage() {
  const { settings, error } = await getSiteSettings()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Parametres du site</h1>
        <p className="text-muted-foreground">Configurez les elements visuels de la page d&apos;accueil</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Priorite d&apos;affichage :</strong> Video &gt; Image &gt; Gradient par defaut.
          Si vous definissez une video, elle sera affichee. Sinon, l&apos;image sera utilisee comme fallback.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Videos de fond (prioritaire)</CardTitle>
          <CardDescription>
            Les videos sont prioritaires sur les images. Si une video est definie, elle sera affichee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoSettingsForm
            desktopUrl={settings?.heroVideoDesktopUrl}
            mobileUrl={settings?.heroVideoMobileUrl}
            desktopName={settings?.heroVideoDesktopName}
            mobileName={settings?.heroVideoMobileName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images de fond (fallback)</CardTitle>
          <CardDescription>
            Les images seront affichees si aucune video n&apos;est definie. Utile pour un chargement plus rapide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageSettingsForm
            desktopUrl={settings?.heroImageDesktopUrl}
            mobileUrl={settings?.heroImageMobileUrl}
            desktopName={settings?.heroImageDesktopName}
            mobileName={settings?.heroImageMobileName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Videos</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Desktop</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Format : MP4 (H.264)</li>
                  <li>Resolution : 1920x1080+</li>
                  <li>Ratio : 16:9</li>
                  <li>Taille max : 30 Mo</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Mobile</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Format : MP4 (H.264)</li>
                  <li>Resolution : 720x1280+</li>
                  <li>Ratio : 9:16 (portrait)</li>
                  <li>Taille max : 30 Mo</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Images</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Desktop</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Format : JPG, PNG, WebP</li>
                  <li>Resolution : 1920x1080+</li>
                  <li>Ratio : 16:9</li>
                  <li>Taille max : 10 Mo</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Mobile</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Format : JPG, PNG, WebP</li>
                  <li>Resolution : 720x1280+</li>
                  <li>Ratio : 9:16 (portrait)</li>
                  <li>Taille max : 10 Mo</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
