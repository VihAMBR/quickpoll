import { Loader2 } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      <p className="text-sm text-zinc-400">Loading...</p>
    </div>
  )
}
