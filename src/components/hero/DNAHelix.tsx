import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Helix() {
  const group = useRef<THREE.Group>(null);
  const rungsRef = useRef<THREE.InstancedMesh>(null);

  const { spheresA, spheresB, rungs } = useMemo(() => {
    const turns = 5;
    const steps = 110;
    const radius = 1.15;
    const height = 7;
    const sa: THREE.Vector3[] = [];
    const sb: THREE.Vector3[] = [];
    const r: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      const a = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const b = new THREE.Vector3(
        Math.cos(angle + Math.PI) * radius,
        y,
        Math.sin(angle + Math.PI) * radius,
      );
      sa.push(a);
      sb.push(b);
      if (i % 4 === 0) r.push({ a, b });
    }
    return { spheresA: sa, spheresB: sb, rungs: r };
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.18;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
  });

  // build rung matrices
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  return (
    <group ref={group}>
      {/* backbone A - cyan */}
      {spheresA.map((p, i) => (
        <mesh key={`a${i}`} position={p}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color="#7fdcff"
            emissive="#3ab6ff"
            emissiveIntensity={1.6}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
      ))}
      {/* backbone B - violet */}
      {spheresB.map((p, i) => (
        <mesh key={`b${i}`} position={p}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color="#c9a8ff"
            emissive="#8a5cff"
            emissiveIntensity={1.6}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
      ))}
      {/* rungs */}
      {rungs.map((r, i) => {
        const mid = r.a.clone().add(r.b).multiplyScalar(0.5);
        const dir = r.b.clone().sub(r.a);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize(),
        );
        return (
          <mesh key={`r${i}`} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.025, 0.025, len, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#7fdcff"
              emissiveIntensity={0.9}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function DNAHelix() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.4} color="#7fdcff" />
      <pointLight position={[-5, -3, 4]} intensity={1.2} color="#b18cff" />
      <pointLight position={[0, 0, -5]} intensity={0.6} color="#ffffff" />
      <Helix />
    </Canvas>
  );
}
