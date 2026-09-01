import { Link } from "wouter";
import { ArrowRight, CheckCircle, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";

export default function Girls() {
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <SEO
        title="Girls & Mother-Daughter Training | Ground Up Oxnard"
        description="Explore Ground Up's girls and female-youth training path in Oxnard. Ask about current eligibility, beginner-friendly classes, and mother-daughter options."
        canonical="/girls"
      />
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">Girls / Mother + Daughter · Oxnard</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-7xl">
            Build strength, skill, and confidence <span className="text-[#5EEBFF]">together.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-gray-300">
            Ground Up is a women-only training center. When youth programming is available, it is for girls and female youth—not a generic mixed-gender kids program.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-[#FFB199] font-bold uppercase tracking-wider text-[#0B0F14] hover:bg-[#FFB199]/90">
              <Link href="/book">Book a free first visit <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-white hover:bg-white/5">
              <Link href="/contact">Ask about eligibility</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {[
            { icon: Shield, title: "Girls / female youth", text: "A clear, women-centered path for young athletes when the youth program is open." },
            { icon: Users, title: "Mother + daughter", text: "Ask how participation works, including class placement and guardian requirements." },
            { icon: CheckCircle, title: "Beginner-friendly", text: "No prior martial arts experience is required to start a conversation about fit." },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-[#121826] p-6">
              <Icon className="h-6 w-6 text-[#5EEBFF]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{text}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[#B06CFF]/20 bg-[#B06CFF]/5 p-6 text-sm leading-relaxed text-gray-300">
          Youth eligibility and age range are confirmed before booking so families receive accurate guidance. Please contact Ground Up if you are booking for a minor; a guardian pathway and consent may be required.
        </div>
      </section>
    </main>
  );
}