"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Event } from "@prisma/client"

interface EventsCarouselProps {
  events: Event[]
}

const EVENTS_PER_PAGE = 3

export function EventsCarousel({ events }: EventsCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE)
  const startIndex = currentPage * EVENTS_PER_PAGE
  const visibleEvents = events.slice(startIndex, startIndex + EVENTS_PER_PAGE)

  const goToPrevious = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const goToNext = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  if (events.length === 0) {
    return null
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Prochains evenements
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToPrevious}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                {currentPage + 1}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goToNext}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleEvents.map((event) => {
          const startDate = new Date(event.startAt)
          const endDate = new Date(event.endAt)
          const sameDay = startDate.toDateString() === endDate.toDateString()
          return (
            <div key={event.id} className="flex gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-white border rounded-lg flex flex-col items-center justify-center shadow-sm">
                <span className="text-[10px] font-medium text-primary uppercase">
                  {format(startDate, "MMM", { locale: fr })}
                </span>
                <span className="text-base font-bold">
                  {format(startDate, "d")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.allDay ? (
                    sameDay ? "Toute la journee" : `${format(startDate, "d MMM", { locale: fr })} - ${format(endDate, "d MMM", { locale: fr })}`
                  ) : (
                    `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`
                  )}
                </p>
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}

        {/* Pagination dots for mobile */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 pt-2 md:hidden">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPage ? "bg-primary" : "bg-primary/30"
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
