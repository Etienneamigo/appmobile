import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Health check endpoint for container orchestration and load balancers
 * Returns:
 * - 200 OK if all services are healthy
 * - 503 Service Unavailable if any critical service is down
 */
export async function GET() {
  const startTime = Date.now()

  const health: {
    status: "healthy" | "unhealthy"
    timestamp: string
    uptime: number
    version: string
    checks: {
      database: { status: "up" | "down"; latency?: number; error?: string }
    }
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
    checks: {
      database: { status: "down" },
    },
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    health.checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    }
    health.status = "unhealthy"
  }

  // Return appropriate status code
  const statusCode = health.status === "healthy" ? 200 : 503

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  })
}

// Also support HEAD requests for simple health checks
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
