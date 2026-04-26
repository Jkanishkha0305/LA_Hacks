import { tool } from "ai"
import { z } from "zod"
import { socrataQuery, isSocrataError } from "@/lib/api/socrata"
import { SOCRATA_DATASETS } from "@/lib/config/data-sources"
import type { SocrataPlutoRow } from "@/lib/types/api-responses"

export const plutoTool = tool({
  description:
    "Fetch PLUTO property data for a NYC parcel by BBL. Returns building class, units, year built, lot/building area, FAR, zoning district, and owner.",
  inputSchema: z.object({
    bbl: z.string().describe("10-digit Borough-Block-Lot identifier"),
  }),
  execute: async ({ bbl }) => {
    console.log(`\n[TOOL:fetchPlutoData] ▶ Input: bbl="${bbl}"`)
    const rows = await socrataQuery<SocrataPlutoRow>(
      SOCRATA_DATASETS.pluto,
      { $where: `bbl='${bbl}'`, $limit: "1" },
      "pluto",
    )
    if (isSocrataError(rows)) {
      console.error(`[TOOL:fetchPlutoData] ✗ Error:`, rows.error)
      return rows
    }
    const row = rows[0]
    if (!row) {
      console.warn(`[TOOL:fetchPlutoData] ✗ No data for BBL ${bbl}`)
      return { error: `No PLUTO data for BBL ${bbl}`, source: "pluto" }
    }

    const result = {
      bbl: row.bbl,
      address: row.address,
      bldgclass: row.bldgclass,
      landuse: row.landuse,
      ownername: row.ownername,
      lotarea: parseFloat(row.lotarea) || null,
      bldgarea: parseFloat(row.bldgarea) || null,
      resarea: parseFloat(row.resarea) || null,
      officearea: parseFloat(row.officearea) || null,
      retailarea: parseFloat(row.retailarea) || null,
      numfloors: parseFloat(row.numfloors) || null,
      unitsres: parseInt(row.unitsres) || null,
      unitstotal: parseInt(row.unitstotal) || null,
      yearbuilt: parseInt(row.yearbuilt) || null,
      zonedist1: row.zonedist1,
      builtfar: parseFloat(row.builtfar) || null,
      residfar: parseFloat(row.residfar) || null,
      commfar: parseFloat(row.commfar) || null,
      facilfar: parseFloat(row.facilfar) || null,
    }
    console.log(`[TOOL:fetchPlutoData] ✓ ${result.address} | class=${result.bldgclass} floors=${result.numfloors} units=${result.unitstotal} year=${result.yearbuilt} zone=${result.zonedist1}`)
    return result
  },
})
