import { BarChart3, Share2, Zap } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Create Polls Instantly",
    description: "No hassle, just enter your question and options.",
  },
  {
    icon: Share2,
    title: "Share with Anyone",
    description: "Easily distribute your poll via a link.",
  },
  {
    icon: BarChart3,
    title: "Get Real-Time Results",
    description: "See live updates as votes come in.",
  },
]

export function FeaturesSection() {
  return (
    <section className="flex flex-col items-center py-12 md:py-24">
      <div className="max-w-[980px] mx-auto text-center">
        <h2 className="mb-12 text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Why Use QuickPoll?
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="group relative overflow-hidden rounded-lg border bg-background p-6 transition-shadow hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-600/5 dark:from-blue-400/10 dark:to-blue-400/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
