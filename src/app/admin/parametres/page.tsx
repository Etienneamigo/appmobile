import { getSiteSettings } from "@/app/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoSettingsForm } from "./VideoSettingsForm"

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

      <Card>
        <CardHeader>
          <CardTitle>Videos de fond</CardTitle>
          <CardDescription>
            Gerez les videos de fond affichees sur la page d&apos;accueil.
            La video desktop sera affichee sur les ecrans larges, la video mobile sur les smartphones.
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
          <CardTitle>Specifications videos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Video Desktop</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Format recommande : MP4 (H.264)</li>
                <li>Resolution : 1920x1080 (Full HD) ou plus</li>
                <li>Ratio : 16:9</li>
                <li>Duree : 10-30 secondes (en boucle)</li>
                <li>Taille max : 30 Mo</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Video Mobile</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Format recommande : MP4 (H.264)</li>
                <li>Resolution : 720x1280 (portrait) ou 1080x1920</li>
                <li>Ratio : 9:16 (portrait)</li>
                <li>Duree : 10-30 secondes (en boucle)</li>
                <li>Taille max : 30 Mo</li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Conseil :</strong> Utilisez des videos compressees et optimisees pour le web.
              Les videos trop lourdes ralentiront le chargement de la page d&apos;accueil.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
