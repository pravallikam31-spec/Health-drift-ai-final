import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

export function BiotechParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const particles: Particle[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();

    const count = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 16000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15 * dpr,
        vy: (Math.random() - 0.5) * 0.15 * dpr,
        r: (Math.random() * 1.4 + 0.4) * dpr,
        hue: Math.random() > 0.5 ? 220 : 290,
      });
    }

    const move = (e: PointerEvent) => {
      mouse.current.x = e.clientX * dpr;
      mouse.current.y = e.clientY * dpr;
    };
    const leave = () => {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerleave", leave);
    window.addEventListener("resize", resize);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x,
            dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          const max = 140 * dpr;
          if (d2 < max * max) {
            const a = 1 - Math.sqrt(d2) / max;
            ctx.strokeStyle = `oklch(0.8 0.15 ${(p.hue + q.hue) / 2} / ${a * 0.18})`;
            ctx.lineWidth = 0.6 * dpr;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        // cursor influence
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const d2 = dx * dx + dy * dy;
        const radius = 160 * dpr;
        if (d2 < radius * radius) {
          const f = (1 - Math.sqrt(d2) / radius) * 0.6;
          p.vx += (dx / Math.sqrt(d2 + 0.01)) * f * 0.2;
          p.vy += (dy / Math.sqrt(d2 + 0.01)) * f * 0.2;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        else if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        else if (p.y > canvas.height) p.y = 0;

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grd.addColorStop(0, `oklch(0.9 0.18 ${p.hue} / 0.9)`);
        grd.addColorStop(1, `oklch(0.9 0.18 ${p.hue} / 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-[5] hidden sm:block"
      aria-hidden
    />
  );
}
