// src/pages/FAQ.tsx

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Do you offer delivery?",
    answer:
      "Yes, we deliver within Lagos and to other Nigerian states. Delivery fees are based on your location and distance, and delivery time depends on where you are.",
  },
  {
    question: "Can I pick up my order in person?",
    answer:
      "Yes, pickup is available at our shop: Shop 26, Fesrach Plaza, Back of BRT, Ikotun, Lagos State, Nigeria. You can choose pickup at checkout.",
  },
  {
    question: "What is your return or replacement policy?",
    answer:
      "We offer replacements rather than cash refunds. If a wrong part or model was delivered, or you need a replacement for another valid reason, get in touch within 24 hours of receiving your order. The item must still be in good condition, and the customer covers return shipping. Replacements are typically issued within 24 hours once we receive the returned item. Please note that a screen delivered in good condition cannot be returned or refunded once it has been installed or tested.",
  },
  {
    question: "What if I ordered the wrong part myself?",
    answer:
      "That's covered under the same replacement policy above — reach out within 24 hours and we'll help sort out the correct part, as long as the original item is still in good condition and unused.",
  },
  {
    question: "What kind of products do you sell?",
    answer:
      "Phone screens, phone accessories, soldering tools, charging ports, phone speakers & earpieces, touch pads, camera glass, SIM trays, power flexes, screen gum & paste, soldering bits, mouthpieces, leads, iPhone back glass, iPhone down screws, and downboard panels.",
  },
  {
    question: "What are your opening hours?",
    answer: "We're open daily from 8:30am to 7:00pm.",
  },
  {
    question: "How do I get in touch?",
    answer:
      "Call or WhatsApp us on 0706 556 1461, or email Cosmophoneparts@gmail.com. Full contact details are on our Contact page.",
  },
];

export default function FAQ() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Frequently Asked Questions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Answers to common questions about delivery, pickup, and our
        replacement policy.
      </p>

      <Accordion type="single" collapsible className="mt-8 flex w-full flex-col gap-2">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="rounded-xl border border-border px-4"
          >
            <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
