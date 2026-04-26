import { Badge } from '@workspace/ui/components/badge'
import type { ParcelData } from '@/lib/types'

export type ConstraintType = 'FLOOD' | 'E-DESIG' | 'LANDMARK' | 'HISTORIC'

const CONSTRAINT_STYLES: Record<ConstraintType, string> = {
  FLOOD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'E-DESIG': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  LANDMARK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  HISTORIC: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export function ConstraintTag({ type }: { type: ConstraintType }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-[10px] uppercase px-1.5 py-0 ${CONSTRAINT_STYLES[type]}`}
    >
      {type}
    </Badge>
  )
}

export function getConstraints(data: ParcelData): ConstraintType[] {
  const constraints: ConstraintType[] = []
  if (data.isFloodHazard) constraints.push('FLOOD')
  if (data.eDesigNum) constraints.push('E-DESIG')
  if (data.landmark) constraints.push('LANDMARK')
  if (data.histDist) constraints.push('HISTORIC')
  return constraints
}
