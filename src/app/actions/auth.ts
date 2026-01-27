"use server"

import { prisma } from "@/lib/db"
import { signIn, signOut } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { registerUserSchema, registerEstablishmentSchema } from "@/lib/validations"
import { AuthError } from "next-auth"
import { calculateTrialEndDate } from "@/lib/stripe"
import { generateVerificationToken, sendVerificationEmail } from "@/lib/email"

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      // Check if it's an email verification error
      const errorMessage = (error.cause?.err as Error)?.message
      if (errorMessage === "EMAIL_NOT_VERIFIED") {
        return {
          error: "Veuillez vérifier votre email avant de vous connecter.",
          emailNotVerified: true,
          email
        }
      }
      return { error: "Email ou mot de passe incorrect" }
    }
    throw error
  }
}

export async function registerUserAction(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string || undefined,
  }

  const parsed = registerUserSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password, name } = parsed.data

  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "Un compte avec cet email existe déjà" }
  }

  // Hasher le mot de passe
  const passwordHash = await bcrypt.hash(password, 12)

  // Generate verification token
  const verificationToken = generateVerificationToken()
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Créer l'utilisateur
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: "USER",
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpires,
    },
  })

  // Send verification email
  await sendVerificationEmail(email, verificationToken, name)

  // Return success - don't sign in until verified
  return { success: true, requiresVerification: true }
}

export async function registerEstablishmentAction(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    establishmentName: formData.get("establishmentName") as string,
    phone: formData.get("phone") as string || undefined,
    website: formData.get("website") as string || undefined,
    address: formData.get("address") as string || undefined,
    city: formData.get("city") as string || undefined,
    zipCode: formData.get("zipCode") as string || undefined,
    country: formData.get("country") as string || "France",
    promoCode: formData.get("promoCode") as string || undefined,
  }

  const parsed = registerEstablishmentSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password, establishmentName, phone, website, address, city, zipCode, country, promoCode } = parsed.data

  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "Un compte avec cet email existe déjà" }
  }

  // Validate promo code if provided
  let validPromoCode = null
  let extraTrialDays = 0

  if (promoCode) {
    validPromoCode = await prisma.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    })

    if (!validPromoCode) {
      return { error: "Code promo invalide" }
    }

    if (!validPromoCode.isActive) {
      return { error: "Ce code promo n'est plus actif" }
    }

    if (validPromoCode.expiresAt && new Date(validPromoCode.expiresAt) < new Date()) {
      return { error: "Ce code promo a expire" }
    }

    if (validPromoCode.maxRedemptions && validPromoCode.redeemedCount >= validPromoCode.maxRedemptions) {
      return { error: "Ce code promo a atteint sa limite d'utilisation" }
    }

    extraTrialDays = validPromoCode.extraTrialDays
  }

  // Calculate trial end date
  const trialEndsAt = calculateTrialEndDate(extraTrialDays)

  // Hasher le mot de passe
  const passwordHash = await bcrypt.hash(password, 12)

  // Generate verification token
  const verificationToken = generateVerificationToken()
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Créer l'utilisateur et l'établissement
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ESTABLISHMENT",
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpires,
      establishment: {
        create: {
          name: establishmentName,
          phone,
          website: website || null,
          address,
          city,
          zipCode,
          country,
          subscriptionStatus: "TRIALING",
          trialEndsAt,
          ...(validPromoCode && { usedPromoCodeId: validPromoCode.id }),
        },
      },
    },
  })

  // Increment promo code redemption count
  if (validPromoCode) {
    await prisma.promoCode.update({
      where: { id: validPromoCode.id },
      data: { redeemedCount: { increment: 1 } },
    })
  }

  // Send verification email
  await sendVerificationEmail(email, verificationToken, establishmentName)

  // Return success - don't sign in until verified
  return { success: true, requiresVerification: true }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}

// Verify email with token
export async function verifyEmailAction(token: string) {
  if (!token) {
    return { error: "Token de verification manquant" }
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  })

  if (!user) {
    return { error: "Token de verification invalide" }
  }

  if (user.emailVerified) {
    return { success: true, alreadyVerified: true }
  }

  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    return { error: "Ce lien de verification a expire. Veuillez en demander un nouveau." }
  }

  // Mark email as verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  })

  return { success: true }
}

// Resend verification email
export async function resendVerificationAction(email: string) {
  if (!email) {
    return { error: "Email requis" }
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    // Don't reveal if user exists or not
    return { success: true }
  }

  if (user.emailVerified) {
    return { error: "Cet email est deja verifie" }
  }

  // Generate new token
  const verificationToken = generateVerificationToken()
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpires,
    },
  })

  // Send verification email
  await sendVerificationEmail(email, verificationToken, user.name || undefined)

  return { success: true }
}
