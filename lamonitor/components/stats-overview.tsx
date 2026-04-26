import { Camera } from "lucide-react"
import { getSystemStats } from "@/lib/data"

export function StatsOverview() {
  const stats = getSystemStats();
  
  return (
    <div className="border-b border-deck-line p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 deck-label">
          <Camera className="h-4 w-4" />
          <span>Cameras</span>
        </div>
        <p className="deck-num text-2xl font-extrabold text-deck-fg">
          {stats.totalCameras}{" "}
          <span className="text-[13px] font-bold text-deck-dim">/ {stats.onlineCameras} online</span>
        </p>
      </div>
    </div>
  )
}
