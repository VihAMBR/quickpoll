import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center py-16">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl xl:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
          Create Interactive Polls
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl mx-auto">
          Engage your audience in real-time with instant voting and live results. Perfect for meetings, classrooms, or any interactive session.
        </p>
      </div>
      <div className="flex flex-col gap-4 min-[400px]:flex-row justify-center">
        <Button size="lg" className="min-w-[160px]">
          Create a Poll
        </Button>
        <Button size="lg" variant="outline" className="min-w-[160px]">
          View Demo
        </Button>
      </div>
    </div>
  )
}
