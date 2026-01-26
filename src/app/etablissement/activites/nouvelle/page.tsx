import { ActivityForm } from "@/components/forms/ActivityForm"

export default function NewActivityPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nouvelle activité</h1>
        <p className="text-muted-foreground">Créez une nouvelle activité pour votre établissement</p>
      </div>
      <ActivityForm mode="create" />
    </div>
  )
}
