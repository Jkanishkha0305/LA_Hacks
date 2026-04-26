import { tool } from "ai"
import { z } from "zod"
import { socrataQuery, isSocrataError } from "@/lib/api/socrata"
import { SOCRATA_DATASETS } from "@/lib/config/data-sources"
import type { SocrataRollingSalesRow } from "@/lib/types/api-responses"

export const salesTool = tool({
  description:
    "Fetch recent rolling sales data for a NYC property or comparable properties in the same area. Uses borough code + block + lot for exact match, or zip + building class for comps.",
  inputSchema: z.object({
    borough: z
      .string()
      .describe("Borough code: 1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island"),
    block: z.string().describe("Tax block number"),
    lot: z.string().describe("Tax lot number"),
    zipCode: z.string().optional().describe("Zip code for comparable sales"),
    buildingClass: z.string().optional().describe("Building class for filtering comps"),
  }),
  execute: async ({ borough, block, lot, zipCode, buildingClass }) => {
    console.log(`\n[TOOL:fetchSalesComps] ▶ Input: borough="${borough}" block="${block}" lot="${lot}" zip="${zipCode}" class="${buildingClass}"`)
    // Try exact match first
    const exactRows = await socrataQuery<SocrataRollingSalesRow>(
      SOCRATA_DATASETS.rollingSales,
      {
        $where: `borough='${borough}' AND block='${block}' AND lot='${lot}'`,
        $limit: "5",
        $order: "sale_date DESC",
      },
      "sales",
    )

    const exact =
      !isSocrataError(exactRows) && exactRows.length > 0
        ? exactRows
        : []

    // Fetch comps in same zip if we have it
    let comps: SocrataRollingSalesRow[] = []
    if (zipCode) {
      const classFilter = buildingClass
        ? ` AND building_class_at_present='${buildingClass}'`
        : ""
      const compsResult = await socrataQuery<SocrataRollingSalesRow>(
        SOCRATA_DATASETS.rollingSales,
        {
          $where: `zip_code='${zipCode}'${classFilter} AND sale_price > '0'`,
          $limit: "20",
          $order: "sale_date DESC",
        },
        "sales_comps",
      )
      if (!isSocrataError(compsResult)) comps = compsResult
    }

    const parseSale = (r: SocrataRollingSalesRow) => {
      const price = parseInt(r.sale_price?.replace(/,/g, "") || "0")
      const sqft = parseInt(r.gross_square_feet?.replace(/,/g, "") || "0")
      return {
        address: r.address,
        neighbourhood: r.neighborhood,
        salePrice: price,
        saleDate: r.sale_date,
        grossSqft: sqft || null,
        pricePerSqft: sqft > 0 ? Math.round(price / sqft) : null,
        buildingClass: r.building_class_at_present,
        yearBuilt: parseInt(r.year_built) || null,
        totalUnits: parseInt(r.total_units) || null,
      }
    }

    const validComps = comps
      .map(parseSale)
      .filter((s) => s.salePrice > 10000)

    const result = {
      exactSales: exact.map(parseSale),
      comparableSales: validComps.slice(0, 10),
      avgPricePerSqft:
        validComps.length > 0
          ? Math.round(
              validComps
                .filter((c) => c.pricePerSqft)
                .reduce((sum, c) => sum + (c.pricePerSqft || 0), 0) /
                validComps.filter((c) => c.pricePerSqft).length || 0,
            ) || null
          : null,
    }
    console.log(`[TOOL:fetchSalesComps] ✓ exact=${result.exactSales.length} comps=${result.comparableSales.length} avgPSF=$${result.avgPricePerSqft}`)
    return result
  },
})
