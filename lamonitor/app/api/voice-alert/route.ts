/**
 * ElevenLabs Voice Alert API — converts risk alerts into natural speech.
 *
 * POST /api/voice-alert
 * Body: { text: string, voiceId?: string }
 * Returns: audio/mpeg stream
 *
 * Requires ELEVENLABS_API_KEY in .env.local
 * Free tier: https://elevenlabs.io
 */
import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — clear, professional

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 503 }
      );
    }

    const voice = voiceId || DEFAULT_VOICE_ID;

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text.slice(0, 500), // Cap at 500 chars for free tier
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs ${res.status}`, detail },
        { status: res.status }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "voice synthesis failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice-alert — generate alert from query params (for quick testing)
 * Example: /api/voice-alert?text=Critical+risk+at+I-110
 */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text");
  if (!text) {
    return NextResponse.json(
      {
        service: "voice-alert",
        description: "ElevenLabs TTS for risk alerts",
        usage: "POST { text: 'alert message' } or GET ?text=alert+message",
        configured: !!ELEVENLABS_API_KEY,
      },
      { status: 200 }
    );
  }

  // Delegate to POST handler
  const fakeReq = new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return POST(fakeReq as NextRequest);
}
