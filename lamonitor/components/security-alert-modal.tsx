import { useState, useEffect } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface SecurityAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAlertComplete: () => void
}

export function SecurityAlertModal({
  open,
  onOpenChange,
  onAlertComplete,
}: SecurityAlertModalProps) {
  const [status, setStatus] = useState<"calling" | "alerted">("calling")

  useEffect(() => {
    if (open && status === "calling") {
      const timer = setTimeout(() => {
        setStatus("alerted")
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [open, status])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">
            {status === "calling" ? "Calling Security..." : "Security Alerted!"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8">
          {status === "calling" ? (
            <Loader2 className="h-12 w-12 animate-spin text-deck-signal" />
          ) : (
            <ShieldCheck className="h-12 w-12 text-deck-ok" />
          )}
        </div>
        <DialogFooter>
          {status === "alerted" && (
            <button
              onClick={() => {
                onAlertComplete()
                onOpenChange(false)
                setStatus("calling") // Reset for next time
              }}
              className="deck-btn deck-btn--primary w-full justify-center"
            >
              Close
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
