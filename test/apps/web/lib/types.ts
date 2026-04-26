import type { DevelopmentScenario } from './zoning'
export type { DevelopmentScenario }

// ── GeoSearch API Response ──

export interface GeoSearchResult {
  label: string                    // "120 BROADWAY, Manhattan, New York, NY, USA"
  name: string                     // "120 BROADWAY"
  borough: string                  // "Manhattan"
  bbl: string                      // "1000477501" (10-digit)
  coordinates: [number, number]    // [lng, lat] — GeoJSON order
  altAddresses?: string[]          // other addresses sharing this BBL
}

// ── Parcel State ──

export type ParcelStatus = 'loading' | 'ready' | 'error'

export interface PinnedParcel {
  bbl: string
  address: string
  borough: string
  lat: number
  lng: number
  status: ParcelStatus
  agentProgress?: string           // "Fetching parcel data...", etc.
  data?: ParcelData                // populated when agent completes
  error?: string
}

// ── Parcel Data (populated by agent) ──

export interface ParcelData {
  // Zoning (from PLUTO + DCP GIS)
  zoningDistrict: string           // PLUTO: zonedist1
  commercialOverlay: string | null // PLUTO: overlay1
  specialDistrict: string | null   // PLUTO: spdist1

  // MIH (from DCP GIS MIH layer)
  mihArea: string | null           // e.g. "MIH Option 1", "MIH Option 1 and 2"
  mihBonusFAR: number | null       // additional FAR unlocked by MIH compliance

  // Lot (from PLUTO)
  lotArea: number                  // PLUTO: lotarea (sq ft)
  lotFrontage: number              // PLUTO: lotfront (ft)
  lotDepth: number                 // PLUTO: lotdepth (ft)

  // FAR (from PLUTO)
  builtFAR: number                 // PLUTO: builtfar
  residFAR: number                 // PLUTO: residfar (max residential)
  commFAR: number                  // PLUTO: commfar (max commercial)
  facilFAR: number                 // PLUTO: facilfar (max facility)

  // Building (from PLUTO)
  buildingClass: string            // PLUTO: bldgclass
  yearBuilt: number                // PLUTO: yearbuilt
  numFloors: number                // PLUTO: numfloors
  unitsRes: number                 // PLUTO: unitsres
  unitsTotal: number               // PLUTO: unitstotal
  buildingArea: number             // PLUTO: bldgarea (sq ft)
  ownerName: string                // PLUTO: ownername

  // Constraints (from PLUTO + FEMA)
  landmark: string | null          // PLUTO: landmark
  histDist: string | null          // PLUTO: histdist
  eDesigNum: string | null         // PLUTO: edesignum
  floodZone: string | null         // FEMA: FLD_ZONE ("AE", "X", etc.)
  isFloodHazard: boolean           // FEMA: SFHA_TF === "T"

  // Computed (deterministic — see lib/zoning.ts)
  maxFAR: number                   // MX districts: residFAR + commFAR
                                   // R districts: residFAR
                                   // C/M districts: commFAR
                                   // See computeMaxFAR() in lib/zoning.ts
  farUpside: number                // max(0, maxFAR - builtFAR)
  maxBuildableSF: number           // lotArea * maxFAR
  score: 'high' | 'med' | 'low'   // Composite: (farUpside * lotArea), penalized by constraints

  // Parcel geometry (from PLUTO — polygon boundary)
  geometry?: GeoJSON.Geometry

  // Agent interpretation
  interpretation: string           // Gemini-generated summary

  // AI-structured analysis (from Gemini generateObject)
  incentives?: Incentive[]
  ceqrThresholds?: CEQRThreshold[]
  estimatedMaxHeight?: string      // e.g. "85 ft / 7 floors"

  // MIH development scenarios (Phase 8 — only present when mihArea is set)
  scenarios?: DevelopmentScenario[]
}

export interface Incentive {
  name: string                     // "MIH Option 1", "485-x Tax Incentive"
  status: 'Applicable' | 'Potentially Eligible' | 'Not Applicable'
  detail: string                   // 1-2 sentence explanation
  impact: string                   // "+37,500 sf buildable", "35-year tax exemption"
}

export interface CEQRThreshold {
  name: string                     // "Residential Units > 200"
  triggered: boolean
  detail: string                   // 1 sentence explanation
}

// ── Constraint Tags (for UI) ──

export type ConstraintType = 'FLOOD' | 'E-DESIG' | 'LANDMARK' | 'HISTORIC'

// ── Context State ──

export type ViewMode = 'table' | 'report' | 'compare'

export interface ParcelState {
  parcels: PinnedParcel[]
  hoveredBBL: string | null
  sortColumn: SortableColumn | null
  sortDirection: 'asc' | 'desc'
  selectedBBL: string | null       // BBL of parcel shown in report view
  compareBBLs: string[]            // BBLs selected for side-by-side comparison
  viewMode: ViewMode
}

export type SortableColumn =
  | 'address'
  | 'zoningDistrict'
  | 'lotArea'
  | 'builtFAR'
  | 'maxFAR'
  | 'farUpside'
  | 'maxBuildableSF'
  | 'shadowScore'
  | 'coverageBuiltPct'
  | 'neighborhoodScore'
  | 'envelopeUtilization'

export type ParcelAction =
  | { type: 'PIN_PARCEL'; parcel: Omit<PinnedParcel, 'status'>  & { status: 'loading' } }
  | { type: 'UPDATE_PROGRESS'; bbl: string; progress: string }
  | { type: 'PARCEL_READY'; bbl: string; data: ParcelData }
  | { type: 'PARCEL_ERROR'; bbl: string; error: string }
  | { type: 'REMOVE_PARCEL'; bbl: string }
  | { type: 'SET_HOVERED'; bbl: string | null }
  | { type: 'SET_SORT'; column: SortableColumn }
  | { type: 'CLEAR_ALL' }
  | { type: 'SELECT_PARCEL'; bbl: string }
  | { type: 'DESELECT_PARCEL' }
  | { type: 'TOGGLE_COMPARE'; bbl: string }
  | { type: 'CLEAR_COMPARE' }
  | { type: 'START_COMPARE' }
  | { type: 'SET_VIEW'; mode: ViewMode }

// ── Vision Pipeline ──

export interface VisionAssessment {
  estimatedStories: number | null
  currentUse: string
  condition: string
  buildingType: string
  lotFeatures: string[]
  constructionActivity: boolean
  adjacentContext: string
  developmentNotes: string
}

export interface CoverageBreakdown {
  builtPct: number
  pavedPct: number
  greenPct: number
}

export interface NeighborhoodDetails {
  walkability: number
  commercialDensity: number
  infrastructure: number
  transitAccess: number
  highlights: string[]
  concerns: string[]
}

export interface VisionData {
  streetViewImage: string | null      // base64 data URL
  streetViewMulti: string[] | null    // base64 JPEGs [N, E, S, W headings]
  assessment: VisionAssessment | null
  aerialImage: string | null          // raw satellite base64
  annotatedAerial: string | null      // NB2 output base64

  // Per-parcel vision scores
  shadowScore: number | null           // 1-10, higher = less shadow impact
  shadowDiagram: string | null         // base64 annotated aerial with shadow projection
  coverageBreakdown: CoverageBreakdown | null
  neighborhoodScore: number | null     // 1-10 composite
  neighborhoodDetails: NeighborhoodDetails | null
  envelopeUtilization: number | null   // 0-100%, current built / max buildable
  envelopeImage: string | null         // base64 isometric envelope overlay
}

export type VisionStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface VisionEntry {
  status: VisionStatus
  data: VisionData | null
  error: string | null
}

export type VisionAction =
  | { type: 'VISION_START'; bbl: string }
  | { type: 'VISION_READY'; bbl: string; data: VisionData }
  | { type: 'VISION_ERROR'; bbl: string; error: string }
  | { type: 'VISION_CLEAR'; bbl: string }
  | { type: 'COMPARE_START' }
  | { type: 'COMPARE_READY'; report: ComparativeReport }
  | { type: 'COMPARE_ERROR'; error: string }
  | { type: 'COMPARE_CLEAR' }

// ── Comparative Vision ──

export interface ComparativeRanking {
  bbl: string
  rank: number
  rationale: string
}

export interface ComparativeDelta {
  metric: string
  bblA: string
  valueA: string
  bblB: string
  valueB: string
  insight: string
}

export interface ComparativeReport {
  rankings: ComparativeRanking[]
  comparativeNotes: string
  bestFor: {
    groundUp: { bbl: string; reason: string }
    value: { bbl: string; reason: string }
    rehab: { bbl: string; reason: string }
  }
  deltas: ComparativeDelta[]
  compositeAerial: string | null
}

export type ComparativeStatus = 'idle' | 'loading' | 'ready' | 'error'
