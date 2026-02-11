import { Suspense } from "react"
import { SearchResults } from "./SearchResults"
import { SearchPageHero } from "./SearchPageHero"
import { prisma } from "@/lib/db"

interface SearchPageProps {
  searchParams: Promise<{
    lat?: string
    lng?: string
    city?: string
    type?: string
    radius?: string
    minPeople?: string
    maxPeople?: string
    priceMax?: string
    sortBy?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams

  // Fetch activity types for the search dropdown
  let activityTypeOptions: { value: string; label: string }[] = []
  try {
    const types = await prisma.activityTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    activityTypeOptions = types.map((t) => ({
      value: t.slug,
      label: t.label,
    }))
  } catch {
    // Table might not exist yet
  }

  return (
    <div>
      {/* Search Hero — same as Home page */}
      <div className="border-b border-gray-100 bg-gray-50/50">
        <div className="container mx-auto px-4 py-6">
          <SearchPageHero
            activityTypeOptions={activityTypeOptions}
            initialCity={params.city}
            initialType={params.type}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchResults params={params} />
        </Suspense>
      </div>
    </div>
  )
}

function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse hidden lg:block" />
      </div>
    </div>
  )
}
