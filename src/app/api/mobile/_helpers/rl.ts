import { NextRequest } from "next/server"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

export async function enforceApiRateLimit(request: NextRequest, preset: Parameters<typeof checkRateLimit>[1] = "api") {
  const clientIP = getClientIP(request)
  const rl = await checkRateLimit(clientIP, preset)
  if (!rl.success) return rateLimitResponse(rl)
  return null
}
