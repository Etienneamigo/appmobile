import { z } from "zod"

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

export const registerUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
})

export const registerEstablishmentSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  establishmentName: z.string().min(2, "Le nom de l'établissement doit contenir au moins 2 caractères"),
  phone: z.string().optional(),
  website: z.string().url("URL invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("France"),
})

// Activity schemas
export const activityTypeEnum = z.enum([
  "BOWLING",
  "ESCAPE_GAME",
  "BAR_DANSANT",
  "KARAOKE",
  "LASER_GAME",
  "CINEMA",
  "TRAMPOLINE_PARK",
])

export const activityStatusEnum = z.enum(["DRAFT", "PUBLISHED"])

export const createActivitySchema = z.object({
  type: activityTypeEnum,
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  zipCode: z.string().min(4, "Code postal invalide"),
  country: z.string().default("France"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  minPeople: z.number().int().positive().optional().nullable(),
  maxPeople: z.number().int().positive().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  priceFrom: z.number().positive().optional().nullable(),
  scheduleText: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  status: activityStatusEnum.default("DRAFT"),
})

export const updateActivitySchema = createActivitySchema.partial()

// Search schemas
export const searchSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().positive().default(10), // km
  type: activityTypeEnum.optional(),
  city: z.string().optional(),
  minPeople: z.number().int().positive().optional(),
  maxPeople: z.number().int().positive().optional(),
  priceMax: z.number().positive().optional(),
  sortBy: z.enum(["distance", "popularity"]).default("distance"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20),
})

// Types
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type RegisterEstablishmentInput = z.infer<typeof registerEstablishmentSchema>
export type CreateActivityInput = z.infer<typeof createActivitySchema>
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>
export type SearchInput = z.infer<typeof searchSchema>
export type ActivityType = z.infer<typeof activityTypeEnum>
export type ActivityStatus = z.infer<typeof activityStatusEnum>
