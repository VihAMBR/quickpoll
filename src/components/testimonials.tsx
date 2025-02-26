import Image from "next/image"

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Marketing Manager",
    content:
      "QuickPoll has revolutionized our decision-making process. It's fast, easy, and gives us instant insights.",
    avatar: "/placeholder.svg",
  },
  {
    name: "Alex Chen",
    role: "Event Organizer",
    content: "I use QuickPoll for all my events. It's a game-changer for gathering attendee preferences quickly.",
    avatar: "/placeholder.svg",
  },
  {
    name: "Emily Brown",
    role: "Teacher",
    content: "QuickPoll makes it so easy to engage my students and get their opinions on various topics.",
    avatar: "/placeholder.svg",
  },
]

export function Testimonials() {
  return (
    <section className="flex flex-col items-center py-12 md:py-24">
      <div className="max-w-[980px] mx-auto text-center">
        <h2 className="mb-12 text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          What Our Users Say
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="group relative overflow-hidden rounded-xl bg-background/50 p-6 shadow-sm transition-all hover:shadow-lg hover:bg-background">
              <div className="relative">
                <div className="mb-4 flex justify-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/10">
                    <Image
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <p className="mb-2 text-lg font-semibold">{testimonial.name}</p>
                <p className="mb-4 text-sm text-muted-foreground">{testimonial.role}</p>
                <p className="text-muted-foreground italic">"{testimonial.content}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
