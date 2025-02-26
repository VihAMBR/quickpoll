import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "How do I create a poll?",
    answer:
      "Creating a poll is easy! Just sign in, click the 'Create Poll' button, enter your question and options, and you're done!",
  },
  {
    question: "Can I share my poll on social media?",
    answer:
      "Once you've created your poll, you'll get a unique link that you can share anywhere, including social media platforms.",
  },
  {
    question: "Is QuickPoll free to use?",
    answer:
      "Yes, QuickPoll offers a free plan with basic features. We also have premium plans for users who need advanced analytics and customization options.",
  },
  {
    question: "How long can I keep my polls active?",
    answer:
      "With our free plan, polls remain active for 7 days. Premium users can set custom durations or keep polls active indefinitely.",
  },
]

export function FAQ() {
  return (
    <section className="w-full py-12 md:py-24 bg-secondary/50">
      <div className="container">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto divide-y">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b-0 px-4">
              <AccordionTrigger className="hover:no-underline hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
