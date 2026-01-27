import { prisma } from "@/lib/db"
import { HomePageClient } from "./HomePageClient"

export default async function HomePage() {
  // Fetch site settings for hero video
  let settings = null
  try {
    settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })
  } catch {
    // Settings table might not exist yet, that's ok
  }

  return (
    <HomePageClient
      heroVideoDesktopUrl={settings?.heroVideoDesktopUrl}
      heroVideoMobileUrl={settings?.heroVideoMobileUrl}
    />
  )
}
