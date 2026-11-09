import { motion } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { HeartbeatLine } from "./HeartbeatLine";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden pt-32 pb-20">
      {/* DNA spine is rendered globally via DNASpineBackground */}
      <div className="absolute inset-0 -z-[1] bg-gradient-to-r from-background via-background/70 to-transparent md:from-background/90 md:via-background/30" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-12">
        <div className="md:col-span-7 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full glass px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
            Predictive Diagnostics · v3.4
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease, delay: 0.1 }}
            className="font-display text-[clamp(2.5rem,6.5vw,5.5rem)] font-light leading-[0.95] tracking-tight"
          >
            Predict your
            <br />
            <span className="text-aurora font-medium">future health</span>
            <br />
            <span className="text-foreground/70">before symptoms begin.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.3 }}
            className="mt-8 max-w-xl text-base md:text-lg leading-relaxed text-muted-foreground"
          >
            Nexus reads your biology in real time — genomic markers, wearable signals, and
            continuous biometrics — to forecast chronic disease risk{" "}
            <span className="text-foreground/90">months, sometimes years</span>, before the first
            symptom appears.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <GlowButton>
              Begin diagnostic scan
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h12m0 0L8 2m5 5L8 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </GlowButton>
            <GlowButton variant="ghost">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/30">
                <svg width="7" height="7" viewBox="0 0 7 7">
                  <path d="M1 0v7l6-3.5z" fill="currentColor" />
                </svg>
              </span>
              Watch the science
            </GlowButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.9 }}
            className="mt-14 grid grid-cols-3 gap-6 max-w-lg"
          >
            {[
              { k: "97.4%", v: "Prediction accuracy" },
              { k: "14 mo", v: "Median lead time" },
              { k: "2.1M", v: "Lives monitored" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-2xl text-foreground">{s.k}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating cards */}
        <div className="relative md:col-span-5 min-h-[420px]">
          <motion.div
            initial={{ opacity: 0, x: 30, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.6 }}
            className="absolute right-0 top-0 w-[300px] animate-float-y"
          >
            <GlassCard strong glow="cyan" className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Cardiac · Live
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse-soft" />
                  <span className="font-mono-display text-[10px] text-destructive">REC</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-5xl font-light text-foreground">68</span>
                <span className="font-mono-display text-xs text-muted-foreground">bpm · sinus</span>
              </div>
              <HeartbeatLine className="mt-2 h-14 w-full" />
              <div className="mt-2 flex justify-between text-[10px] font-mono-display text-muted-foreground">
                <span>HRV 62 ms</span>
                <span>SpO₂ 99%</span>
                <span>QT 380</span>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.9 }}
            className="absolute left-2 top-[55%] w-[280px]"
            style={{ animation: "float-y 7s ease-in-out infinite", animationDelay: "1.2s" }}
          >
            <GlassCard strong className="p-5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> AI Insight
              </div>
              <div className="mt-3 text-sm leading-relaxed text-foreground/90">
                Cardiac drift detected.{" "}
                <span className="text-aurora font-medium">Atrial fibrillation</span> signal — 14
                days earlier than clinical threshold.
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[78%] bg-pulse" />
                  </div>
                  <span className="font-mono-display text-[10px] text-foreground">0.78</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  confidence
                </span>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease, delay: 1.1 }}
            className="absolute right-4 bottom-4 w-[200px]"
            style={{ animation: "float-y 8s ease-in-out infinite", animationDelay: "2s" }}
          >
            <GlassCard strong glow="violet" className="p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Drift Score
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-display text-4xl font-light text-aurora">82</span>
                <span className="mb-1 text-[10px] font-mono-display text-emerald-400">+4.2</span>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {[3, 5, 4, 6, 7, 6, 8].map((h, i) => (
                  <div key={i} className="h-8 rounded-sm bg-pulse" style={{ opacity: h / 10 }} />
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground flex flex-col items-center gap-2"
      >
        <span className="h-10 w-px bg-gradient-to-b from-primary to-transparent" />
      </motion.div>
    </section>
  );
}
