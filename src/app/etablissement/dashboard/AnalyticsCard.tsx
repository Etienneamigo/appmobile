"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getActivityStats } from "@/app/actions/analytics"
import { Eye, MousePointer, TrendingUp, Loader2 } from "lucide-react"

interface AnalyticsCardProps {
  activityId: string
}

interface Stats {
  impressions: { today: number; week: number; month: number }
  clicks: { today: number; week: number; month: number }
  ctr: { week: string; month: string }
}

export function AnalyticsCard({ activityId }: AnalyticsCardProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      const result = await getActivityStats(activityId)

      if ("error" in result) {
        setError(result.error ?? "Erreur inconnue")
      } else {
        setStats(result as Stats)
      }
      setIsLoading(false)
    }

    fetchStats()
  }, [activityId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistiques détaillées
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistiques détaillées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Impossible de charger les statistiques
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Statistiques détaillées
        </CardTitle>
        <CardDescription>
          Performances de votre activité dans les recherches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Impressions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" />
              Impressions
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aujourd&apos;hui</span>
                <span className="font-semibold">{stats.impressions.today}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">7 derniers jours</span>
                <span className="font-semibold">{stats.impressions.week}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">30 derniers jours</span>
                <span className="font-semibold">{stats.impressions.month}</span>
              </div>
            </div>
          </div>

          {/* Clicks */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MousePointer className="h-4 w-4" />
              Clics
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aujourd&apos;hui</span>
                <span className="font-semibold">{stats.clicks.today}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">7 derniers jours</span>
                <span className="font-semibold">{stats.clicks.week}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">30 derniers jours</span>
                <span className="font-semibold">{stats.clicks.month}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTR */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm font-medium text-muted-foreground mb-3">
            Taux de clic (CTR)
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.ctr.week}%</div>
              <div className="text-xs text-muted-foreground">7 derniers jours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.ctr.month}%</div>
              <div className="text-xs text-muted-foreground">30 derniers jours</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
