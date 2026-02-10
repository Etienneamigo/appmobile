import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "ESTABLISHMENT") {
    return NextResponse.json(
      { error: "Seuls les établissements et administrateurs peuvent uploader" },
      { status: 403 }
    )
  }

  // Env check
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare non configuré. Définir CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_API_TOKEN." },
      { status: 500 }
    )
  }

  try {
    // Request a direct upload URL from Cloudflare Images
    // Uses the v2 direct_upload endpoint
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    )

    const cfData = await cfResponse.json()

    if (!cfData.success) {
      console.error("Cloudflare Images direct-upload error:", cfData.errors)
      return NextResponse.json(
        { error: "Erreur Cloudflare Images: " + (cfData.errors?.[0]?.message || "inconnue") },
        { status: 502 }
      )
    }

    return NextResponse.json({
      uploadURL: cfData.result.uploadURL,
      id: cfData.result.id,
    })
  } catch (error) {
    console.error("Cloudflare Images direct-upload fetch error:", error)
    return NextResponse.json({ error: "Erreur réseau vers Cloudflare" }, { status: 502 })
  }
}
