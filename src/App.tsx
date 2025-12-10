import { inject } from "@vercel/analytics";
import { Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

if (import.meta.env.PROD) {
  inject();
}

function Blackhole() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const explosionRef = useRef<THREE.Points | null>(null);

  const prevScrollRef = useRef<number>(0);
  const ringSpinVelRef = useRef<number>(0);
  const smoothScaleRef = useRef<number>(1);
  const smoothExplosionRef = useRef<number>(0);

  const { explosionBase, explosionColors } = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const color = new THREE.Color();
      color.setHSL(Math.random(), 1, 0.5);
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
    const shrinkFactor = THREE.MathUtils.clamp(scrollY / 1000, 0, 1);
    const targetScale = 1 - shrinkFactor;
    smoothScaleRef.current = THREE.MathUtils.lerp(
      smoothScaleRef.current,
      targetScale,
      0.1
    );

    const targetExplosion = shrinkFactor >= 1 ? (shrinkFactor - 1 + 1) * 14 : 0;
    smoothExplosionRef.current = THREE.MathUtils.lerp(
      smoothExplosionRef.current,
      targetExplosion,
      0.12
    );

    if (meshRef.current) {
      meshRef.current.visible = smoothScaleRef.current > 0;
      meshRef.current.scale.setScalar(smoothScaleRef.current);
      meshRef.current.rotation.y += 0.01;
    }

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
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial
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
              float glow = smoothstep(0.4, 0.2, dist);
              vec3 color = mix(vec3(0.0), vec3(1.0), glow * 0.3);
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>

      <mesh ref={ringRef}>
        <torusGeometry args={[2.6, 0.25, 32, 200]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={3}
          roughness={0.1}
          metalness={1}
          side={THREE.DoubleSide}
        />
      </mesh>

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
        <pointsMaterial size={0.15} vertexColors sizeAttenuation />
      </points>
    </>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  // 🧠 Horizontal scroll control
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const totalScroll = section.offsetHeight - window.innerHeight;
      const scrollY = Math.min(Math.max(-rect.top, 0), totalScroll);
      const progress = scrollY / totalScroll;

      // 🧠 The total horizontal distance we need to move
      const maxTranslate =
        track.scrollWidth -
        sticky.clientWidth +
        parseFloat(getComputedStyle(track).paddingRight || "0");

      track.style.transform = `translateX(-${progress * maxTranslate}px)`;
    };

    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const projects = [
    { title: "3D Portfolio", desc: "React + Three.js" },
    { title: "Web3 Dashboard", desc: "Next.js + Ethers.js" },
    { title: "NFT Gallery", desc: "Solana + Metaplex" },
    { title: "Arbitrage Bot", desc: "Node.js + Aave" },
    { title: "DeFi Tracker", desc: "React + Tailwind" },
  ];

  return (
    <div className="container flex flex-col justify-center">
      <Canvas className="!fixed inset-0" camera={{ position: [0, 0, 15] }}>
        <ambientLight intensity={0.6} />
        <Stars
          radius={80}
          depth={20}
          count={6000}
          factor={4}
          fade
          speed={0.2}
        />
        <Blackhole />
      </Canvas>

      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center p-4 text-white">
          <h1 className="text-2xl font-bold">
            Vargha<span className="text-blue-400">'s</span> Space
          </h1>
          <nav className="flex gap-6 text-lg">
            {["home", "skills", "projects", "about"].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="relative hover:text-blue-400 transition-colors after:content-[''] after:absolute after:w-0 after:h-[2px] after:bg-blue-400 after:left-0 after:-bottom-1 hover:after:w-full after:transition-all capitalize"
              >
                {id}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 text-white">
        <section
          id="home"
          className="flex flex-col justify-center items-center h-screen text-center"
        >
          <h1 className="text-5xl font-bold">Hi, I'm Vargha 🚀</h1>
          <p className="mt-4 text-xl opacity-80">
            Web Developer | Three.js Enthusiast
          </p>
        </section>

        <section
          id="skills"
          className="min-h-screen flex flex-col justify-center items-center p-10 text-center"
        >
          <h2 className="text-4xl font-semibold mb-8">My Skills</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-lg">
            {[
              "JavaScript",
              "TypeScript",
              "React",
              "Three.js",
              "Node.js",
              "Tailwind",
              "Solidity",
              "Ethers.js",
              "Git",
            ].map((skill) => (
              <div
                key={skill}
                className="px-6 py-4 bg-white/10 rounded-xl shadow-md hover:bg-white/20 transition"
              >
                {skill}
              </div>
            ))}
          </div>
        </section>

        {/* 💻 Horizontal Scroll Section */}
        <section
          id="projects"
          ref={sectionRef}
          className="relative h-[400vh]" // taller = more scroll distance
        >
          <div
            ref={stickyRef}
            className="sticky top-0 h-screen flex items-center overflow-hidden"
          >
            <div
              ref={trackRef}
              className="
    flex gap-10 transition-transform duration-300 ease-out will-change-transform 
    px-10 md:px-20
    snap-x snap-mandatory
  "
              style={{ width: "max-content" }}
            >
              {projects.map((project) => (
                <div
                  key={project.title}
                  className="
    shrink-0 
    w-[80vw] sm:w-[60vw] md:w-[45vw] lg:w-[35vw] 
    h-[60vh] 
    bg-white/10 p-6 rounded-xl 
    hover:bg-white/20 transition 
    flex flex-col justify-center items-center text-center
    snap-center
  "
                >
                  <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                  <p className="opacity-80">{project.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="about"
          className="min-h-screen flex flex-col justify-center items-center bg-black/40 text-center p-10"
        >
          <h2 className="text-4xl font-semibold mb-6">About Me</h2>
          <p className="max-w-2xl text-lg opacity-80">
            I’m a passionate developer building interactive experiences using
            React, Three.js, and Web3. Always exploring new tech and creative
            frontiers.
          </p>
        </section>
      </main>
    </div>
  );
}
