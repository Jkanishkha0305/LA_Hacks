import { tool } from "ai"
import { z } from "zod"
import { socrataQuery, isSocrataError } from "@/lib/api/socrata"
import { SOCRATA_DATASETS } from "@/lib/config/data-sources"
import type {
  SocrataDobViolationRow,
  SocrataHpdViolationRow,
} from "@/lib/types/api-responses"

export const violationsTool = tool({
  description:
    "Fetch DOB and HPD violations for a NYC property. Uses BIN for DOB violations and borough code + block + lot for HPD violations. Returns violation counts, types, and severity.",
  inputSchema: z.object({
    bin: z.string().describe("Building Identification Number from geocode"),
    boroCode: z
      .string()
      .describe("Borough code: 1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island"),
    block: z.string().describe("Tax block number"),
    lot: z.string().describe("Tax lot number"),
  }),
  execute: async ({ bin, boroCode, block, lot }) => {
    console.log(`\n[TOOL:fetchViolations] ▶ Input: bin="${bin}" boroCode="${boroCode}" block="${block}" lot="${lot}"`)
    const [dobResult, hpdResult] = await Promise.all([
      socrataQuery<SocrataDobViolationRow>(
        SOCRATA_DATASETS.dobViolations,
        { $where: `bin='${bin}'`, $limit: "50", $order: "issue_date DESC" },
        "dob_violations",
      ),
      socrataQuery<SocrataHpdViolationRow>(
        SOCRATA_DATASETS.hpdViolations,
        {
          $where: `boroid='${boroCode}' AND block='${block.padStart(5, "0")}' AND lot='${lot.padStart(4, "0")}'`,
          $limit: "50",
          $order: "inspectiondate DESC",
        },
        "hpd_violations",
      ),
    ])

    const dob = isSocrataError(dobResult)
      ? { count: 0, recent: [], error: dobResult.error }
      : {
          count: dobResult.length,
          recent: dobResult.slice(0, 10).map((v) => ({
            id: v.isn_dob_bis_viol,
            type: v.violation_type_code,
            date: v.issue_date,
            category: v.violation_category,
            address: `${v.house_number} ${v.street}`,
          })),
        }

    const hpd = isSocrataError(hpdResult)
      ? { count: 0, byClass: {}, recent: [], error: hpdResult.error }
      : {
          count: hpdResult.length,
          byClass: hpdResult.reduce(
            (acc, v) => {
              const cls = v.class || "Unknown"
              acc[cls] = (acc[cls] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
          recent: hpdResult.slice(0, 10).map((v) => ({
            id: v.violationid,
            class: v.class,
            date: v.inspectiondate,
            status: v.currentstatus,
            description: v.novdescription,
          })),
        }

    const result = { dob, hpd, totalViolations: dob.count + hpd.count }
    console.log(`[TOOL:fetchViolations] ✓ DOB=${dob.count} HPD=${hpd.count} total=${result.totalViolations}${dob.error ? ` (DOB error: ${dob.error})` : ""}${hpd.error ? ` (HPD error: ${hpd.error})` : ""}`)
    return result
  },
})
