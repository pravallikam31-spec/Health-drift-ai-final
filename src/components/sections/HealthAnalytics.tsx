import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const radarAxes = ["Cardiac", "Metabolic", "Renal", "Neuro", "Immune", "Hepatic"];

function radarPoint(i: number, total: number, value: number, r = 100, cx = 130, cy = 130) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  return [cx + Math.cos(angle) * r * value, cy + Math.sin(angle) * r * value];
}

export function HealthAnalytics() {
  const values = [0.62, 0.78, 0.41, 0.55, 0.83, 0.68];
  const points = values
    .map((v, i) => radarPoint(i, values.length, v))
    .map((p) => p.join(","))
    .join(" ");

  return (
    <section id="analytics" className="relative px-6 py-32 md:py-44">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="text-[10px] uppercase tracking-[0.28em] text-primary">
            03 · Health Analytics
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-tight">
            Your biology, <span className="text-aurora">visualized</span>.
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-6 gap-5 auto-rows-[180px]">
          {/* Drift chart - large */}
          <GlassCard strong className="p-6 md:col-span-4 md:row-span-2 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Health Drift · 90 days
                </div>
                <div className="mt-2 font-display text-3xl text-foreground">
                  82.4 <span className="text-emerald-400 text-base font-mono-display">↑ 6.1</span>
                </div>
              </div>
              <div className="flex gap-1 font-mono-display text-[10px]">
                {["1W", "1M", "3M", "1Y"].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-md px-2 py-1 ${i === 2 ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative flex-1 mt-6">
              <svg viewBox="0 0 600 200" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.82 0.16 220)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="oklch(0.82 0.16 220)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="stroke" x1="0" x2="1">
                    <stop offset="0%" stopColor="oklch(0.82 0.16 220)" />
                    <stop offset="100%" stopColor="oklch(0.65 0.22 290)" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160].map((y) => (
                  <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="oklch(1 0 0 / 0.06)" />
                ))}
                <motion.path
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                  d="M0,150 C60,140 90,130 150,120 C220,108 260,80 320,90 C380,100 420,70 480,55 C540,40 580,50 600,42"
                  fill="none"
                  stroke="url(#stroke)"
                  strokeWidth="2.5"
                />
                <path
                  d="M0,150 C60,140 90,130 150,120 C220,108 260,80 320,90 C380,100 420,70 480,55 C540,40 580,50 600,42 L600,200 L0,200 Z"
                  fill="url(#area)"
                />
                <circle cx="600" cy="42" r="4" fill="oklch(0.82 0.16 220)" />
                <circle
                  cx="600"
                  cy="42"
                  r="9"
                  fill="oklch(0.82 0.16 220)"
                  opacity="0.25"
                  className="animate-pulse-soft"
                />
              </svg>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono-display">
              {["Sleep 92", "Strain 64", "Recovery 78", "VO₂ 51"].map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {m}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Radar */}
          <GlassCard strong className="p-6 md:col-span-2 md:row-span-2 flex flex-col">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Systems Biomarker
            </div>
            <div className="relative flex-1 grid place-items-center">
              <svg viewBox="0 0 260 260" className="h-full w-full max-h-[260px]">
                {[0.25, 0.5, 0.75, 1].map((s, i) => (
                  <polygon
                    key={s}
                    points={radarAxes
                      .map((_, j) => radarPoint(j, radarAxes.length, s).join(","))
                      .join(" ")}
                    fill="none"
                    stroke="oklch(1 0 0 / 0.06)"
                  />
                ))}
                {radarAxes.map((_, i) => {
                  const [x, y] = radarPoint(i, radarAxes.length, 1);
                  return (
                    <line key={i} x1="130" y1="130" x2={x} y2={y} stroke="oklch(1 0 0 / 0.06)" />
                  );
                })}
                <motion.polygon
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: "130px 130px" }}
                  points={points}
                  fill="oklch(0.65 0.22 290 / 0.3)"
                  stroke="oklch(0.65 0.22 290)"
                  strokeWidth="1.5"
                />
                {values.map((v, i) => {
                  const [x, y] = radarPoint(i, values.length, v);
                  return <circle key={i} cx={x} cy={y} r="3" fill="oklch(0.82 0.16 220)" />;
                })}
                {radarAxes.map((a, i) => {
                  const [x, y] = radarPoint(i, radarAxes.length, 1.18);
                  return (
                    <text
                      key={a}
                      x={x}
                      y={y}
                      fill="oklch(0.7 0.03 250)"
                      fontSize="9"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontFamily: "JetBrains Mono", letterSpacing: 1 }}
                    >
                      {a.toUpperCase()}
                    </text>
                  );
                })}
              </svg>
            </div>
          </GlassCard>

          {/* Risk timeline */}
          <GlassCard className="p-5 md:col-span-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Risk Timeline
            </div>
            <div className="mt-4 flex h-16 items-end gap-1">
              {Array.from({ length: 36 }).map((_, i) => {
                const h = 20 + Math.sin(i * 0.4) * 14 + Math.random() * 18;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-accent/70"
                    style={{ height: `${h}%`, opacity: 0.5 + (i / 36) * 0.5 }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex justify-between font-mono-display text-[10px] text-muted-foreground">
              <span>JAN</span>
              <span>APR</span>
              <span>JUL</span>
              <span>OCT</span>
              <span>NOW</span>
            </div>
          </GlassCard>

          {/* Genomic */}
          <GlassCard className="p-5 md:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Genomic Variants
              </div>
              <span className="font-mono-display text-[10px] text-primary">SEQUENCED</span>
            </div>
            <div className="mt-4 grid grid-cols-12 gap-1">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[2px]"
                  style={{
                    background: `oklch(${0.4 + Math.random() * 0.5} 0.15 ${Math.random() > 0.5 ? 220 : 290} / ${0.4 + Math.random() * 0.6})`,
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-between font-mono-display text-[10px] text-muted-foreground">
              <span>BRCA1 · neg</span>
              <span>APOE ε3/ε4</span>
              <span>MTHFR C677T</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
