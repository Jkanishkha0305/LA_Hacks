'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { useParcelState, useParcelDispatch } from '@/lib/parcel-context'
import { formatNumber, formatSF, formatFAR, formatFARDelta } from '@/lib/format'
import { getConstraints } from './constraint-tag'
import { ReportSection } from './report-section'
import { DataRow } from './report-data-row'
import { IncentiveCard } from './incentive-card'
import { useReportGeneration } from '@/hooks/use-report-generation'
import { buildArtifactFromParcel, getParcelReportFilename } from '@/lib/parcel-to-artifact'
import type { PinnedParcel, DevelopmentScenario } from '@/lib/types'

const SCORE_LABELS = {
  high: { text: 'High Potential', className: 'text-score-high bg-score-high/10' },
  med: { text: 'Medium Potential', className: 'text-score-med bg-score-med/10' },
  low: { text: 'Low Potential', className: 'text-score-low bg-score-low/10' },
} as const

export function ParcelReport() {
  const { selectedBBL, parcels } = useParcelState()
  const dispatch = useParcelDispatch()

  const parcel = parcels.find(p => p.bbl === selectedBBL)
  if (!parcel || !parcel.data) return null

  const data = parcel.data
  const constraints = getConstraints(data)
  const readyParcels = parcels.filter(p => p.status === 'ready')
  const currentIndex = readyParcels.findIndex(p => p.bbl === selectedBBL)
  const report = useReportGeneration()

  // Scenario state — null means as-of-right (base data)
  const [activeScenario, setActiveScenario] = useState<number | null>(null)
  useEffect(() => setActiveScenario(null), [selectedBBL])

  const scenarios = data.scenarios ?? []
  const scenario = activeScenario !== null ? scenarios[activeScenario] ?? null : null
  const displayFAR = scenario?.maxFAR ?? data.maxFAR
  const displayBuildableSF = scenario?.maxBuildableSF ?? data.maxBuildableSF
  const displayInterpretation = (scenario?.interpretation || null) ?? data.interpretation

  const handleBack = () => dispatch({ type: 'DESELECT_PARCEL' })

  const handlePrev = () => {
    if (currentIndex > 0) {
      dispatch({ type: 'SELECT_PARCEL', bbl: readyParcels[currentIndex - 1]!.bbl })
    }
  }

  const handleNext = () => {
    if (currentIndex < readyParcels.length - 1) {
      dispatch({ type: 'SELECT_PARCEL', bbl: readyParcels[currentIndex + 1]!.bbl })
    }
  }

  const scoreLabel = SCORE_LABELS[data.score]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={report.isGenerating}
                onClick={() => {
                  const artifact = buildArtifactFromParcel(parcel)
                  if (artifact) report.generate(artifact, getParcelReportFilename(parcel))
                }}
                className="gap-1.5"
              >
                {report.isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                {report.isGenerating
                  ? `Generating... (${report.elapsedSeconds}s)`
                  : 'Export Report'}
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-xs" onClick={handlePrev} disabled={currentIndex <= 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {currentIndex + 1} / {readyParcels.length}
                </span>
                <Button variant="ghost" size="icon-xs" onClick={handleNext} disabled={currentIndex >= readyParcels.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {report.error && (
            <div className="text-[10px] text-destructive mb-2">
              {report.error}
              <button onClick={report.clearError} className="ml-2 underline">Dismiss</button>
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">{parcel.address}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            BBL {parcel.bbl} · {parcel.borough}
          </p>
        </div>

        {/* Scenario Toggle Bar (MIH parcels only) */}
        {scenarios.length > 0 && (
          <ScenarioToggleBar
            scenarios={scenarios}
            activeScenario={activeScenario}
            onSelect={setActiveScenario}
          />
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 @xl:grid-cols-4 gap-3 mb-6" key={`metrics-${activeScenario}`} style={{ animation: 'fadeIn 150ms ease-in' }}>
          <MetricCard label="Zoning" value={data.zoningDistrict} />
          <MetricCard
            label={scenario ? scenario.name : data.mihArea ? 'Max FAR (MIH)' : 'Max FAR'}
            value={formatFAR(displayFAR)}
          />
          <MetricCard label="Buildable SF" value={formatNumber(displayBuildableSF)} />
          <MetricCard label="Max Height" value={data.estimatedMaxHeight || '—'} />
        </div>

        {/* Score Badge */}
        <div className="mb-6">
          <span className={`inline-block text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded ${scoreLabel.className}`}>
            {scoreLabel.text}
          </span>
        </div>

        {/* Agent Analysis */}
        <div className="bg-card border-l-2 border-primary rounded-xl p-5 mb-6" key={`analysis-${activeScenario}`} style={{ animation: 'fadeIn 150ms ease-in' }}>
          <h3 className="text-xs font-mono font-semibold text-primary uppercase mb-2">
            AI Analysis{scenario ? ` — ${scenario.name}` : ''}
          </h3>
          <p className="text-sm text-foreground leading-relaxed">{displayInterpretation}</p>
        </div>

        {/* 01 Development Potential */}
        <ReportSection number="01" title="Development Potential" subtitle={scenario ? `${scenario.name} scenario` : 'What you can build on this parcel'}>
          <DataRow label="Base FAR (Residential)" value={data.residFAR} formatAs="far" source="PLUTO 25v4" />
          <DataRow label="Base FAR (Commercial)" value={data.commFAR} formatAs="far" source="PLUTO 25v4" />
          <DataRow label="Max FAR (Effective)" value={displayFAR} formatAs="far" source={scenario ? 'ZR §23-154' : 'calculated'} highlight />
          {scenario && (
            <DataRow label="MIH Bonus FAR" value={formatFARDelta(scenario.mihBonusFAR)} source={scenario.isAIEstimate ? 'AI estimate' : 'ZR §23-154'} />
          )}
          {!scenario && data.mihBonusFAR != null && (
            <DataRow label="MIH Bonus FAR" value={data.mihBonusFAR} formatAs="far" source="ZR §23-154" />
          )}
          <DataRow label="Lot Area" value={data.lotArea} formatAs="sf" source="PLUTO 25v4" />
          <DataRow label="Max Buildable SF" value={displayBuildableSF} formatAs="sf" source={scenario ? 'ZR §23-154' : 'calculated'} highlight />
          <DataRow label="FAR Upside" value={formatFARDelta(displayFAR - data.builtFAR)} source="calculated" highlight={(displayFAR - data.builtFAR) > 2} />
          {data.estimatedMaxHeight && (
            <DataRow label="Est. Max Height" value={data.estimatedMaxHeight} source="AI estimate" />
          )}
          {scenario && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Unit Breakdown</div>
              <DataRow label="Estimated Units" value={`~${formatNumber(scenario.estimatedUnits)}`} source={scenario.isAIEstimate ? 'AI estimate' : 'calculated'} />
              <DataRow label="Market-Rate Units" value={`~${formatNumber(scenario.marketRateUnits)}`} source="calculated" />
              <DataRow label="Affordable Units" value={`~${formatNumber(scenario.affordableUnits)}`} source="calculated" highlight />
              <DataRow label="Affordability Req." value={scenario.affordabilityReq} source="ZR §23-154" />
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Estimates assume 850 SF avg unit size, 80% gross-to-net efficiency. Verify with project architect.
              </p>
            </div>
          )}
        </ReportSection>

        {/* 02 Incentives & Programs */}
        <ReportSection number="02" title="Incentives & Programs" subtitle="Applicable development incentive programs">
          {data.incentives && data.incentives.length > 0 ? (
            data.incentives.map((incentive) => (
              <IncentiveCard key={incentive.name} {...incentive} />
            ))
          ) : (
            <div className="text-xs text-muted-foreground py-2">
              {data.mihArea
                ? `MIH area: ${data.mihArea}. Detailed incentive analysis requires AI interpretation.`
                : 'No applicable incentive programs identified.'}
            </div>
          )}
        </ReportSection>

        {/* 03 Constraints & Flags */}
        <ReportSection number="03" title="Constraints & Flags" subtitle="Regulatory and environmental constraints">
          <ConstraintRow label="Flood Zone" status={data.isFloodHazard} detail={data.floodZone || 'Not in FEMA flood area'} />
          <ConstraintRow label="E-Designation" status={!!data.eDesigNum} detail={data.eDesigNum || 'No environmental designation'} />
          <ConstraintRow label="Landmark" status={!!data.landmark} detail={data.landmark || 'No landmark designation'} />
          <ConstraintRow label="Historic District" status={!!data.histDist} detail={data.histDist || 'Not in historic district'} />
        </ReportSection>

        {/* 04 CEQR Environmental Review */}
        <ReportSection number="04" title="Environmental Review (CEQR)" subtitle="Thresholds likely triggered by development at this scale">
          {data.ceqrThresholds && data.ceqrThresholds.length > 0 ? (
            data.ceqrThresholds.map((threshold) => (
              <ConstraintRow
                key={threshold.name}
                label={threshold.name}
                status={threshold.triggered}
                detail={threshold.detail}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              CEQR threshold analysis requires AI interpretation. Verify with environmental counsel.
            </p>
          )}
        </ReportSection>

        {/* 05 Existing Conditions */}
        <ReportSection number="05" title="Existing Conditions" subtitle="Current state of the parcel">
          <DataRow label="Building Class" value={data.buildingClass} source="PLUTO 25v4" />
          <DataRow label="Year Built" value={data.yearBuilt || '—'} source="PLUTO 25v4" />
          <DataRow label="Current FAR" value={data.builtFAR} formatAs="far" source="PLUTO 25v4" />
          <DataRow label="Number of Floors" value={data.numFloors} source="PLUTO 25v4" />
          <DataRow label="Residential Units" value={data.unitsRes} formatAs="number" source="PLUTO 25v4" />
          <DataRow label="Total Units" value={data.unitsTotal} formatAs="number" source="PLUTO 25v4" />
          <DataRow label="Building Area" value={data.buildingArea} formatAs="sf" source="PLUTO 25v4" />
          <DataRow label="Unused FAR" value={formatFARDelta(data.farUpside)} source="calculated" highlight />
          <DataRow label="Owner" value={data.ownerName} source="PLUTO 25v4" />
        </ReportSection>

        {/* Disclaimer */}
        <div className="text-[10px] text-muted-foreground/60 mt-6 mb-4 leading-relaxed">
          <p>
            Sources: PLUTO 25v4 (NYC Dept. of City Planning), DCP GIS, FEMA NFHL.
            Agent Analysis is AI-generated by Gemini and may contain inaccuracies.
            Incentives and CEQR thresholds are AI-interpreted — verify with zoning counsel before relying on these assessments.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg border border-white/5 p-3">
      <div className="text-[10px] text-muted-foreground uppercase font-mono mb-1">{label}</div>
      <div className="text-sm font-bold font-mono truncate">{value}</div>
    </div>
  )
}

function ScenarioToggleBar({
  scenarios,
  activeScenario,
  onSelect,
}: {
  scenarios: DevelopmentScenario[]
  activeScenario: number | null
  onSelect: (index: number | null) => void
}) {
  const hasAIEstimate = scenarios.some(s => s.isAIEstimate)

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-card rounded-lg border border-white/5">
        <button
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
            activeScenario === null
              ? 'bg-foreground text-background font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
        >
          As-of-Right
        </button>
        {scenarios.map((s, i) => (
          <button
            key={s.name}
            onClick={() => onSelect(i)}
            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
              activeScenario === i
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
        MIH scenarios show bonus FAR granted in exchange for affordable unit requirements.
        {hasAIEstimate && ' Some values are AI estimates — verify with zoning counsel.'}
      </p>
    </div>
  )
}

function ConstraintRow({ label, status, detail }: { label: string; status: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-xs text-foreground">{detail}</span>
    </div>
  )
}
