import { NextResponse } from "next/server"
import { fetchCaltransFrame } from "@/lib/cameras"
import { analyzeFrame } from "@/lib/lmstudio"

export async function POST(request: Request) {
  try {
    const { cameraId, transcript } = await request.json()

    if (!cameraId || typeof cameraId !== "string") {
      return NextResponse.json({ error: "cameraId is required" }, { status: 400 })
    }

    const { base64Image } = await fetchCaltransFrame(cameraId)
    const result = await analyzeFrame({ base64Image, transcript })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to analyze camera frame", error)
    return NextResponse.json({ error: "Failed to analyze camera frame" }, { status: 500 })
  }
}
