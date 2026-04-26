import { tool } from "ai"
import { z } from "zod"
import { socrataQuery, isSocrataError } from "@/lib/api/socrata"
import { SOCRATA_DATASETS } from "@/lib/config/data-sources"
import type { SocrataDobPermitRow } from "@/lib/types/api-responses"

export const permitsTool = tool({
  description:
    "Fetch DOB building permits for a NYC property by BIN. Returns permit types, statuses, filing dates, and work types.",
  inputSchema: z.object({
    bin: z.string().describe("Building Identification Number"),
  }),
  execute: async ({ bin }) => {
    console.log(`\n[TOOL:fetchPermits] ▶ Input: bin="${bin}"`)
    const rows = await socrataQuery<SocrataDobPermitRow>(
      SOCRATA_DATASETS.dobPermits,
      {
        $where: `bin__='${bin}'`,
        $limit: "30",
        $order: "filing_date DESC",
      },
      "permits",
    )
    if (isSocrataError(rows)) {
      console.error(`[TOOL:fetchPermits] ✗ Error:`, rows.error)
      return rows
    }

    const result = {
      totalPermits: rows.length,
      permits: rows.slice(0, 15).map((p) => ({
        jobNumber: p.job__,
        jobType: p.job_type,
        permitType: p.permit_type,
        status: p.permit_status,
        filingStatus: p.filing_status,
        filingDate: p.filing_date,
        issuanceDate: p.issuance_date,
        workType: p.work_type,
      })),
    }
    console.log(`[TOOL:fetchPermits] ✓ ${result.totalPermits} permits found`)
    return result
  },
})
