import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { GlowButton } from "@/components/ui/GlowButton";

export function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section id="cta" className="relative px-6 py-44 md:py-56 overflow-hidden">
      {/* Echo rings */}
      <div className="absolute inset-0 -z-10 grid place-items-center">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-primary/20"
            style={{
              width: `${20 + i * 14}vw`,
              aspectRatio: "1/1",
              maxWidth: 900,
              animation: `pulse-soft ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.6 - i * 0.1,
            }}
          />
        ))}
        <div className="absolute h-[60vw] max-h-[700px] aspect-square rounded-full bg-pulse opacity-10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="h-px w-10 bg-primary" />
            08 · The next decade of medicine
            <span className="h-px w-10 bg-accent" />
          </span>

          <h2 className="mt-8 font-display text-[clamp(2.5rem,6vw,5rem)] font-light leading-[0.98] tracking-tight">
            The body whispers <br className="hidden md:block" /> long before it{" "}
            <span className="text-aurora font-medium">screams.</span>
          </h2>
          <p className="mt-8 max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
            Join the first 10,000 members shaping the future of predictive medicine. Limited cohort.
            Concierge onboarding. Lifetime access.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <GlowButton onClick={() => navigate({ to: "/dashboard" })}>
              Login
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h12m0 0L8 2m5 5L8 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </GlowButton>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>Backed by Mayo</span>
            <span>·</span>
            <span>Reviewed by Stanford Med</span>
            <span>·</span>
            <span>Published in NEJM</span>
          </div>
        </motion.div>
      </div>

      <footer className="relative mt-32 mx-auto max-w-7xl border-t border-white/5 pt-10 flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-pulse" />
          <span>Nexus Biosystems · © 2026</span>
        </div>
        <div className="flex gap-6">
          <span>Science</span>
          <span>Privacy</span>
          <span>Press</span>
          <span>Careers</span>
        </div>
      </footer>
    </section>
  );
}
