import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const factors = [
  { name: "Sleep architecture", delta: "+8.2", positive: true },
  { name: "Glucose variance", delta: "−12%", positive: true },
  { name: "HRV trend", delta: "+14ms", positive: true },
  { name: "Inflammation (CRP)", delta: "−0.4", positive: true },
  { name: "VO₂ max", delta: "+2.1", positive: true },
  { name: "Visceral adipose", delta: "−1.8%", positive: true },
];

export function DriftScore() {
  const score = 82;
  const max = 100;
  const r = 130;
  const circ = 2 * Math.PI * r;
  const dash = (score / max) * circ;

  return (
    <section className="relative px-6 py-32 md:py-44">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-[10px] uppercase tracking-[0.28em] text-primary">
            07 · Drift Score
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-tight">
            One number for <span className="text-aurora">your trajectory.</span>
          </h2>
        </motion.div>

        <div className="mt-20 relative grid place-items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <svg width="340" height="340" viewBox="0 0 340 340" className="-rotate-90">
              <defs>
                <linearGradient id="ring" x1="0" x2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.16 220)" />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 290)" />
                </linearGradient>
                <filter id="ring-glow">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              <circle
                cx="170"
                cy="170"
                r={r}
                fill="none"
                stroke="oklch(1 0 0 / 0.06)"
                strokeWidth="14"
              />
              <motion.circle
                cx="170"
                cy="170"
                r={r}
                fill="none"
                stroke="url(#ring)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                whileInView={{ strokeDashoffset: circ - dash }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              />
              <motion.circle
                cx="170"
                cy="170"
                r={r}
                fill="none"
                stroke="url(#ring)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                whileInView={{ strokeDashoffset: circ - dash }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                filter="url(#ring-glow)"
                opacity="0.7"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-display text-7xl font-light text-aurora tabular-nums">
                  {score}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Drift Score
                </div>
                <div className="mt-3 font-mono-display text-xs text-emerald-400">↑ +6.1 · 30d</div>
              </div>
            </div>

            {/* Floating factor chips */}
            {factors.map((f, i) => {
              const angle = (i / factors.length) * Math.PI * 2 - Math.PI / 2;
              const dist = 230;
              const x = Math.cos(angle) * dist;
              const y = Math.sin(angle) * dist;
              return (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 1 + i * 0.08 }}
                  className="absolute top-1/2 left-1/2 hidden md:block"
                  style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                >
                  <GlassCard className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {f.name}
                    </div>
                    <div
                      className={`mt-0.5 font-mono-display text-xs ${f.positive ? "text-emerald-400" : "text-destructive"}`}
                    >
                      {f.delta}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Mobile factor list */}
          <div className="mt-10 grid grid-cols-2 gap-3 md:hidden w-full">
            {factors.map((f) => (
              <GlassCard key={f.name} className="px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {f.name}
                </div>
                <div className="font-mono-display text-xs text-emerald-400">{f.delta}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
