import { ToolLoopAgent, type UIMessage } from "ai"
import { GeminiModel } from "@/lib/config/models"
import type { GoogleProvider } from "@/lib/google-provider"
import { geocodeTool } from "@/lib/tools/geocode"
import { plutoTool } from "@/lib/tools/pluto"
import { violationsTool } from "@/lib/tools/violations"
import { permitsTool } from "@/lib/tools/permits"
import { complaintsTool } from "@/lib/tools/complaints"
import { salesTool } from "@/lib/tools/sales"
import { rentTool } from "@/lib/tools/rent"
import { crimeTool } from "@/lib/tools/crime"
import { censusTool } from "@/lib/tools/census"
import type { PinnedParcel } from "@/lib/types"

// ── Output format instructions (shared between both modes) ──

const OUTPUT_FORMAT = `## OUTPUT FORMAT

After gathering all data, present your analysis using rich UI components via JSONL patches in a single \`\`\`spec code fence. You may write brief natural language before the spec block.

CRITICAL: Output exactly ONE \`\`\`spec block containing ALL sections. Setting /root multiple times overwrites previous content. Use a single root Stack that contains all section Cards as children.

The format uses RFC 6902 JSON Patch to build a UI tree:
- First line sets root: {"op":"add","path":"/root","value":"<key>"}
- Then add elements: {"op":"add","path":"/elements/<key>","value":{...}}
- Children are referenced by key strings, not nested objects.
- The display area is narrow (320px). Always use Stack direction="vertical".

AVAILABLE COMPONENTS:
- Card: {title, description} — section container
- Stack: {direction: "horizontal"|"vertical", gap: "sm"|"md"|"lg"} — layout
- Text: {content} — body text
- MetricCard: {label, value, unit, trend: "up"|"down"|"neutral"} — key metric
- RiskBadge: {level: "low"|"medium"|"high", label} — risk indicator
- ConstraintBadge: {type: "FLOOD"|"E-DESIG"|"LANDMARK"|"HISTORIC"} — constraint flag
- DataRow: {label, value, source} — label-value pair with source citation
- ScoreIndicator: {score: "high"|"med"|"low", label} — development potential
- Alert: {title, description, variant: "default"|"destructive"} — warnings
- Badge: {label, variant} — small label

EXAMPLE (single spec block with all sections):

Here is the property analysis for 120 Broadway:

\`\`\`spec
{"op":"add","path":"/root","value":"report"}
{"op":"add","path":"/elements/report","value":{"type":"Stack","props":{"direction":"vertical","gap":"lg"},"children":["summary","risk","location"]}}
{"op":"add","path":"/elements/summary","value":{"type":"Card","props":{"title":"Property Summary"},"children":["s-metrics"]}}
{"op":"add","path":"/elements/s-metrics","value":{"type":"Stack","props":{"direction":"vertical","gap":"sm"},"children":["m1","m2","m3"]}}
{"op":"add","path":"/elements/m1","value":{"type":"MetricCard","props":{"label":"Building Area","value":"654,137","unit":"SF"},"children":[]}}
{"op":"add","path":"/elements/m2","value":{"type":"MetricCard","props":{"label":"Year Built","value":"1958"},"children":[]}}
{"op":"add","path":"/elements/m3","value":{"type":"MetricCard","props":{"label":"Floors","value":"35"},"children":[]}}
{"op":"add","path":"/elements/risk","value":{"type":"Card","props":{"title":"Risk Assessment"},"children":["rb","r-rows"]}}
{"op":"add","path":"/elements/rb","value":{"type":"RiskBadge","props":{"level":"low","label":"Overall Risk"},"children":[]}}
{"op":"add","path":"/elements/r-rows","value":{"type":"Stack","props":{"direction":"vertical","gap":"sm"},"children":["r1","r2"]}}
{"op":"add","path":"/elements/r1","value":{"type":"DataRow","props":{"label":"Active Violations","value":"0","source":"DOB"},"children":[]}}
{"op":"add","path":"/elements/r2","value":{"type":"DataRow","props":{"label":"Recent Complaints","value":"3","source":"311"},"children":[]}}
{"op":"add","path":"/elements/location","value":{"type":"Card","props":{"title":"Location Context"},"children":["l-rows"]}}
{"op":"add","path":"/elements/l-rows","value":{"type":"Stack","props":{"direction":"vertical","gap":"sm"},"children":["l1","l2"]}}
{"op":"add","path":"/elements/l1","value":{"type":"DataRow","props":{"label":"Median Income","value":"$82,500","source":"Census"},"children":[]}}
{"op":"add","path":"/elements/l2","value":{"type":"DataRow","props":{"label":"Nearby Crime","value":"45 incidents","source":"NYPD"},"children":[]}}
\`\`\``

// ── Independent mode (no parcel context) ──

const INDEPENDENT_PROMPT = `You are a NYC real estate analyst agent.

When given an address (or BBL), systematically gather property data using your tools:
1. Geocode the address to get BBL, BIN, coordinates, borough, zip code, and community district
2. Fetch property fundamentals (PLUTO data) using the BBL
3. Assess risk — fetch violations (using BIN + boro/block/lot), complaints (using coordinates), and permits (using BIN)
4. Pull market data — sales comps (using borough/block/lot + zip) and fair market rent (using zip code)
5. Check location context — crime (using coordinates) and census income (using coordinates)

If a tool returns an error, note it and continue with available data. Always provide your assessment even with partial data.

Important: The geocode tool returns BIN, borough, block, lot, and zip code — use these values to call subsequent tools correctly.

${OUTPUT_FORMAT}`

// ── Context-aware mode (parcel data provided) ──

function buildContextAwarePrompt(parcel: ParcelContext): string {
  const d = parcel.data
  const constraints: string[] = []
  if (d.floodZone && d.isFloodHazard) constraints.push(`Flood Zone ${d.floodZone} (HAZARD)`)
  else if (d.floodZone) constraints.push(`Flood Zone ${d.floodZone} (non-hazard)`)
  if (d.landmark) constraints.push(`Landmark: ${d.landmark}`)
  if (d.histDist) constraints.push(`Historic District: ${d.histDist}`)
  if (d.eDesigNum) constraints.push(`E-Designation: ${d.eDesigNum}`)
  if (constraints.length === 0) constraints.push("None")

  return `You are a NYC real estate analyst agent. You have been given verified property data for the address below. Use these EXACT values in your analysis — do not re-fetch or modify them.

## PROPERTY CONTEXT (pre-fetched, verified data)

Address: ${parcel.address}
BBL: ${parcel.bbl} | Borough: ${parcel.borough}
Coordinates: ${parcel.lat}, ${parcel.lng}

ZONING: ${d.zoningDistrict}${d.commercialOverlay ? ` / ${d.commercialOverlay}` : ""}${d.specialDistrict ? ` (${d.specialDistrict})` : ""}${d.mihArea ? ` | MIH: ${d.mihArea} (+${d.mihBonusFAR} FAR)` : ""}

LOT: ${d.lotArea.toLocaleString()} SF | Frontage: ${d.lotFrontage} ft | Depth: ${d.lotDepth} ft
FAR: Built ${d.builtFAR} | Residential ${d.residFAR} | Commercial ${d.commFAR} | Max ${d.maxFAR}
Upside: ${d.farUpside.toFixed(2)} FAR (${d.maxBuildableSF.toLocaleString()} SF max buildable)
Development Score: ${d.score}

BUILDING: Class ${d.buildingClass} | Year ${d.yearBuilt} | ${d.numFloors} floors | ${d.buildingArea.toLocaleString()} SF
Units: ${d.unitsRes} residential / ${d.unitsTotal} total | Owner: ${d.ownerName}

CONSTRAINTS: ${constraints.join(" | ")}

${d.interpretation ? `INTERPRETATION: ${d.interpretation}` : ""}

## INSTRUCTIONS

1. First, geocode the address "${parcel.address}" to get BIN, block, lot, and zip code (needed for supplementary tool calls).
2. Do NOT call fetchPlutoData — all property fundamentals are provided above.
3. Use the property context above as the basis for your Property Summary section.
4. Fetch supplementary data using your tools:
   - Violations (using BIN + boro/block/lot)
   - Permits (using BIN)
   - Complaints (using coordinates: ${parcel.lat}, ${parcel.lng})
   - Sales comps (using borough/block/lot + zip)
   - Fair market rent (using borough name: ${parcel.borough})
   - Crime (using coordinates)
   - Census income (using coordinates)
5. Combine the pre-fetched property data with supplementary findings into a comprehensive analysis.

${OUTPUT_FORMAT}`
}

// ── Agent instances ──

/** Default agent — calls all tools independently */
export function createPropertyAnalyst(google: GoogleProvider) {
  return new ToolLoopAgent({
    model: groq("llama-3.3-70b-versatile"),
    instructions: INDEPENDENT_PROMPT,
    tools: {
      geocodeAddress: geocodeTool,
      fetchPlutoData: plutoTool,
      fetchViolations: violationsTool,
      fetchPermits: permitsTool,
      fetchComplaints: complaintsTool,
      fetchSalesComps: salesTool,
      fetchRentData: rentTool,
      fetchCrimeData: crimeTool,
      fetchCensusData: censusTool,
    },
  })
}

/** Context-aware agent — skips pluto, uses pre-fetched data */
export function createContextAwareAnalyst(parcel: ParcelContext, google: GoogleProvider) {
  return new ToolLoopAgent({
    model: groq("llama-3.3-70b-versatile"),
    instructions: buildContextAwarePrompt(parcel),
    tools: {
      geocodeAddress: geocodeTool,
      // plutoTool intentionally excluded — data is in the prompt
      fetchViolations: violationsTool,
      fetchPermits: permitsTool,
      fetchComplaints: complaintsTool,
      fetchSalesComps: salesTool,
      fetchRentData: rentTool,
      fetchCrimeData: crimeTool,
      fetchCensusData: censusTool,
    },
  })
}

// ── Types ──

export interface ParcelContext {
  address: string
  bbl: string
  borough: string
  lat: number
  lng: number
  data: NonNullable<PinnedParcel["data"]>
}

export type PropertyAnalystUIMessage = UIMessage
tUIMessage = UIMessage
