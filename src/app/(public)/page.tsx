import { prisma } from "@/lib/db"
import { HomePageClient } from "./HomePageClient"

export default async function HomePage() {
  // Fetch site settings for hero media (video or image)
  let settings = null
  try {
    settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })
  } catch {
    // Settings table might not exist yet, that's ok
  }

  // Fetch activity types from DB
  let activityTypeOptions: { value: string; label: string; emoji: string; iconUrl?: string | null }[] = []
  try {
    const types = await prisma.activityTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    activityTypeOptions = types.map((t) => ({
      value: t.slug,
      label: `${t.emoji} ${t.label}`,
      emoji: t.emoji,
      iconUrl: t.iconUrl,
    }))
  } catch {
    // Table might not exist yet
  }

  return (
    <HomePageClient
      heroVideoDesktopUrl={settings?.heroVideoDesktopUrl}
      heroVideoMobileUrl={settings?.heroVideoMobileUrl}
      heroImageDesktopUrl={settings?.heroImageDesktopUrl}
      heroImageMobileUrl={settings?.heroImageMobileUrl}
      activityTypeOptions={activityTypeOptions}
    />
  )
}
