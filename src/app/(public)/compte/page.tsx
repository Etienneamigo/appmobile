import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AccountClient } from "./AccountClient"

export const metadata = {
  title: "Mon compte - Wadelo",
}

export default async function AccountPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/connexion")
  }

  return (
    <AccountClient
      user={{
        name: session.user.name || null,
        email: session.user.email || "",
        role: session.user.role,
      }}
    />
  )
}
