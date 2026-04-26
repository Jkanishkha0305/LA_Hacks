import { tool } from "ai"
import { z } from "zod"
import { socrataQuery, isSocrataError } from "@/lib/api/socrata"
import { SOCRATA_DATASETS } from "@/lib/config/data-sources"
import type { SocrataNypdComplaintRow } from "@/lib/types/api-responses"

export const crimeTool = tool({
  description:
    "Fetch NYPD crime data near a location. Returns crime counts by category (felony, misdemeanor, violation) and offense type within a given radius.",
  inputSchema: z.object({
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude"),
    radiusMeters: z
      .number()
      .default(304)
      .describe("Search radius in meters (default 304m / ~1000ft)"),
  }),
  execute: async ({ lat, lng, radiusMeters }) => {
    console.log(`\n[TOOL:fetchCrimeData] ▶ Input: lat=${lat} lng=${lng} radius=${radiusMeters}m`)
    // Get last 12 months of data
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const dateStr = oneYearAgo.toISOString().split("T")[0]

    const rows = await socrataQuery<SocrataNypdComplaintRow>(
      SOCRATA_DATASETS.nypdComplaints,
      {
        $where: `within_circle(lat_lon, ${lat}, ${lng}, ${radiusMeters}) AND cmplnt_fr_dt >= '${dateStr}'`,
        $limit: "200",
      },
      "crime",
    )
    if (isSocrataError(rows)) {
      console.error(`[TOOL:fetchCrimeData] ✗ Error:`, rows.error)
      return rows
    }

    const byCategory = rows.reduce(
      (acc, r) => {
        const desc = r.ofns_desc || "Unknown"
        acc[desc] = (acc[desc] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const bySeverity = { felony: 0, misdemeanor: 0, violation: 0 }
    for (const r of rows) {
      const cat = r.law_cat_cd?.toUpperCase()
      if (cat === "FELONY") bySeverity.felony++
      else if (cat === "MISDEMEANOR") bySeverity.misdemeanor++
      else if (cat === "VIOLATION") bySeverity.violation++
    }

    const result = {
      totalIncidents: rows.length,
      byCategory,
      bySeverity,
      radiusMeters,
    }
    console.log(`[TOOL:fetchCrimeData] ✓ ${result.totalIncidents} incidents | felony=${bySeverity.felony} misdemeanor=${bySeverity.misdemeanor} violation=${bySeverity.violation}`)
    return result
  },
})
