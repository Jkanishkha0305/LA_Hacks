import { generateObject, generateImage } from 'ai'
import { GeminiModel } from '@/lib/config/models'
import { getGoogleProvider, type GoogleProvider } from '@/lib/google-provider'
import { z } from 'zod'
import type { VisionAssessment, VisionData, CoverageBreakdown, NeighborhoodDetails } from '@/lib/types'

export const maxDuration = 60

const PLUTO_RESOURCE_ID = process.env.PLUTO_RESOURCE_ID || '64uk-42ks'

const RequestSchema = z.object({
  bbl: z.string().regex(/^\d{10}$/, 'BBL must be exactly 10 digits'),
  lat: z.number().min(40.4, 'Latitude out of NYC range').max(40.95),
  lng: z.number().min(-74.3, 'Longitude out of NYC range').max(-73.7),
  address: z.string().min(1).max(200),
})

const visionAssessmentSchema = z.object({
  estimatedStories: z.number().nullable(),
  currentUse: z.string(),
  condition: z.string(),
  buildingType: z.string(),
  lotFeatures: z.array(z.string()),
  constructionActivity: z.boolean(),
  adjacentContext: z.string(),
  developmentNotes: z.string(),
})

const shadowAnalysisSchema = z.object({
  shadowScore: z.number().min(1).max(10),
  estimatedHeightFt: z.number().nullable(),
  shadowDirection: z.string(),
  adjacentImpact: z.string(),
})

const coverageAnalysisSchema = z.object({
  builtPct: z.number().min(0).max(100),
  pavedPct: z.number().min(0).max(100),
  greenPct: z.number().min(0).max(100),
  segmentationNotes: z.string(),
})

const neighborhoodScoringSchema = z.object({
  walkability: z.number().min(1).max(10),
  commercialDensity: z.number().min(1).max(10),
  infrastructure: z.number().min(1).max(10),
  transitAccess: z.number().min(1).max(10),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
})

const STREET_VIEW_PROMPT = `Analyze this Street View image of a property in New York City.
Return a structured assessment:
- estimatedStories: number of floors visible (null if unclear)
- currentUse: primary use (residential, commercial, mixed, vacant lot, etc.)
- condition: building condition (excellent, good, fair, poor, vacant lot)
- buildingType: construction type (masonry, steel frame, wood frame, etc.)
- lotFeatures: notable features (corner lot, through lot, parking, signage, etc.)
- constructionActivity: whether construction or renovation is visible
- adjacentContext: brief description of neighboring buildings and streetscape
- developmentNotes: anything relevant to redevelopment potential`

const SHADOW_PROMPT = `Analyze this Street View image to assess shadow impact for a potential new development.
Consider the building height, surrounding structures, and street orientation.
- shadowScore: 1-10 (10 = minimal shadow impact on neighbors, great solar exposure; 1 = severe shadow impact)
- estimatedHeightFt: estimated height of the existing building in feet (null if vacant lot)
- shadowDirection: primary direction shadows would fall from a new building (e.g. "north", "northeast")
- adjacentImpact: brief description of how a new building at max zoning height would affect neighboring light and air`

const COVERAGE_PROMPT = `Analyze this satellite/aerial image of a NYC lot. Segment the lot into coverage categories.
Return approximate percentages (must sum to ~100):
- builtPct: percentage covered by buildings/structures
- pavedPct: percentage that is paved (parking, driveways, sidewalks)
- greenPct: percentage that is green space (grass, trees, gardens)
- segmentationNotes: brief description of what you see on the lot`

const NEIGHBORHOOD_PROMPT = `You are analyzing 4 Street View images taken from the same NYC intersection, facing North, East, South, and West respectively.
Score the neighborhood on each dimension (1-10):
- walkability: pedestrian infrastructure, crosswalks, sidewalk quality, foot traffic
- commercialDensity: retail, restaurants, services visible
- infrastructure: road quality, lighting, transit stops, bike lanes
- transitAccess: subway entrances, bus stops, bike docks visible
- highlights: list 2-3 positive observations
- concerns: list 1-2 concerns or negative observations`

export async function POST(req: Request) {
  const google = getGoogleProvider(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { bbl, lat, lng, address } = parsed.data

  // Phase A: Parallel data fetching (images + PLUTO + multi-heading street views)
  const [streetViewResult, satelliteResult, plutoResult, multiSVResult] = await Promise.allSettled([
    fetchStreetView(lat, lng),
    fetchSatellite(lat, lng),
    fetchPLUTOMinimal(bbl),
    fetchStreetViewMulti(lat, lng),
  ])

  const streetViewBuffer = streetViewResult.status === 'fulfilled' ? streetViewResult.value : null
  const satelliteBuffer = satelliteResult.status === 'fulfilled' ? satelliteResult.value : null
  const pluto = plutoResult.status === 'fulfilled' ? plutoResult.value : null
  const multiSVBuffers = multiSVResult.status === 'fulfilled' ? multiSVResult.value : null

  // Phase B: AI analysis (existing — Street View assessment + NB2 aerial)
  // Phase C: New analyses (shadow, coverage, envelope, neighborhood)
  // All run in parallel

  let assessment: VisionAssessment | null = null
  let annotatedAerial: string | null = null
  let shadowScore: number | null = null
  let shadowDiagram: string | null = null
  let coverageBreakdown: CoverageBreakdown | null = null
  let neighborhoodScore: number | null = null
  let neighborhoodDetails: NeighborhoodDetails | null = null
  let envelopeUtilization: number | null = null
  let envelopeImage: string | null = null

  // Compute envelope utilization deterministically
  if (pluto) {
    const builtFAR = parseFloat(pluto['builtfar'] ?? '0') || 0
    const maxFAR = Math.max(
      parseFloat(pluto['residfar'] ?? '0') || 0,
      parseFloat(pluto['commfar'] ?? '0') || 0,
    )
    if (maxFAR > 0) {
      envelopeUtilization = Math.round((builtFAR / maxFAR) * 100)
    }
  }

  // Run all AI analyses in parallel
  const aiResults = await Promise.allSettled([
    // B1: Street View assessment (existing)
    streetViewBuffer ? analyzeStreetView(google, streetViewBuffer) : Promise.resolve(null),
    // B2: NB2 aerial annotation (existing)
    satelliteBuffer && pluto ? annotateAerial(google, satelliteBuffer, pluto, address) : Promise.resolve(null),
    // C1: Shadow analysis
    streetViewBuffer && pluto ? analyzeShadow(google, streetViewBuffer, pluto) : Promise.resolve(null),
    // C2: Shadow diagram
    satelliteBuffer && pluto ? generateShadowDiagram(google, satelliteBuffer, pluto, address) : Promise.resolve(null),
    // C3: Coverage analysis
    satelliteBuffer ? analyzeCoverage(google, satelliteBuffer) : Promise.resolve(null),
    // C4: Envelope visualization
    satelliteBuffer && pluto ? generateEnvelope(google, satelliteBuffer, pluto, address) : Promise.resolve(null),
    // C5: Neighborhood scoring
    multiSVBuffers ? scoreNeighborhood(google, multiSVBuffers) : Promise.resolve(null),
  ])

  // Extract results — log rejected promises so image generation failures are visible
  const aiLabels = [
    'Street View assessment',
    'Annotated aerial',
    'Shadow analysis',
    'Shadow diagram',
    'Coverage analysis',
    'Envelope visualization',
    'Neighborhood scoring',
  ]
  for (let i = 0; i < aiResults.length; i++) {
    const r = aiResults[i]!
    if (r.status === 'rejected') {
      console.error(`[vision] ${aiLabels[i]} failed for ${bbl}:`, (r as PromiseRejectedResult).reason)
    }
  }

  if (aiResults[0].status === 'fulfilled' && aiResults[0].value) {
    assessment = aiResults[0].value
  }
  if (aiResults[1].status === 'fulfilled' && aiResults[1].value) {
    annotatedAerial = aiResults[1].value
  }
  if (aiResults[2].status === 'fulfilled' && aiResults[2].value) {
    shadowScore = aiResults[2].value.shadowScore
  }
  if (aiResults[3].status === 'fulfilled' && aiResults[3].value) {
    shadowDiagram = aiResults[3].value
  }
  if (aiResults[4].status === 'fulfilled' && aiResults[4].value) {
    coverageBreakdown = {
      builtPct: aiResults[4].value.builtPct,
      pavedPct: aiResults[4].value.pavedPct,
      greenPct: aiResults[4].value.greenPct,
    }
  }
  if (aiResults[5].status === 'fulfilled' && aiResults[5].value) {
    envelopeImage = aiResults[5].value
  }
  if (aiResults[6].status === 'fulfilled' && aiResults[6].value) {
    const nd = aiResults[6].value
    neighborhoodDetails = nd
    neighborhoodScore = Math.round(
      (nd.walkability + nd.commercialDensity + nd.infrastructure + nd.transitAccess) / 4 * 10
    ) / 10
  }

  const result: VisionData = {
    streetViewImage: streetViewBuffer ? streetViewBuffer.toString('base64') : null,
    streetViewMulti: multiSVBuffers ? multiSVBuffers.map(b => b.toString('base64')) : null,
    assessment,
    aerialImage: satelliteBuffer ? satelliteBuffer.toString('base64') : null,
    annotatedAerial,
    shadowScore,
    shadowDiagram,
    coverageBreakdown,
    neighborhoodScore,
    neighborhoodDetails,
    envelopeUtilization,
    envelopeImage,
  }

  return Response.json(result)
}

// ── AI Analysis Functions ──

async function analyzeStreetView(google: GoogleProvider, buffer: Buffer): Promise<VisionAssessment> {
  const { object } = await generateObject({
    model: google(GeminiModel.FLASH_IMAGE),
    schema: visionAssessmentSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: STREET_VIEW_PROMPT },
        { type: 'file', data: buffer, mediaType: 'image/jpeg' },
      ],
    }],
  })
  return object
}

async function annotateAerial(
  google: GoogleProvider,
  satelliteBuffer: Buffer,
  pluto: Record<string, string>,
  address: string,
): Promise<string> {
  const lotFront = pluto['lotfront'] ?? '?'
  const lotDepth = pluto['lotdepth'] ?? '?'
  const zoning = pluto['zonedist1'] ?? 'Unknown'
  const maxFAR = Math.max(
    parseFloat(pluto['residfar'] ?? '0') || 0,
    parseFloat(pluto['commfar'] ?? '0') || 0,
  )

  const { image } = await generateImage({
    model: google.image(GeminiModel.FLASH_IMAGE),
    prompt: {
      images: [satelliteBuffer],
      text: `Annotate this satellite image of a lot at ${address}, NYC. Draw lot boundary (yellow, ~${lotFront}ft x ${lotDepth}ft), label "${zoning} | FAR ${maxFAR}", shade buildable envelope semi-transparent blue. Style: clean, professional, like an analyst's marked-up site plan.`,
    },
  })
  return image.base64
}

async function analyzeShadow(
  google: GoogleProvider,
  streetViewBuffer: Buffer,
  pluto: Record<string, string>,
): Promise<{ shadowScore: number }> {
  const context = `Building info: ${pluto['numfloors'] ?? '?'} floors, lot ${pluto['lotfront'] ?? '?'}ft x ${pluto['lotdepth'] ?? '?'}ft, zoned ${pluto['zonedist1'] ?? '?'}.`
  const { object } = await generateObject({
    model: google(GeminiModel.FLASH_IMAGE),
    schema: shadowAnalysisSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `${SHADOW_PROMPT}\n\n${context}` },
        { type: 'file', data: streetViewBuffer, mediaType: 'image/jpeg' },
      ],
    }],
  })
  return object
}

async function generateShadowDiagram(
  google: GoogleProvider,
  satelliteBuffer: Buffer,
  pluto: Record<string, string>,
  address: string,
): Promise<string> {
  const numFloors = pluto['numfloors'] ?? '?'
  const maxFAR = Math.max(parseFloat(pluto['residfar'] ?? '0') || 0, parseFloat(pluto['commfar'] ?? '0') || 0)

  const { image } = await generateImage({
    model: google.image(GeminiModel.FLASH_IMAGE),
    prompt: {
      images: [satelliteBuffer],
      text: `Annotate this satellite image of ${address}, NYC to show shadow impact analysis. The existing building is ~${numFloors} floors. Draw: 1) lot boundary in yellow, 2) shadow projection from a building at max FAR ${maxFAR} as a dark semi-transparent overlay extending from the building footprint, 3) label shadow direction and approximate shadow length. Style: professional shadow study diagram.`,
    },
  })
  return image.base64
}

async function analyzeCoverage(
  google: GoogleProvider,
  satelliteBuffer: Buffer,
): Promise<{ builtPct: number; pavedPct: number; greenPct: number; segmentationNotes: string }> {
  const { object } = await generateObject({
    model: google(GeminiModel.FLASH_IMAGE),
    schema: coverageAnalysisSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: COVERAGE_PROMPT },
        { type: 'file', data: satelliteBuffer, mediaType: 'image/jpeg' },
      ],
    }],
  })
  return object
}

// ── NYC Zoning Bulk Controls (ZR §23-60, §33-40, §43-40) ──

interface BulkControls {
  maxHeightFt: number | null
  streetWallMaxFt: number | null
  rearYardFt: number
  sideYardFt: number | null
  skyExposureRatio: string | null
  maxLotCoveragePct: number | null
  frontYardFt: number | null
  district: string
}

/**
 * Derive approximate zoning bulk controls from the district string.
 * Covers common NYC residential + commercial districts.
 * For MX districts (e.g. M1-4/R7A), uses the R-district equivalent.
 */
function deriveBulkControls(zoning: string): BulkControls {
  // Extract R-district from MX pairs like "M1-4/R7A"
  const mxMatch = zoning.match(/\/(R\d+\w?)/)
  const effectiveDistrict = mxMatch ? mxMatch[1]! : zoning.replace(/^(R\d+\w?|C\d+-\d+\w?|M\d+-\d+\w?).*/, '$1')

  const defaults: BulkControls = {
    maxHeightFt: null,
    streetWallMaxFt: null,
    rearYardFt: 30,
    sideYardFt: null,
    skyExposureRatio: null,
    maxLotCoveragePct: null,
    frontYardFt: null,
    district: effectiveDistrict,
  }

  // Low-density residential (R1-R5)
  if (/^R[12]/.test(effectiveDistrict)) return { ...defaults, maxHeightFt: 35, rearYardFt: 30, sideYardFt: 8, frontYardFt: 15, maxLotCoveragePct: 35, skyExposureRatio: '1:1' }
  if (/^R3/.test(effectiveDistrict)) return { ...defaults, maxHeightFt: 35, rearYardFt: 30, sideYardFt: 8, frontYardFt: 10, maxLotCoveragePct: 35, skyExposureRatio: '2.5:1' }
  if (/^R4/.test(effectiveDistrict)) return { ...defaults, maxHeightFt: 35, rearYardFt: 30, sideYardFt: 8, frontYardFt: 10, maxLotCoveragePct: 45, skyExposureRatio: '2.7:1' }
  if (/^R5/.test(effectiveDistrict)) return { ...defaults, maxHeightFt: 40, rearYardFt: 30, sideYardFt: 8, frontYardFt: 10, maxLotCoveragePct: 55, skyExposureRatio: '2.7:1' }

  // Medium/high-density contextual residential (Quality Housing)
  if (effectiveDistrict === 'R6A') return { ...defaults, maxHeightFt: 70, streetWallMaxFt: 60, rearYardFt: 30, maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R6B') return { ...defaults, maxHeightFt: 50, streetWallMaxFt: 40, rearYardFt: 30, maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R7A') return { ...defaults, maxHeightFt: 80, streetWallMaxFt: 65, rearYardFt: 30, maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R7B') return { ...defaults, maxHeightFt: 75, streetWallMaxFt: 60, rearYardFt: 30, maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R7D') return { ...defaults, maxHeightFt: 100, streetWallMaxFt: 85, rearYardFt: 30, maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R7X') return { ...defaults, maxHeightFt: 125, streetWallMaxFt: 85, rearYardFt: 30, maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R8A') return { ...defaults, maxHeightFt: 120, streetWallMaxFt: 85, rearYardFt: 30, maxLotCoveragePct: 70 }
  if (effectiveDistrict === 'R8B') return { ...defaults, maxHeightFt: 75, streetWallMaxFt: 60, rearYardFt: 30, maxLotCoveragePct: 70 }
  if (effectiveDistrict === 'R9A') return { ...defaults, maxHeightFt: 145, streetWallMaxFt: 105, rearYardFt: 30, maxLotCoveragePct: 70 }
  if (effectiveDistrict === 'R10A') return { ...defaults, maxHeightFt: 185, streetWallMaxFt: 125, rearYardFt: 30, maxLotCoveragePct: 70 }

  // Height-factor residential (no letter suffix)
  if (effectiveDistrict === 'R6') return { ...defaults, maxHeightFt: null, rearYardFt: 30, skyExposureRatio: '2.7:1', maxLotCoveragePct: 65 }
  if (effectiveDistrict === 'R7') return { ...defaults, maxHeightFt: null, rearYardFt: 30, skyExposureRatio: '3.7:1', maxLotCoveragePct: 65 }
  if (/^R[78]$/.test(effectiveDistrict)) return { ...defaults, maxHeightFt: null, rearYardFt: 30, skyExposureRatio: '3.7:1', maxLotCoveragePct: 65 }
  if (/^R(9|10)$/.test(effectiveDistrict)) return { ...defaults, maxHeightFt: null, rearYardFt: 30, skyExposureRatio: '5.6:1', maxLotCoveragePct: 70 }

  // Commercial districts — generally no height limit, no front/side yards
  if (/^C[12]/.test(effectiveDistrict)) return { ...defaults, rearYardFt: 20, maxLotCoveragePct: null, skyExposureRatio: '2.7:1' }
  if (/^C[456]/.test(effectiveDistrict)) return { ...defaults, rearYardFt: 20, maxLotCoveragePct: null, skyExposureRatio: '5.6:1' }

  // Manufacturing
  if (/^M1/.test(effectiveDistrict)) return { ...defaults, rearYardFt: 20, maxLotCoveragePct: null, skyExposureRatio: '2.7:1' }
  if (/^M[23]/.test(effectiveDistrict)) return { ...defaults, rearYardFt: 20, maxLotCoveragePct: null, skyExposureRatio: '5.6:1' }

  return defaults
}

function buildEnvelopePrompt(
  address: string,
  lotFront: string,
  lotDepth: string,
  maxFAR: number,
  maxSF: number,
  numFloors: string,
  bulk: BulkControls,
): string {
  const lines: string[] = [
    `Annotate this satellite image of ${address}, NYC with a ZD1-style buildable envelope diagram.`,
    `Reference: NYC Department of Buildings Zoning Diagram (ZD1) axonometric conventions.`,
    '',
    `LOT DATA:`,
    `- Lot dimensions: ~${lotFront}ft frontage x ${lotDepth}ft depth`,
    `- Zoning: ${bulk.district} | Max FAR: ${maxFAR} | Max buildable: ${maxSF.toLocaleString()} SF`,
    `- Existing building: ~${numFloors} floors`,
    '',
    `BULK CONTROLS TO VISUALIZE:`,
  ]

  // Yard requirements
  const yards: string[] = []
  if (bulk.frontYardFt) yards.push(`front yard: ${bulk.frontYardFt}ft`)
  yards.push(`rear yard: ${bulk.rearYardFt}ft`)
  if (bulk.sideYardFt) yards.push(`side yards: ${bulk.sideYardFt}ft each`)
  lines.push(`- Required yards: ${yards.join(', ')}`)

  if (bulk.maxLotCoveragePct) {
    lines.push(`- Max lot coverage: ${bulk.maxLotCoveragePct}%`)
  }

  if (bulk.streetWallMaxFt) {
    lines.push(`- Street wall: max ${bulk.streetWallMaxFt}ft, then required setback above`)
  }

  if (bulk.maxHeightFt) {
    lines.push(`- Max building height: ${bulk.maxHeightFt}ft`)
  } else {
    lines.push(`- No fixed height limit (controlled by FAR and sky exposure plane)`)
  }

  if (bulk.skyExposureRatio) {
    lines.push(`- Sky exposure plane: begins at street wall, rises inward at ${bulk.skyExposureRatio} (vertical:horizontal)`)
  }

  lines.push(
    '',
    'DRAWING INSTRUCTIONS (follow NYC ZD1 axonometric diagram conventions):',
    '1. Draw LOT BOUNDARY as solid yellow lines with dimension labels',
    '2. Show REQUIRED YARDS as hatched/shaded setback areas along lot edges — the building cannot occupy these zones',
    '3. Draw the MAXIMUM BUILDING ENVELOPE as a stepped 3D volume:',
  )

  if (bulk.streetWallMaxFt) {
    lines.push(
      `   a. STREET WALL portion: solid volume from ground to ${bulk.streetWallMaxFt}ft at the street-facing lot line (minus any front yard)`,
      `   b. SETBACK portion: above ${bulk.streetWallMaxFt}ft, the volume steps back from the street wall`,
    )
  }

  if (bulk.skyExposureRatio) {
    lines.push(`   c. SKY EXPOSURE PLANE: draw as a dashed diagonal line rising inward at ${bulk.skyExposureRatio} — the envelope must not penetrate this plane`)
  }

  if (bulk.maxHeightFt) {
    lines.push(`   d. MAX HEIGHT: draw a horizontal dashed line at ${bulk.maxHeightFt}ft — the envelope is capped here`)
  }

  lines.push(
    '4. Use semi-transparent blue fill for the buildable volume, darker edges for the outline',
    '5. Label key dimensions: height, street wall, setback depths, yard widths',
    `6. Label total buildable: "${maxSF.toLocaleString()} SF | FAR ${maxFAR}"`,
    '',
    'STYLE: Professional NYC zoning feasibility diagram. Clean line work, dimension arrows, dashed lines for planes and limits. Like an architect\'s ZD1 axonometric overlay on satellite imagery.',
  )

  return lines.join('\n')
}

async function generateEnvelope(
  google: GoogleProvider,
  satelliteBuffer: Buffer,
  pluto: Record<string, string>,
  address: string,
): Promise<string> {
  const lotFront = pluto['lotfront'] ?? '?'
  const lotDepth = pluto['lotdepth'] ?? '?'
  const zoning = pluto['zonedist1'] ?? 'Unknown'
  const numFloors = pluto['numfloors'] ?? '?'
  const maxFAR = Math.max(parseFloat(pluto['residfar'] ?? '0') || 0, parseFloat(pluto['commfar'] ?? '0') || 0)
  const lotArea = parseFloat(pluto['lotarea'] ?? '0') || 0
  const maxSF = Math.round(lotArea * maxFAR)
  const bulk = deriveBulkControls(zoning)

  const { image } = await generateImage({
    model: google.image(GeminiModel.FLASH_IMAGE),
    prompt: {
      images: [satelliteBuffer],
      text: buildEnvelopePrompt(address, lotFront, lotDepth, maxFAR, maxSF, numFloors, bulk),
    },
  })
  return image.base64
}

async function scoreNeighborhood(
  google: GoogleProvider,
  buffers: Buffer[],
): Promise<NeighborhoodDetails> {
  const { object } = await generateObject({
    model: google(GeminiModel.FLASH_IMAGE),
    schema: neighborhoodScoringSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: NEIGHBORHOOD_PROMPT },
        { type: 'text', text: 'Image 1 — facing North:' },
        { type: 'file', data: buffers[0]!, mediaType: 'image/jpeg' },
        { type: 'text', text: 'Image 2 — facing East:' },
        { type: 'file', data: buffers[1]!, mediaType: 'image/jpeg' },
        { type: 'text', text: 'Image 3 — facing South:' },
        { type: 'file', data: buffers[2]!, mediaType: 'image/jpeg' },
        { type: 'text', text: 'Image 4 — facing West:' },
        { type: 'file', data: buffers[3]!, mediaType: 'image/jpeg' },
      ],
    }],
  })
  return object
}

// ── Street View Static API ──

async function fetchStreetView(lat: number, lng: number): Promise<Buffer> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&key=${key}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Street View HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function fetchStreetViewMulti(lat: number, lng: number): Promise<Buffer[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  const headings = [0, 90, 180, 270] // N, E, S, W
  const results = await Promise.all(
    headings.map(async (heading) => {
      const url = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${heading}&key=${key}`
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`Street View HTTP ${res.status} heading=${heading}`)
      return Buffer.from(await res.arrayBuffer())
    }),
  )
  return results
}

// ── Maps Static API (satellite) ──

async function fetchSatellite(lat: number, lng: number): Promise<Buffer> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x640&maptype=satellite&key=${key}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Maps Static HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ── PLUTO minimal (extended fields for vision analyses) ──

async function fetchPLUTOMinimal(bbl: string) {
  const token = process.env.NYC_OPENDATA_TOKEN
  const url = new URL(`https://data.cityofnewyork.us/resource/${PLUTO_RESOURCE_ID}.json`)
  url.searchParams.set('$where', `bbl='${bbl}'`)
  url.searchParams.set('$select', 'zonedist1,lotfront,lotdepth,residfar,commfar,numfloors,bldgarea,lotarea,builtfar,bldgclass')

  const res = await fetch(url.toString(), {
    headers: token ? { 'X-App-Token': token } : {},
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`PLUTO API error: ${res.status}`)
  const data = await res.json()
  if (data.length === 0) throw new Error(`No PLUTO data for BBL ${bbl}`)
  return data[0]
}
