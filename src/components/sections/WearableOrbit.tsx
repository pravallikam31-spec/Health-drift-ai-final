import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const devices = [
  { name: "Apple Watch", metric: "Cardiac · SpO₂", angle: 0 },
  { name: "Oura Ring", metric: "Sleep · HRV", angle: 60 },
  { name: "Dexcom G7", metric: "Glucose · CGM", angle: 120 },
  { name: "Whoop 5", metric: "Strain · Recovery", angle: 180 },
  { name: "Withings Scan", metric: "Body comp · ECG", angle: 240 },
  { name: "Levels Patch", metric: "Metabolic", angle: 300 },
];

export function WearableOrbit() {
  return (
    <section id="wearables" className="relative px-6 py-32 md:py-44 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="text-[10px] uppercase tracking-[0.28em] text-primary">
            06 · Wearable Integration
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-tight">
            One body, <span className="text-aurora">every signal.</span>
          </h2>
          <p className="mt-6 max-w-xl text-muted-foreground leading-relaxed">
            Nexus ingests over 40 device protocols natively — fusing them into a single continuous
            physiological stream. No app switching. No CSV exports.
          </p>
        </motion.div>

        <div className="mt-20 relative h-[560px] md:h-[640px] grid place-items-center">
          {/* Orbit rings */}
          {[0.55, 0.75, 0.95].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/10"
              style={{
                width: `${s * 100}%`,
                aspectRatio: "1/1",
                maxWidth: 640,
                animation: `spin ${40 + i * 15}s linear infinite`,
              }}
            />
          ))}
          <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>

          {/* Core */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 grid place-items-center"
          >
            <div className="relative h-52 w-52 md:h-64 md:w-64 rounded-full">
              <div className="absolute inset-0 rounded-full bg-pulse blur-3xl opacity-60 animate-pulse-soft" />
              <div className="absolute inset-4 rounded-full bg-background border border-white/10 grid place-items-center">
                <div className="text-center">
                  <div className="font-mono-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    You
                  </div>
                  <div className="mt-2 font-display text-4xl text-aurora">94.2</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Sync Score
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Devices */}
          {devices.map((d, i) => {
            const rad = (d.angle * Math.PI) / 180;
            const r = 44; // percentage radius
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r * 0.72;
            return (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="absolute"
                style={{
                  left: `calc(50% + ${x}%)`,
                  top: `calc(50% + ${y}%)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <GlassCard
                  strong
                  className="px-4 py-3 min-w-[150px] animate-float-y"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                    <span className="text-xs font-medium text-foreground">{d.name}</span>
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {d.metric}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}

          {/* Connection beams */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="beam" x1="0" x2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.16 220)" stopOpacity="0" />
                <stop offset="50%" stopColor="oklch(0.82 0.16 220)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="oklch(0.65 0.22 290)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {devices.map((d, i) => {
              const rad = (d.angle * Math.PI) / 180;
              const x = 50 + Math.cos(rad) * 44;
              const y = 50 + Math.sin(rad) * 44 * 0.72;
              return (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={x}
                  y2={y}
                  stroke="url(#beam)"
                  strokeWidth="0.15"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
