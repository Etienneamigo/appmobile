"use client"

import { SearchHero } from "@/components/search/SearchHero"

interface SearchPageHeroProps {
  activityTypeOptions: { value: string; label: string }[]
  initialCity?: string
  initialType?: string
}

export function SearchPageHero({ activityTypeOptions, initialCity, initialType }: SearchPageHeroProps) {
  return (
    <SearchHero
      activityTypeOptions={activityTypeOptions}
      hasBackground={false}
      initialCity={initialCity}
      initialType={initialType}
    />
  )
}
