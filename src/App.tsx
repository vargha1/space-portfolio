// src/App.tsx
import { Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function Blackhole() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const explosionRef = useRef<THREE.Points | null>(null);

  const prevScrollRef = useRef<number>(0);
  const ringSpinVelRef = useRef<number>(0);

  const smoothScaleRef = useRef<number>(1);
  const smoothExplosionRef = useRef<number>(0);

  // Explosion base points + colors
  const { explosionBase, explosionColors } = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // 🎨 Random color for each particle
      const color = new THREE.Color();
      color.setHSL(Math.random(), 1, 0.5); // vibrant random hues
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { explosionBase: positions, explosionColors: colors };
  }, []);


  const explosionCurrent = useMemo(
    () => new Float32Array(explosionBase.length),
    [explosionBase]
  );

  useFrame(({ clock }) => {
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;

    // 1. Compute normalized scroll factor for blackhole shrink
    const shrinkFactor = THREE.MathUtils.clamp(scrollY / 1000, 0, 1);

    // 2. Smooth blackhole scale
    const targetScale = 1 - shrinkFactor;
    smoothScaleRef.current = THREE.MathUtils.lerp(
      smoothScaleRef.current,
      targetScale,
      0.1
    );

    // 3. Explosion factor (only active after blackhole fully shrinks)
    const targetExplosion = shrinkFactor >= 1 ? (shrinkFactor - 1 + 1) * 14 : 0; // grows after fully shrunk
    smoothExplosionRef.current = THREE.MathUtils.lerp(
      smoothExplosionRef.current,
      targetExplosion,
      0.08
    );

    // Blackhole visibility & scale
    if (meshRef.current) {
      meshRef.current.visible = smoothScaleRef.current > 0;
      meshRef.current.scale.setScalar(smoothScaleRef.current);
      meshRef.current.rotation.y += 0.01; // slow rotation
    }

    // Ring rotation only on scroll delta
    const delta = scrollY - (prevScrollRef.current || 0);
    prevScrollRef.current = scrollY;
    ringSpinVelRef.current += delta * 0.0006;
    ringSpinVelRef.current *= 0.92;

    if (ringRef.current) {
      ringRef.current.visible = smoothScaleRef.current > 0;
      ringRef.current.rotation.y += ringSpinVelRef.current;
      ringRef.current.rotation.x =
        Math.sin(clock.getElapsedTime() * 0.3) * 0.12;
      ringRef.current.rotation.z =
        Math.sin(clock.getElapsedTime() * 0.2) * 0.08;
      ringRef.current.scale.setScalar(smoothScaleRef.current * 1.35);
    }

    // Explosion points
    if (explosionRef.current) {
      const positions = explosionRef.current.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < explosionBase.length; i++) {
        positions[i] = explosionBase[i] * smoothExplosionRef.current;
      }
      explosionRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Blackhole core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
          uniforms={{}}
          vertexShader={`
          varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
          varying vec2 vUv;
          void main() {
            float dist = distance(vUv, vec2(0.5));
            // black center with faint edge glow
            float glow = smoothstep(0.4, 0.2, dist);
            vec3 color = mix(vec3(0.0), vec3(1.0), glow * 0.3); // mostly black, little white edge
            gl_FragColor = vec4(color, 1.0);
          }
        `}
        />
      </mesh>

      {/* Accretion Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[2.6, 0.25, 32, 200]} />
        <meshStandardMaterial
          color={"#ffffff"}
          emissive={"#ffffff"}
          emissiveIntensity={3}
          roughness={0.1}
          metalness={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Explosion particles */}
      <points ref={explosionRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[explosionCurrent, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[explosionColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors // 🟢 Enable per-particle color
          sizeAttenuation
        />
      </points>
    </>
  );
}

export default function App() {
  return (
    <div className="container flex flex-col justify-center">
      <Canvas className="!fixed inset-0" camera={{ position: [0, 0, 15] }}>
        <ambientLight intensity={0.6} color="#ffffff" />
        <pointLight position={[10, 10, 10]} intensity={1.8} color="#ffffff" />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.8}
          color="#ffffff"
        />

        {/* 🌌 Starfield */}
        <Stars
          radius={80} // how far the stars are spread
          depth={20} // starfield depth
          count={6000} // number of stars
          factor={4} // star size
          saturation={0} // keep them white
          fade={true} // fade in the distance
          speed={0.2} // small movement (optional)
        />

        <Blackhole />
      </Canvas>
      <header className="container flex justify-between text-white">
        <div className="py-2 text-3xl">Vargha's Space Portfolio</div>
        <div className="flex justify-between w-1/2">
          <a href="#home" className="px-6 py-2 text-xl hover:">
            Home
          </a>
          <a href="#home" className="px-6 py-2 text-xl hover:">
            Skills
          </a>
          <a href="#home" className="px-6 py-2 text-xl hover:">
            Home
          </a>
          <a href="#home" className="px-6 py-2 text-xl hover:">
            Home
          </a>
        </div>
      </header>
      <main
        className="relative z-10 flex flex-col items-center justify-center text-white pointer-events-none"
        id="home"
      >
        <h1 className="text-5xl font-bold">Hi, I'm Vargha 🚀</h1>
        <p className="mt-4 text-xl">Web Developer | Three.js Enthusiast</p>
      </main>
      <div className="flex"></div>
      <div style={{ height: "300vh" }} /> {/* scrollable space */}
    </div>
  );
}
