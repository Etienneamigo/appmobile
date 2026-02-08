import { prisma } from "@/lib/db"
import { ActivityTypeManager } from "./ActivityTypeManager"
import { backfillActivityTypes } from "@/app/actions/activity-types"

export default async function ActivityTypesPage() {
  // Auto-backfill: create ActivityTypeConfig entries for any Activity.type values
  // that don't have a config entry yet (idempotent, runs every page load)
  await backfillActivityTypes()

  const types = await prisma.activityTypeConfig.findMany({
    orderBy: { sortOrder: "asc" },
  })

  // Count activities per type
  const typeCounts = await prisma.activity.groupBy({
    by: ["type"],
    _count: { id: true },
  })

  const typeCountMap: Record<string, number> = {}
  for (const tc of typeCounts) {
    typeCountMap[tc.type] = tc._count.id
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Types d&apos;activite</h1>
        <p className="text-muted-foreground">
          Gerez les types d&apos;activite disponibles sur la plateforme
        </p>
      </div>

      <ActivityTypeManager initialTypes={types} typeCounts={typeCountMap} />
    </div>
  )
}
