/**
 * Compute effective maxFAR based on zoning district type.
 */
export function computeMaxFAR(
  zoningDistrict: string,
  residFAR: number,
  commFAR: number,
  facilFAR: number,
): number {
  const isMixedUse = zoningDistrict.includes('/') // e.g., M1-4/R7A in NYC or similar in LA
  if (isMixedUse) return residFAR + commFAR
  
  // For LA: Height District is often encoded in the name, but residFAR/commFAR 
  // passed from the API (ZIMAS/PLUTO) should already reflect the base max.
  return Math.max(residFAR, commFAR, facilFAR)
}

/**
 * Compute development potential score.
 */
export function computeScore(
  farUpside: number,
  lotArea: number,
  constraintCount: number,
): 'high' | 'med' | 'low' {
  const rawScore = farUpside * lotArea
  const penalty = constraintCount * 0.15 // 15% penalty per constraint
  const adjustedScore = rawScore * (1 - penalty)

  if (adjustedScore >= 100_000) return 'high'
  if (adjustedScore >= 30_000) return 'med'
  return 'low'
}

// ── LA TOC (Transit Oriented Communities) Logic ──

interface TOCConfig {
  densityBonus: number
  farBonus: number
  minFAR: number
}

const TOC_TIER_CONFIG: Record<string, TOCConfig> = {
  'TOC Tier 1': { densityBonus: 0.50, farBonus: 0.40, minFAR: 2.75 },
  'TOC Tier 2': { densityBonus: 0.60, farBonus: 0.45, minFAR: 3.25 },
  'TOC Tier 3': { densityBonus: 0.70, farBonus: 0.50, minFAR: 3.75 },
  'TOC Tier 4': { densityBonus: 0.80, farBonus: 0.55, minFAR: 4.25 },
}

interface TOCOption {
  name: string
  affordabilityPct: number
  amiLevel: string
}

const TOC_OPTIONS: TOCOption[] = [
  { name: 'ELI Focus', affordabilityPct: 0.11, amiLevel: 'Extremely Low Income' },
  { name: 'VLI Focus', affordabilityPct: 0.15, amiLevel: 'Very Low Income' },
  { name: 'Lower Income Focus', affordabilityPct: 0.25, amiLevel: 'Lower Income' },
]

const EFFICIENCY_RATIO = 0.80
const AVG_UNIT_SIZE_SF = 850

export interface DevelopmentScenario {
  name: string
  maxFAR: number
  mihBonusFAR: number // Keeping name for compatibility or renaming to bonusFAR
  maxBuildableSF: number
  affordabilityReq: string
  estimatedUnits: number
  marketRateUnits: number
  affordableUnits: number
  interpretation: string
  isAIEstimate?: boolean
}

/**
 * Compute LA TOC development scenarios for a parcel.
 * Uses true LA TOC Guidelines for Density and FAR bonuses.
 */
export function computeScenarios(
  zoningDistrict: string,
  lotArea: number,
  baseMaxFAR: number,
  builtFAR: number,
  tocTier: string,
): DevelopmentScenario[] {
  const config = TOC_TIER_CONFIG[tocTier]
  
  // If we don't recognize the tier, return empty or fallback
  if (!config) return []

  return TOC_OPTIONS.map(option => {
    // FAR Bonus: Either a percentage increase or a minimum floor, whichever is greater
    // For RD zones, capped at 45% (simplified here as we use the config farBonus)
    const farIncrease = baseMaxFAR * (1 + config.farBonus)
    const scenarioMaxFAR = Math.max(farIncrease, config.minFAR)
    
    const bonusFAR = scenarioMaxFAR - baseMaxFAR
    const buildableSF = lotArea * scenarioMaxFAR
    
    // Density calculation: LA TOC allows a % increase in base units allowed.
    // If we don't have base units, we use a SF-based estimate with the bonus.
    const baseUnitsEstimate = (lotArea * baseMaxFAR * EFFICIENCY_RATIO) / AVG_UNIT_SIZE_SF
    const totalUnits = Math.floor(baseUnitsEstimate * (1 + config.densityBonus))
    const affordableUnits = Math.ceil(totalUnits * option.affordabilityPct)

    return {
      name: `TOC ${option.name} (${tocTier})`,
      maxFAR: scenarioMaxFAR,
      mihBonusFAR: bonusFAR,
      maxBuildableSF: buildableSF,
      affordabilityReq: `${Math.round(option.affordabilityPct * 100)}% of units for ${option.amiLevel}`,
      estimatedUnits: totalUnits,
      marketRateUnits: totalUnits - affordableUnits,
      affordableUnits,
      interpretation: '', // filled by Gemini
      isAIEstimate: false,
    }
  })
}
