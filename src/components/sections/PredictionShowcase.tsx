import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const Heart3D = lazy(() => import("./Heart3D").then((m) => ({ default: m.Heart3D })));

const predictions = [
  {
    name: "Cardiovascular Disease",
    risk: 18,
    window: "24 months",
    color: "from-rose-400 to-rose-600",
  },
  { name: "Type 2 Diabetes", risk: 42, window: "18 months", color: "from-amber-400 to-orange-500" },
  { name: "Hypertension", risk: 67, window: "6 months", color: "from-fuchsia-400 to-violet-500" },
  {
    name: "Chronic Stress and Burnout",
    risk: 9,
    window: "5+ years",
    color: "from-cyan-400 to-sky-500",
  },
];

export function PredictionShowcase() {
  return (
    <section id="predict" className="relative px-6 py-32 md:py-44">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-6 relative h-[520px] md:h-[640px]">
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <Heart3D />
            </Suspense>
          </div>
          {/* radial vignette */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--background)_85%)]" />
          {/* floating labels */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="absolute left-2 top-1/4 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span className="h-px w-12 bg-primary" />
            Left Atrium · 62 ml
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute right-2 top-1/2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            EF 58% · normal
            <span className="h-px w-12 bg-accent" />
          </motion.div>
        </div>

        <div className="md:col-span-6 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] uppercase tracking-[0.28em] text-primary">
              02 · Prediction Engine
            </span>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-tight">
              The diseases of tomorrow,
              <br />
              <span className="text-aurora">visible today.</span>
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground leading-relaxed">
              The Nexus engine cross-references 1,400+ biomarkers against a living atlas of 42
              million longitudinal health records — surfacing risk trajectories long before they
              cross a clinical threshold.
            </p>
          </motion.div>

          <div className="mt-10 space-y-3">
            {predictions.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              >
                <GlassCard className="group p-5 transition-transform duration-500 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{p.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Lead window · {p.window}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block h-1.5 w-32 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${p.risk}%` }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 1.2,
                            ease: [0.16, 1, 0.3, 1],
                            delay: 0.2 + i * 0.08,
                          }}
                          className={`h-full bg-gradient-to-r ${p.color}`}
                        />
                      </div>
                      <span className="font-mono-display text-lg text-foreground tabular-nums w-12 text-right">
                        {p.risk}%
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
