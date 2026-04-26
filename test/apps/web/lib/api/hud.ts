import { HUD_FMR_BASE_URL } from "@/lib/config/data-sources"
import { env } from "@/lib/config/env"
import type { RentData } from "@/lib/types/property"

export interface HudError {
  error: string
  source: "hud"
}

/** NYC borough to HUD county FIPS entity ID mapping */
const BOROUGH_TO_FIPS: Record<string, string> = {
  Manhattan: "3606199999",
  "New York": "3606199999",
  Brooklyn: "3604799999",
  Kings: "3604799999",
  Bronx: "3600599999",
  Queens: "3608199999",
  "Staten Island": "3608599999",
  Richmond: "3608599999",
}

/**
 * Fetch HUD FMR data by borough name.
 * HUD API uses county FIPS entity IDs, not zip codes.
 */
export async function fetchFairMarketRent(
  borough: string,
): Promise<RentData | HudError> {
  const entityId = BOROUGH_TO_FIPS[borough]
  if (!entityId) {
    console.error(`[API:HUD] Unknown borough: "${borough}". Known: ${Object.keys(BOROUGH_TO_FIPS).join(", ")}`)
    return { error: `Unknown borough: ${borough}`, source: "hud" }
  }

  const url = `${HUD_FMR_BASE_URL}/${entityId}`
  console.log(`[API:HUD] Borough: ${borough} → FIPS: ${entityId} | URL: ${url}`)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.HUD_API_TOKEN}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    console.log(`[API:HUD] Response: ${res.status} ${res.statusText}`)

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[API:HUD] ERROR ${res.status}: ${body.slice(0, 300)}`)
      return { error: `HUD API ${res.status}: ${res.statusText}`, source: "hud" }
    }

    const json = await res.json()
    const fmr = json.data?.basicdata

    if (!fmr) {
      console.warn(`[API:HUD] No basicdata in response:`, JSON.stringify(json).slice(0, 500))
      return { error: `No FMR data for ${borough}`, source: "hud" }
    }

    const result = {
      zipCode: borough,
      efficiency: fmr.Efficiency ?? null,
      oneBr: fmr["One-Bedroom"] ?? null,
      twoBr: fmr["Two-Bedroom"] ?? null,
      threeBr: fmr["Three-Bedroom"] ?? null,
      fourBr: fmr["Four-Bedroom"] ?? null,
      areaName: json.data?.area_name ?? null,
      year: parseInt(fmr.year) || null,
    }
    console.log(`[API:HUD] FMR for ${borough}:`, JSON.stringify(result))
    return result
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error(`[API:HUD] FETCH ERROR: ${message}`)
    return { error: `HUD API failed: ${message}`, source: "hud" }
  }
}

export function isHudError(result: unknown): result is HudError {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    (result as HudError).source === "hud"
  )
}
