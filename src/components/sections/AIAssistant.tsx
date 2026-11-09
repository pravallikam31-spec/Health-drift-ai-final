import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Bot, ShieldCheck, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const capabilities = [
  "Understand tracked sleep, nutrition, hydration, activity, and medication records.",
  "Explain available trends and clearly identify missing or incomplete data.",
  "Offer practical wellness suggestions without diagnosing or changing treatment.",
];

export function AIAssistant() {
  return (
    <section id="assistant" className="relative overflow-hidden px-6 py-24 md:py-36">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-12">
        <motion.div
          className="md:col-span-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[10px] uppercase tracking-[0.28em] text-primary">
            05 · Personal wellness support
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-tight">
            Your health data, <span className="text-aurora">explained clearly.</span>
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
            Ask questions about your own tracked wellness data. The assistant uses relevant records
            from your signed-in account, notes when information is missing, and offers non-clinical
            guidance—not a diagnosis or a substitute for professional care.
          </p>
          <Link
            to="/ai-assistant"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            <Bot size={17} aria-hidden="true" />
            Open AI Health Assistant
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.div>

        <motion.div
          className="md:col-span-6"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <GlassCard strong glow="violet" className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/30 text-cyan-200">
                <Sparkles size={20} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-lg">Built around your records</h3>
                <p className="text-xs text-muted-foreground">
                  Only available, relevant context is used
                </p>
              </div>
            </div>
            <ul className="space-y-4">
              {capabilities.map((capability, index) => {
                const Icon = index === 2 ? ShieldCheck : Activity;
                return (
                  <li key={capability} className="flex gap-3 text-sm leading-6 text-foreground/85">
                    <Icon size={17} className="mt-1 shrink-0 text-cyan-200" aria-hidden="true" />
                    {capability}
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
