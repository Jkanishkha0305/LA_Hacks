import { generateObject } from 'ai'
import { GeminiModel } from '@/lib/config/models'
import { getGoogleProvider } from '@/lib/google-provider'
import { z } from 'zod'
import { computeMaxFAR, computeScore, computeScenarios } from '@/lib/zoning'
import type { DevelopmentScenario } from '@/lib/zoning'

// Vercel serverless timeout — 3 external APIs + Gemini needs >10s default
export const maxDuration = 30

// PLUTO resource ID changes with each annual release (currently 24v4).
// Override via env var when a new PLUTO version is published.
const PLUTO_RESOURCE_ID = process.env.PLUTO_RESOURCE_ID || '64uk-42ks'

const SYSTEM_PROMPT = `You are a NYC real estate development analyst. You will receive structured data about a specific tax lot including zoning, lot characteristics, FAR values, applicable overlays, MIH status, incentive eligibility, and constraint flags.

Your job is to synthesize this into a concise development potential assessment.

RULES:
- Never invent data. Only reference what is provided in the structured input.
- Distinguish between facts (from city data) and your interpretation.
- If something is uncertain, say "verify with zoning counsel."
- Be direct. The reader is a real estate professional, not a layperson.
- Keep the interpretation to 2-4 sentences.
- Reference specific zoning sections when relevant.
- If the parcel is in an MIH area, note the affordability requirements and their impact on development economics.`

// ── Input Validation ──

const RequestSchema = z.object({
  bbl: z.string().regex(/^\d{10}$/, 'BBL must be exactly 10 digits'),
  lat: z.number().min(40.4, 'Latitude out of NYC range').max(40.95),
  lng: z.number().min(-74.3, 'Longitude out of NYC range').max(-73.7),
  address: z.string().min(1).max(200),
})

// ── Route Handler ──

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

  // Phase A: Deterministic data fetching (parallel, with timeouts)
  const [plutoResult, floodResult, zoningResult, mihResult, geometryResult] = await Promise.allSettled([
    fetchPLUTO(bbl),
    fetchFloodZone(lat, lng),
    fetchZoningGIS(lat, lng),
    fetchMIH(lat, lng),
    fetchParcelGeometry(bbl),
  ])

  // PLUTO is required — everything else degrades gracefully
  const pluto = plutoResult.status === 'fulfilled' ? plutoResult.value : null
  if (!pluto) {
    return Response.json({ error: 'PLUTO data not found for this BBL' }, { status: 404 })
  }

  const flood = floodResult.status === 'fulfilled'
    ? floodResult.value
    : { floodZone: null, isFloodHazard: false }
  const gis = zoningResult.status === 'fulfilled' ? zoningResult.value : null
  const mih = mihResult.status === 'fulfilled'
    ? mihResult.value
    : { mihArea: null, mihBonusFAR: null }

  // Compute derived fields deterministically
  // GIS zoning as fallback for newly created lots where PLUTO may lack zonedist1
  const zoningDistrict = pluto.zonedist1 || gis?.zoningDistrict || ''
  const residFAR = parseFloat(pluto.residfar) || 0
  const commFAR = parseFloat(pluto.commfar) || 0
  const facilFAR = parseFloat(pluto.facilfar) || 0
  const builtFAR = parseFloat(pluto.builtfar) || 0
  const lotArea = parseFloat(pluto.lotarea) || 0

  const maxFAR = computeMaxFAR(zoningDistrict, residFAR, commFAR, facilFAR)
  const farUpside = Math.max(0, maxFAR - builtFAR)
  const maxBuildableSF = lotArea * maxFAR

  const constraintCount = [
    flood.isFloodHazard,
    !!pluto.edesignum,
    !!pluto.landmark,
    !!pluto.histdist,
  ].filter(Boolean).length

  const score = computeScore(farUpside, lotArea, constraintCount)

  // Assemble structured parcel data
  const parcelData = {
    zoningDistrict,
    commercialOverlay: pluto.overlay1 || null,
    specialDistrict: pluto.spdist1 || null,
    mihArea: mih.mihArea || null,
    mihBonusFAR: mih.mihBonusFAR || null,
    lotArea,
    lotFrontage: parseFloat(pluto.lotfront) || 0,
    lotDepth: parseFloat(pluto.lotdepth) || 0,
    builtFAR,
    residFAR,
    commFAR,
    facilFAR,
    buildingClass: pluto.bldgclass || '',
    yearBuilt: parseInt(pluto.yearbuilt) || 0,
    numFloors: parseInt(pluto.numfloors) || 0,
    unitsRes: parseInt(pluto.unitsres) || 0,
    unitsTotal: parseInt(pluto.unitstotal) || 0,
    buildingArea: parseFloat(pluto.bldgarea) || 0,
    ownerName: pluto.ownername || '',
    landmark: pluto.landmark || null,
    histDist: pluto.histdist || null,
    eDesigNum: pluto.edesignum || null,
    floodZone: flood.floodZone || null,
    isFloodHazard: flood.isFloodHazard ?? false,
    maxFAR,
    farUpside,
    maxBuildableSF,
    score,
  }

  // Compute MIH development scenarios when parcel is in MIH area
  let scenarios: DevelopmentScenario[] = []
  if (mih.mihArea) {
    scenarios = computeScenarios(zoningDistrict, lotArea, maxFAR, builtFAR, mih.mihArea)
  }

  // Phase B: Gemini generates interpretation + structured analysis
  let interpretation = 'Interpretation temporarily unavailable. All data fields are accurate.'
  let incentives: Array<{ name: string; status: string; detail: string; impact: string }> = []
  let ceqrThresholds: Array<{ name: string; triggered: boolean; detail: string }> = []
  let estimatedMaxHeight = ''

  // Build scenario context for Gemini prompt
  const scenarioPrompt = scenarios.length > 0
    ? `\n\nPre-computed MIH development scenarios (provide a 1-2 sentence interpretation for each):\n${JSON.stringify(
        scenarios.map(s => ({
          name: s.name,
          maxFAR: s.maxFAR,
          maxBuildableSF: s.maxBuildableSF,
          affordabilityReq: s.affordabilityReq,
          estimatedUnits: s.estimatedUnits,
          marketRateUnits: s.marketRateUnits,
          affordableUnits: s.affordableUnits,
          isAIEstimate: s.isAIEstimate || false,
        })),
        null,
        2,
      )}`
    : ''

  // Extend schema when scenarios exist
  const scenarioSchema = scenarios.length > 0
    ? {
        scenarioInterpretations: z.array(z.object({
          name: z.string().describe('Scenario name, must match exactly one of the pre-computed scenario names'),
          interpretation: z.string().describe('1-2 sentence interpretation of this scenario\'s impact on development economics. Be specific about the trade-off between bonus FAR and affordability requirements.'),
        })).describe('One interpretation per pre-computed MIH scenario'),
      }
    : {}

  try {
    const { object } = await generateObject({
      model: google(GeminiModel.PRO),
      schema: z.object({
        interpretation: z
          .string()
          .describe(
            '2-4 sentence development potential assessment for a real estate professional. ' +
            'Be specific about numbers. Flag risks. Mention FAR upside in terms of buildable SF. ' +
            'Note constraints (flood, landmark, E-designation, MIH requirements). Be direct.',
          ),
        incentives: z.array(z.object({
          name: z.string().describe('Program name, e.g. "MIH Option 1", "485-x Tax Incentive", "Opportunity Zone"'),
          status: z.enum(['Applicable', 'Potentially Eligible', 'Not Applicable']),
          detail: z.string().describe('1-2 sentence explanation of the program and its requirements'),
          impact: z.string().describe('Quantified impact, e.g. "+37,500 sf buildable" or "35-year tax exemption"'),
        })).describe('NYC development incentive programs relevant to this parcel. Include MIH options if in MIH area, 485-x if eligible, and any other applicable programs.'),
        ceqrThresholds: z.array(z.object({
          name: z.string().describe('Threshold category, e.g. "Residential Units > 200", "Shadow Impact", "Traffic Generation"'),
          triggered: z.boolean(),
          detail: z.string().describe('1 sentence explanation of whether this threshold is likely triggered'),
        })).describe('CEQR environmental review thresholds likely triggered by development at max buildable scale on this parcel'),
        estimatedMaxHeight: z.string().describe('Estimated max building height based on zoning district, e.g. "85 ft / 7 floors". Based on quality housing rules and contextual envelope if applicable.'),
        ...scenarioSchema,
      }),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this parcel at ${address}:\n${JSON.stringify(parcelData, null, 2)}${scenarioPrompt}`,
    })
    interpretation = object.interpretation
    incentives = object.incentives
    ceqrThresholds = object.ceqrThresholds
    estimatedMaxHeight = object.estimatedMaxHeight

    // Merge Gemini interpretations into pre-computed scenarios
    if ('scenarioInterpretations' in object && Array.isArray(object.scenarioInterpretations)) {
      for (const si of object.scenarioInterpretations) {
        const scenario = scenarios.find(s => s.name === si.name)
        if (scenario) scenario.interpretation = si.interpretation
      }
    }
  } catch (err) {
    console.error('Gemini interpretation failed:', err)
  }

  // Parcel polygon geometry from MapPLUTO FeatureServer
  const geometry = geometryResult.status === 'fulfilled' ? geometryResult.value : null

  return Response.json({
    ...parcelData,
    geometry,
    interpretation,
    incentives,
    ceqrThresholds,
    estimatedMaxHeight,
    ...(scenarios.length > 0 ? { scenarios } : {}),
  })
}

// ── PLUTO (Socrata SODA API) ──

async function fetchPLUTO(bbl: string) {
  const token = process.env.NYC_OPENDATA_TOKEN
  const url = new URL(`https://data.cityofnewyork.us/resource/${PLUTO_RESOURCE_ID}.json`)
  // Safe: bbl validated as /^\d{10}$/ by RequestSchema
  url.searchParams.set('$where', `bbl='${bbl}'`)

  const res = await fetch(url.toString(), {
    headers: token ? { 'X-App-Token': token } : {},
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`PLUTO API error: ${res.status}`)
  const data = await res.json()
  if (data.length === 0) throw new Error(`No PLUTO data for BBL ${bbl}`)
  return data[0]
}

// ── FEMA Flood Zone ──

async function fetchFloodZone(lat: number, lng: number) {
  try {
    const url = new URL(
      'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query',
    )
    url.searchParams.set('geometry', `${lng},${lat}`)
    url.searchParams.set('geometryType', 'esriGeometryPoint')
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
    url.searchParams.set('outFields', 'FLD_ZONE,ZONE_SUBTY,SFHA_TF')
    url.searchParams.set('returnGeometry', 'false')
    url.searchParams.set('f', 'json')
    url.searchParams.set('inSR', '4326')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000), // FEMA is notoriously slow
    })
    if (!res.ok) throw new Error(`FEMA HTTP ${res.status}`)
    const data = await res.json()

    if (!data.features?.length) {
      return { floodZone: null, isFloodHazard: false }
    }

    const attrs = data.features[0].attributes
    return {
      floodZone: attrs.FLD_ZONE,
      isFloodHazard: attrs.SFHA_TF === 'T',
    }
  } catch (err) {
    console.warn('FEMA flood zone check failed:', err)
    return { floodZone: null, isFloodHazard: false }
  }
}

// ── DCP GIS Zoning ──

async function fetchZoningGIS(lat: number, lng: number) {
  try {
    const url = new URL(
      'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nyzd/FeatureServer/0/query',
    )
    url.searchParams.set('geometry', `${lng},${lat}`)
    url.searchParams.set('geometryType', 'esriGeometryPoint')
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
    url.searchParams.set('outFields', 'ZONEDIST')
    url.searchParams.set('returnGeometry', 'false')
    url.searchParams.set('f', 'json')
    url.searchParams.set('inSR', '4326')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`DCP GIS HTTP ${res.status}`)
    const data = await res.json()

    if (!data.features?.length) return null

    return {
      zoningDistrict: data.features[0].attributes.ZONEDIST,
    }
  } catch (err) {
    console.warn('DCP GIS zoning check failed:', err)
    return null
  }
}

// ── DCP MIH (Mandatory Inclusionary Housing) ──

async function fetchMIH(lat: number, lng: number) {
  try {
    const url = new URL(
      'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycmih/FeatureServer/0/query',
    )
    url.searchParams.set('geometry', `${lng},${lat}`)
    url.searchParams.set('geometryType', 'esriGeometryPoint')
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
    url.searchParams.set('outFields', 'PROJECTNAM,MIH_Option')
    url.searchParams.set('returnGeometry', 'false')
    url.searchParams.set('f', 'json')
    url.searchParams.set('inSR', '4326')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { mihArea: null, mihBonusFAR: null }
    const data = await res.json()

    if (!data.features?.length) return { mihArea: null, mihBonusFAR: null }

    const attrs = data.features[0].attributes
    return {
      mihArea: attrs.MIH_Option || attrs.PROJECTNAM || 'MIH Designated',
      mihBonusFAR: null, // MIH bonus FAR varies by option; Gemini interprets
    }
  } catch (err) {
    console.warn('MIH layer check failed:', err)
    return { mihArea: null, mihBonusFAR: null }
  }
}

// ── MapPLUTO Parcel Geometry (ArcGIS FeatureServer) ──

async function fetchParcelGeometry(bbl: string): Promise<GeoJSON.Geometry | null> {
  try {
    const url = new URL(
      'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query',
    )
    // Safe: bbl validated as /^\d{10}$/ by RequestSchema
    url.searchParams.set('where', `bbl='${bbl}'`)
    url.searchParams.set('outFields', 'BBL')
    url.searchParams.set('returnGeometry', 'true')
    url.searchParams.set('outSR', '4326')
    url.searchParams.set('f', 'geojson')
    url.searchParams.set('resultRecordCount', '1')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`MapPLUTO HTTP ${res.status}`)
    const data = await res.json()

    if (!data.features?.length) return null
    return data.features[0].geometry ?? null
  } catch (err) {
    console.warn('MapPLUTO geometry fetch failed:', err)
    return null
  }
}
