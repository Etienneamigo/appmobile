"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/events"
import { toast } from "sonner"
import { Plus, Calendar, Edit, Trash2, Loader2, Clock } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Event {
  id: string
  title: string
  description: string | null
  startAt: Date
  endAt: Date
  allDay: boolean
}

interface EventManagerProps {
  activityId: string
  events: Event[]
}

function formatDateTime(date: Date, allDay: boolean): string {
  if (allDay) {
    return format(new Date(date), "EEEE d MMMM yyyy", { locale: fr })
  }
  return format(new Date(date), "EEEE d MMMM yyyy 'a' HH:mm", { locale: fr })
}

function formatDateForInput(date: Date): string {
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm")
}

function formatDateOnlyForInput(date: Date): string {
  return format(new Date(date), "yyyy-MM-dd")
}

export function EventManager({ activityId, events: initialEvents }: EventManagerProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [isCreating, setIsCreating] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [allDay, setAllDay] = useState(false)

  function resetForm() {
    setTitle("")
    setDescription("")
    setStartAt("")
    setEndAt("")
    setAllDay(false)
    setEditingEvent(null)
  }

  function openCreateDialog() {
    resetForm()
    // Set default start/end to today
    const now = new Date()
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
    setStartAt(formatDateForInput(now))
    setEndAt(formatDateForInput(later))
    setIsDialogOpen(true)
  }

  function openEditDialog(event: Event) {
    setEditingEvent(event)
    setTitle(event.title)
    setDescription(event.description || "")
    setAllDay(event.allDay)
    if (event.allDay) {
      setStartAt(formatDateOnlyForInput(event.startAt))
      setEndAt(formatDateOnlyForInput(event.endAt))
    } else {
      setStartAt(formatDateForInput(event.startAt))
      setEndAt(formatDateForInput(event.endAt))
    }
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      // Adjust dates for all-day events
      let finalStartAt = startAt
      let finalEndAt = endAt

      if (allDay) {
        finalStartAt = `${startAt}T00:00:00`
        finalEndAt = `${endAt}T23:59:59`
      }

      if (editingEvent) {
        // Update existing event
        const result = await updateEvent(editingEvent.id, {
          title,
          description: description || null,
          startAt: finalStartAt,
          endAt: finalEndAt,
          allDay,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        if (result.event) {
          setEvents(events.map(e => e.id === editingEvent.id ? result.event as Event : e))
          toast.success("Evenement mis a jour")
        }
      } else {
        // Create new event
        const result = await createEvent(activityId, {
          title,
          description: description || null,
          startAt: finalStartAt,
          endAt: finalEndAt,
          allDay,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        if (result.event) {
          setEvents([...events, result.event as Event].sort(
            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          ))
          toast.success("Evenement cree")
        }
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Etes-vous sur de vouloir supprimer cet evenement ?")) {
      return
    }

    setDeletingId(eventId)

    try {
      const result = await deleteEvent(eventId)

      if (result.error) {
        toast.error(result.error)
        return
      }

      setEvents(events.filter(e => e.id !== eventId))
      toast.success("Evenement supprime")
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeletingId(null)
    }
  }

  // Separate upcoming and past events
  const now = new Date()
  const upcomingEvents = events.filter(e => new Date(e.startAt) >= now)
  const pastEvents = events.filter(e => new Date(e.startAt) < now)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {events.length} evenement{events.length !== 1 ? "s" : ""}
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un evenement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Modifier l'evenement" : "Nouvel evenement"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nom de l'evenement"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details de l'evenement (optionnel)"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={allDay}
                  onCheckedChange={(checked: boolean | "indeterminate") => {
                    setAllDay(checked === true)
                    // Adjust input format when toggling
                    if (checked && startAt.includes("T")) {
                      setStartAt(startAt.split("T")[0])
                      setEndAt(endAt.split("T")[0])
                    } else if (!checked && !startAt.includes("T")) {
                      setStartAt(`${startAt}T09:00`)
                      setEndAt(`${endAt}T18:00`)
                    }
                  }}
                />
                <label htmlFor="allDay" className="text-sm cursor-pointer">
                  Journee entiere
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Debut *</label>
                  <Input
                    type={allDay ? "date" : "datetime-local"}
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fin *</label>
                  <Input
                    type={allDay ? "date" : "datetime-local"}
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingEvent ? "Modifier" : "Creer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun evenement</p>
            <p className="text-sm text-muted-foreground">
              Ajoutez des evenements pour informer vos clients de vos soirees speciales
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                A venir ({upcomingEvents.length})
              </h4>
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => openEditDialog(event)}
                    onDelete={() => handleDelete(event.id)}
                    isDeleting={deletingId === event.id}
                  />
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Passes ({pastEvents.length})
              </h4>
              <div className="space-y-2 opacity-60">
                {pastEvents.slice(0, 5).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => openEditDialog(event)}
                    onDelete={() => handleDelete(event.id)}
                    isDeleting={deletingId === event.id}
                    isPast
                  />
                ))}
                {pastEvents.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {pastEvents.length - 5} autres evenements passes
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({
  event,
  onEdit,
  onDelete,
  isDeleting,
  isPast,
}: {
  event: Event
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isPast?: boolean
}) {
  const startDate = new Date(event.startAt)
  const endDate = new Date(event.endAt)
  const sameDay = startDate.toDateString() === endDate.toDateString()

  return (
    <div className="flex items-start gap-4 p-4 bg-white border rounded-lg">
      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-primary uppercase">
          {format(startDate, "MMM", { locale: fr })}
        </span>
        <span className="text-lg font-bold text-primary">
          {format(startDate, "d")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{event.title}</h4>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          {event.allDay ? (
            <span>
              {sameDay
                ? "Toute la journee"
                : `${format(startDate, "d MMM", { locale: fr })} - ${format(endDate, "d MMM", { locale: fr })}`}
            </span>
          ) : (
            <span>
              {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
            </span>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          disabled={isDeleting}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
