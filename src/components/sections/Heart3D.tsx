import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import heartImage from "@/assets/heart-anatomical.png";

function HeartPlane() {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useLoader(THREE.TextureLoader, heartImage);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // double-pump heartbeat
    const beat =
      1 + Math.max(0, Math.sin(t * 2.4)) * 0.06 + Math.max(0, Math.sin(t * 2.4 - 0.4)) * 0.035;
    if (group.current) {
      group.current.scale.setScalar(beat);
      // subtle parallax wobble for depth
      group.current.rotation.y = Math.sin(t * 0.5) * 0.12;
      group.current.rotation.x = Math.cos(t * 0.4) * 0.06;
      group.current.position.z = Math.sin(t * 1.2) * 0.05;
    }
    const pulse = 0.6 + Math.max(0, Math.sin(t * 2.4)) * 0.8;
    if (matRef.current) matRef.current.emissiveIntensity = pulse;
    if (glowRef.current) glowRef.current.opacity = 0.22 + pulse * 0.18;
  });

  return (
    <group ref={group}>
      {/* Foreground textured heart with emissive lighting */}
      <mesh>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          emissiveMap={texture}
          emissive="#ff2a55"
          emissiveIntensity={1}
          transparent
          alphaTest={0.02}
          roughness={0.55}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}

export function Heart3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 4]} intensity={2.4} color="#ff7a9e" />
      <pointLight position={[-3, -2, 3]} intensity={1.8} color="#7fdcff" />
      <pointLight position={[0, 0, -3]} intensity={1.2} color="#b18cff" />
      <Suspense fallback={null}>
        <HeartPlane />
      </Suspense>
    </Canvas>
  );
}
