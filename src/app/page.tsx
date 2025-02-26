import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { Testimonials } from "@/components/testimonials"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navigation />
      <div className="px-8 md:px-12 lg:px-16">
        <HeroSection />
        <FeaturesSection />
        <Testimonials />
      </div>
      <FAQ />
      <div className="px-8 md:px-12 lg:px-16">
        <Footer />
      </div>
    </main>
  )
}
