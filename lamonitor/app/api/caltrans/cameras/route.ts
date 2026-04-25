import { NextResponse } from "next/server"
import { fetchCaltransCameras } from "@/lib/cameras"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number(limitParam) : 0

  try {
    const cameras = await fetchCaltransCameras(Number.isFinite(limit) ? limit : 0)
    return NextResponse.json({ cameras })
  } catch (error) {
    console.error("Failed to load cameras", error)
    return NextResponse.json(
      { error: "Failed to load cameras" },
      { status: 502 }
    )
  }
}
