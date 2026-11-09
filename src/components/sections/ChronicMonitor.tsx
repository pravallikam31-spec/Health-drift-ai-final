import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const conditions = [
  {
    name: "Type 2 Diabetes",
    metric: "HbA1c",
    value: "5.4",
    unit: "%",
    status: "Stable",
    color: "from-amber-400 to-orange-500",
    series: [5.8, 5.7, 5.6, 5.55, 5.5, 5.45, 5.4],
  },
  {
    name: "Hypertension",
    metric: "Systolic",
    value: "118",
    unit: "mmHg",
    status: "Improving",
    color: "from-fuchsia-400 to-violet-500",
    series: [132, 128, 126, 124, 122, 120, 118],
  },
  {
    name: "Cardiac Arrhythmia",
    metric: "AFib Burden",
    value: "0.4",
    unit: "%",
    status: "Monitoring",
    color: "from-rose-400 to-rose-600",
    series: [1.2, 1.0, 0.9, 0.8, 0.6, 0.5, 0.4],
  },
  {
    name: "Renal Function",
    metric: "eGFR",
    value: "94",
    unit: "ml/min",
    status: "Optimal",
    color: "from-cyan-400 to-sky-500",
    series: [88, 89, 90, 91, 92, 93, 94],
  },
];

function MiniChart({ data }: { data: number[] }) {
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <polyline
        points={points}
        fill="none"
        stroke="url(#mini-grad)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <defs>
        <linearGradient id="mini-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.16 220)" />
          <stop offset="100%" stopColor="oklch(0.65 0.22 290)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ChronicMonitor() {
  return (
    <section className="relative px-6 py-32 md:py-44">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="text-[10px] uppercase tracking-[0.28em] text-primary">
            04 · Chronic Monitoring
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-tight">
            Continuous vigilance, <br />
            <span className="text-aurora">zero alarm fatigue.</span>
          </h2>
          <p className="mt-6 max-w-xl text-muted-foreground leading-relaxed">
            Every chronic condition has its own signature. Nexus learns yours — then quietly watches
            the curve, only speaking up when the trajectory changes.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {conditions.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard
                strong
                className="group relative h-[280px] p-6 flex flex-col overflow-hidden"
              >
                <div
                  className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${c.color} opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40`}
                />
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                  {c.status}
                </div>
                <div className="mt-3 text-sm font-medium text-foreground/90">{c.name}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-light text-aurora">{c.value}</span>
                  <span className="font-mono-display text-xs text-muted-foreground">{c.unit}</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  {c.metric}
                </div>
                <div className="mt-auto h-12 -mx-2">
                  <MiniChart data={c.series} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
