import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Build a soft round sprite texture for glowing particles
function makeSpriteTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.85)");
  g.addColorStop(0.55, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function HelixParticles({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const sprite = useMemo(() => makeSpriteTexture(), []);

  // Generate dense particle positions along two helical strands + rungs
  const { posA, posB, posR, dustPos } = useMemo(() => {
    const turns = 11;
    const radius = 1.1;
    const height = 32;
    const strandDensity = 2200; // particles per strand
    const rungCount = 90;
    const rungParticles = 26;

    const a = new Float32Array(strandDensity * 3);
    const b = new Float32Array(strandDensity * 3);
    for (let i = 0; i < strandDensity; i++) {
      const t = i / (strandDensity - 1);
      const ang = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      // Small jitter for "dust on strand" look
      const jr = (Math.random() - 0.5) * 0.06;
      const jy = (Math.random() - 0.5) * 0.04;
      a[i * 3] = Math.cos(ang) * (radius + jr);
      a[i * 3 + 1] = y + jy;
      a[i * 3 + 2] = Math.sin(ang) * (radius + jr);
      b[i * 3] = Math.cos(ang + Math.PI) * (radius + jr);
      b[i * 3 + 1] = y + jy;
      b[i * 3 + 2] = Math.sin(ang + Math.PI) * (radius + jr);
    }

    const r = new Float32Array(rungCount * rungParticles * 3);
    for (let i = 0; i < rungCount; i++) {
      const t = i / (rungCount - 1);
      const ang = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      const ax = Math.cos(ang) * radius;
      const az = Math.sin(ang) * radius;
      const bx = Math.cos(ang + Math.PI) * radius;
      const bz = Math.sin(ang + Math.PI) * radius;
      for (let j = 0; j < rungParticles; j++) {
        const u = j / (rungParticles - 1);
        const x = ax + (bx - ax) * u + (Math.random() - 0.5) * 0.03;
        const z = az + (bz - az) * u + (Math.random() - 0.5) * 0.03;
        const yy = y + (Math.random() - 0.5) * 0.03;
        const idx = (i * rungParticles + j) * 3;
        r[idx] = x;
        r[idx + 1] = yy;
        r[idx + 2] = z;
      }
    }

    // Ambient dust around the helix
    const dustCount = 600;
    const d = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const rad = 1.4 + Math.random() * 2.2;
      const ang = Math.random() * Math.PI * 2;
      d[i * 3] = Math.cos(ang) * rad;
      d[i * 3 + 1] = (Math.random() - 0.5) * height * 1.05;
      d[i * 3 + 2] = Math.sin(ang) * rad;
    }

    return { posA: a, posB: b, posR: r, dustPos: d };
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // Continuous rotation + scroll-driven spin and vertical drift
    group.current.rotation.y = t * 0.22 + scrollRef.current * Math.PI * 2.4;
    group.current.rotation.x = Math.sin(t * 0.25) * 0.08;
    group.current.position.y = -scrollRef.current * 8;
  });

  const baseMat = {
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  } as const;

  return (
    <group ref={group}>
      {/* Strand A — cyan/white */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posA, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.05} color="#bfeaff" opacity={0.95} />
      </points>
      {/* Strand A halo */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posA, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.16} color="#3ab6ff" opacity={0.35} />
      </points>

      {/* Strand B — violet */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posB, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.05} color="#e7d8ff" opacity={0.95} />
      </points>
      {/* Strand B halo */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posB, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.16} color="#8a5cff" opacity={0.35} />
      </points>

      {/* Rungs */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posR, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.04} color="#ffffff" opacity={0.7} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posR, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.13} color="#7fdcff" opacity={0.18} />
      </points>

      {/* Ambient dust */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPos, 3]} />
        </bufferGeometry>
        <pointsMaterial {...baseMat} size={0.08} color="#a78bff" opacity={0.35} />
      </points>
    </group>
  );
}

export function DNASpineBackground() {
  const scrollRef = useRef(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollRef.current = window.scrollY / max;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden"
      style={{
        maskImage: "radial-gradient(ellipse 65% 95% at 78% 50%, black 35%, transparent 82%)",
        WebkitMaskImage: "radial-gradient(ellipse 65% 95% at 78% 50%, black 35%, transparent 82%)",
      }}
    >
      <div className="absolute right-[-6%] top-1/2 -translate-y-1/2 h-[180vh] w-[85vw] md:w-[58vw]">
        <Canvas
          camera={{ position: [0, 0, 6.2], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, 1.75]}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 4, 5]} intensity={1.2} color="#7fdcff" />
          <pointLight position={[-5, -3, 4]} intensity={1.0} color="#b18cff" />
          <HelixParticles scrollRef={scrollRef} />
        </Canvas>
      </div>
    </div>
  );
}
