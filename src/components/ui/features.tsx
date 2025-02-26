import { BarChart3, Globe2, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Real-time Updates",
    description: "See votes appear instantly as they're cast. No need to refresh the page."
  },
  {
    icon: <Globe2 className="h-6 w-6" />,
    title: "Easy Sharing",
    description: "Share your poll with a simple link. Works everywhere, on any device."
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Live Analytics",
    description: "Get instant insights with beautiful charts and percentage breakdowns."
  }
]

export function Features() {
  return (
    <div className="container py-16">
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="p-2 w-fit rounded-lg bg-muted text-muted-foreground">
                {feature.icon}
              </div>
              <CardTitle className="mt-4 text-foreground">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
