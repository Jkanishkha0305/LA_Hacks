import { tool } from "ai"
import { z } from "zod"
import { fetchFairMarketRent, isHudError } from "@/lib/api/hud"

export const rentTool = tool({
  description:
    "Fetch HUD Fair Market Rent data for a NYC borough. Returns rent amounts by bedroom count (efficiency through 4BR). Use the borough name from the geocode result.",
  inputSchema: z.object({
    borough: z
      .string()
      .describe("NYC borough name: Manhattan, Brooklyn, Bronx, Queens, or Staten Island"),
  }),
  execute: async ({ borough }) => {
    console.log(`\n[TOOL:fetchRentData] ▶ Input: borough="${borough}"`)
    const result = await fetchFairMarketRent(borough)
    if (isHudError(result)) {
      console.error(`[TOOL:fetchRentData] ✗ Error:`, result.error)
      return result
    }
    console.log(`[TOOL:fetchRentData] ✓ 1BR=$${result.oneBr} 2BR=$${result.twoBr} area=${result.areaName}`)
    return result
  },
})
