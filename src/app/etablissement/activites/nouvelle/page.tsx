import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ActivityForm } from "@/components/forms/ActivityForm"

export default async function NewActivityPage() {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    redirect("/auth/connexion")
  }

  // Check if establishment already has an activity (1:1 constraint)
  const existingActivity = await prisma.activity.findUnique({
    where: { establishmentId: session.user.establishmentId },
  })

  // If activity already exists, redirect to edit page
  if (existingActivity) {
    redirect(`/etablissement/activites/${existingActivity.id}`)
  }

  // Load activity types from DB
  const activityTypes = await prisma.activityTypeConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  const typeOptions = activityTypes.map((t) => ({
    value: t.slug,
    label: `${t.emoji} ${t.label}`,
  }))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Créer mon activité</h1>
        <p className="text-muted-foreground">
          Configurez l&apos;activité de votre établissement
        </p>
      </div>
      <ActivityForm mode="create" activityTypeOptions={typeOptions} />
    </div>
  )
}
