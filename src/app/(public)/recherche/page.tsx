import { Suspense } from "react"
import { SearchResults } from "./SearchResults"

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults params={params} />
      </Suspense>
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
