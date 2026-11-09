import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export const GlowButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-all duration-500",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          variant === "primary" && "text-primary-foreground bg-pulse hover:scale-[1.02] glow-cyan",
          variant === "ghost" && "text-foreground glass-strong hover:bg-white/10",
          className,
        )}
        {...rest}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        {variant === "primary" && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, oklch(1 0 0 / 0.25) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.2s linear infinite",
            }}
          />
        )}
      </button>
    );
  },
);
GlowButton.displayName = "GlowButton";
