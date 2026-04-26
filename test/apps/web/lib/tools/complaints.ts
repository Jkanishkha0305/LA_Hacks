import { tool } from "ai"
import { z } from "zod"
import { socrataQuery, isSocrataError } from "@/lib/api/socrata"
import { SOCRATA_DATASETS } from "@/lib/config/data-sources"
import type { SocrataHpdComplaintRow } from "@/lib/types/api-responses"

export const complaintsTool = tool({
  description:
    "Fetch HPD/311 complaints near a NYC property by coordinates. Returns complaint types, statuses, and dates.",
  inputSchema: z.object({
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude"),
    radiusMeters: z
      .number()
      .default(100)
      .describe("Search radius in meters (default 100m)"),
  }),
  execute: async ({ lat, lng, radiusMeters }) => {
    console.log(`\n[TOOL:fetchComplaints] ▶ Input: lat=${lat} lng=${lng} radius=${radiusMeters}m`)
    const rows = await socrataQuery<SocrataHpdComplaintRow>(
      SOCRATA_DATASETS.hpdComplaints,
      {
        $where: `within_circle(location, ${lat}, ${lng}, ${radiusMeters})`,
        $limit: "50",
        $order: "created_date DESC",
      },
      "complaints",
    )
    if (isSocrataError(rows)) {
      console.error(`[TOOL:fetchComplaints] ✗ Error:`, rows.error)
      return rows
    }

    const byType = rows.reduce(
      (acc, c) => {
        const type = c.complaint_type || "Unknown"
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const result = {
      totalComplaints: rows.length,
      byType,
      recent: rows.slice(0, 10).map((c) => ({
        uniqueKey: c.unique_key,
        type: c.complaint_type,
        descriptor: c.descriptor,
        status: c.status,
        createdDate: c.created_date,
        closedDate: c.closed_date,
        address: c.incident_address,
      })),
    }
    console.log(`[TOOL:fetchComplaints] ✓ ${result.totalComplaints} complaints | types: ${JSON.stringify(result.byType)}`)
    return result
  },
})
