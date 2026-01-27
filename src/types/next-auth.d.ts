import "next-auth"

type UserRole = "USER" | "ESTABLISHMENT" | "ADMIN"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    name?: string | null
    role: UserRole
    establishmentId?: string
  }

  interface Session {
    user: User
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    establishmentId?: string
  }
}
