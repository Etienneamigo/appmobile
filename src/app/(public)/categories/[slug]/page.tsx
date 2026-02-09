import { Suspense } from "react"
import { getCategoryLabel } from "@/lib/constants"
import { CategoryResults } from "./CategoryResults"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    city?: string
    lat?: string
    lng?: string
    radius?: string
  }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params
  const label = getCategoryLabel(slug)
  return {
    title: `${label} - Wadelo`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const sp = await searchParams
  const label = getCategoryLabel(slug)

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<CategorySkeleton />}>
        <CategoryResults slug={slug} label={label} searchParams={sp} />
      </Suspense>
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-4 py-4">
            <div className="w-18 h-18 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-100 rounded w-20 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
