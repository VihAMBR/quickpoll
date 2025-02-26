import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  className?: string;
  showText?: boolean;
}

export function LoadingSpinner({ className, showText = true }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className={className || "h-8 w-8 animate-spin text-zinc-400"} />
      {showText && <p className="text-sm text-zinc-400">Loading...</p>}
    </div>
  )
}
