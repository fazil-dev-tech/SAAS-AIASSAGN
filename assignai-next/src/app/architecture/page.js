"use client";
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// ── WEBGL SUPPORT DETECTION ──
const checkWebGLSupport = () => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch { return false; }
};

// ═══════════════════════════════════════════
//  3D SCENE — Architecture Pipeline Nodes
// ═══════════════════════════════════════════

// Ambient star backdrop
const StarField = () => {
  const ref = useRef();
  const count = 4000;
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 30 + Math.pow(Math.random(), 0.5) * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const b = 0.7 + Math.random() * 0.3;
      col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b + Math.random() * 0.1;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.003;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
};

// Flowing connection lines between nodes (particle streams)
const DataStream = ({ from, to, color, speed = 1 }) => {
  const ref = useRef();
  const count = 60;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      pos[i * 3] = from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 2] = from[2] + (to[2] - from[2]) * t + (Math.random() - 0.5) * 0.3;
    }
    return pos;
  }, [from, to]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    const geo = ref.current.geometry;
    const posArr = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const frac = ((i / count) + t * 0.1) % 1;
      posArr[i * 3] = from[0] + (to[0] - from[0]) * frac + Math.sin(t + i * 0.5) * 0.15;
      posArr[i * 3 + 1] = from[1] + (to[1] - from[1]) * frac + Math.cos(t + i * 0.3) * 0.1;
      posArr[i * 3 + 2] = from[2] + (to[2] - from[2]) * frac + Math.sin(t * 0.7 + i) * 0.1;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={color} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// Architecture nodes with wireframe + glow + label
const PipelineNodes = ({ isMobile }) => {
  const nodes = [
    { label: 'Client Input', color: '#3b82f6', shape: 'box', pos: isMobile ? [-2, 2, 0] : [-5, 1.5, 0], icon: '📤' },
    { label: 'AssignAI Engine', color: '#a855f7', shape: 'octahedron', pos: isMobile ? [0, 0, -1] : [0, 0, -2], icon: '⚙️' },
    { label: 'Formatted Document', color: '#10b981', shape: 'cylinder', pos: isMobile ? [2, -2, 0] : [5, -1.5, 0], icon: '📄' },
  ];

  const getGeo = (shape) => {
    switch (shape) {
      case 'box': return <boxGeometry args={[1.8, 1.8, 1.8]} />;
      case 'octahedron': return <octahedronGeometry args={[2.2, 0]} />;
      case 'cylinder': return <cylinderGeometry args={[1.2, 1.2, 2.2, 16]} />;
      default: return <boxGeometry args={[1.5, 1.5, 1.5]} />;
    }
  };

  return (
    <group>
      {nodes.map((node, i) => (
        <Float key={i} speed={1 + i * 0.2} floatIntensity={0.4} rotationIntensity={0.15}>
          {/* Wireframe shell */}
          <mesh position={node.pos}>
            {getGeo(node.shape)}
            <meshBasicMaterial color={node.color} wireframe transparent opacity={0.2} depthWrite={false} />
          </mesh>
          {/* Glowing core */}
          <mesh position={node.pos}>
            <sphereGeometry args={[0.35, 24, 24]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.9} />
          </mesh>
          {/* Outer glow */}
          <mesh position={node.pos}>
            <sphereGeometry args={[0.7, 16, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* Label */}
          <group position={node.pos}>
            <Html position={[0, 2.2, 0]} center transform sprite zIndexRange={[100, 0]}>
              <div style={{
                background: 'rgba(3,1,6,0.92)',
                border: `1px solid ${node.color}`,
                padding: '6px 16px',
                borderRadius: '24px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '1.5px',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(12px)',
                boxShadow: `0 0 20px ${node.color}40, inset 0 0 8px ${node.color}20`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>{node.icon}</span> {node.label}
              </div>
            </Html>
          </group>
        </Float>
      ))}

      {/* Data flow streams between nodes */}
      <DataStream from={nodes[0].pos} to={nodes[1].pos} color="#6d9fff" speed={0.8} />
      <DataStream from={nodes[1].pos} to={nodes[2].pos} color="#c084fc" speed={1.2} />
    </group>
  );
};

// Orbital decoration rings
const SceneRings = () => {
  const r1 = useRef(), r2 = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (r1.current) { r1.current.rotation.x = Math.PI / 2.5; r1.current.rotation.z = t * 0.08; }
    if (r2.current) { r2.current.rotation.y = Math.PI / 3; r2.current.rotation.x = -t * 0.06; }
  });
  return (
    <group>
      <mesh ref={r1}>
        <torusGeometry args={[8, 0.008, 16, 128]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[10, 0.006, 16, 128]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
};

// Camera with subtle mouse-follow
const ArchCameraRig = ({ isMobile }) => {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile) return;
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isMobile]);

  useFrame(() => {
    const mx = isMobile ? 0 : mouse.current.x * 0.8;
    const my = isMobile ? 0 : mouse.current.y * 0.5;
    camera.position.lerp(new THREE.Vector3(mx, my, 14), 0.03);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Full 3D scene component
const ArchScene = ({ isMobile }) => {
  const [webgl, setWebgl] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWebgl(checkWebGLSupport());
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (!mounted) return null;

  const bg = {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.12) 0%, rgba(0,229,255,0.06) 30%, #030106 75%)',
  };

  if (!webgl) return <div style={bg} />;

  return (
    <div style={bg}>
      <Canvas
        camera={{ position: [0, 0, 14], fov: 50 }}
        dpr={isMobile ? 1 : 1.5}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 0, 5]} intensity={1.5} color="#a855f7" distance={20} decay={2} />
        <StarField />
        <PipelineNodes isMobile={isMobile} />
        <SceneRings />
        <ArchCameraRig isMobile={isMobile} />
      </Canvas>
    </div>
  );
};

// ═══════════════════════════════════════════
//  PAGE CONTENT — Architecture Steps
// ═══════════════════════════════════════════

const steps = [
  {
    step: '01',
    title: 'Client Synthesis',
    desc: 'You provide the raw requirements — subject, questions, student details. The frontend instantly packages your constraints into an encrypted payload, ready for processing.',
    color: '#3b82f6',
    icon: '📤',
    details: ['Structured JSON payload generation', 'Client-side validation & sanitization', 'Encrypted transmission via HTTPS/TLS 1.3'],
  },
  {
    step: '02',
    title: 'Neural Processing',
    desc: 'The AssignAI Engine ingests the payload. It expands, researches, and strictly structures the content to university formatting guidelines within milliseconds.',
    color: '#a855f7',
    icon: '⚙️',
    details: ['3-tier AI fallback: NVIDIA → OpenRouter → Puter.js', 'Academic formatting to SIT VTU standards', 'AI vision models generate technical diagrams'],
  },
  {
    step: '03',
    title: 'Formatted Output',
    desc: 'The highly structured data is compiled. AI vision models generate diagrams, and the final engine injects everything into a flawless DOCX/PDF document.',
    color: '#10b981',
    icon: '📄',
    details: ['Pixel-perfect A4 document compilation', 'Cover page, TOC, headers/footers auto-generated', 'One-click DOCX/PDF export & email delivery'],
  },
];

export default function ArchitecturePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#030106', color: '#fff', overflowX: 'hidden' }}>

      {/* ── 3D Background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <ArchScene isMobile={isMobile} />
      </div>

      {/* ── Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', padding: '1.25rem 2.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 50, background: 'linear-gradient(180deg, rgba(3,1,6,0.9) 0%, transparent 100%)',
      }}>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          textDecoration: 'none', color: '#fff',
          fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 800,
        }}>
          <span>🎓</span>
          <span style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #00ffff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>AssignAI</span>
        </a>
        <a href="/" style={{
          color: '#888', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none',
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px',
          transition: 'color 0.3s',
        }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#888'}>
          ← Back to Home
        </a>
      </header>

      {/* ── Main Content ── */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '10rem' }}>

        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '6rem', padding: '0 2rem' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 1.2rem', marginBottom: '2rem',
              border: '1px solid rgba(168,85,247,0.3)', borderRadius: '100px',
              backdropFilter: 'blur(10px)', background: 'rgba(168,85,247,0.08)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
              fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c084fc',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', animation: 'pulse 2s infinite' }} />
              System Architecture
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 0.2 }}
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1,
              marginBottom: '1.5rem',
              textShadow: '0 4px 30px rgba(0,0,0,0.8)',
            }}
          >
            How AssignAI <br />
            <span style={{ color: '#888' }}>Builds Your Reports.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ color: '#777', fontSize: '1.15rem', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}
          >
            A three-stage neural pipeline that transforms raw academic requirements into university-standard formatted documents.
          </motion.p>
        </div>

        {/* ── Architecture Steps ── */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 8rem' }}>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60, filter: 'blur(6px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.9, delay: i * 0.1 }}
              style={{
                position: 'relative',
                padding: '2.5rem',
                marginBottom: '2rem',
                background: 'rgba(8,4,18,0.5)',
                border: `1px solid ${step.color}22`,
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
              }}
            >
              {/* Glow accent */}
              <div style={{
                position: 'absolute', top: '-50%', right: '-20%',
                width: '300px', height: '300px', borderRadius: '50%',
                background: `radial-gradient(circle, ${step.color}12, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Step label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: `${step.color}18`, border: `1px solid ${step.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem',
                      fontWeight: 700, letterSpacing: '2.5px', color: step.color, marginBottom: '2px',
                    }}>
                      STEP {step.step}
                    </div>
                    <h3 style={{
                      fontFamily: "'Inter', sans-serif", fontSize: '1.6rem', fontWeight: 700,
                      color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0,
                    }}>
                      {step.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p style={{ color: '#999', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {step.desc}
                </p>

                {/* Technical details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {step.details.map((detail, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      fontSize: '0.85rem', color: '#aaa',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <span style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: step.color, flexShrink: 0, boxShadow: `0 0 8px ${step.color}`,
                      }} />
                      {detail}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connector line to next step */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', bottom: '-2rem', left: '50%', transform: 'translateX(-50%)',
                  width: '2px', height: '2rem',
                  background: `linear-gradient(to bottom, ${step.color}40, transparent)`,
                }} />
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Footer ── */}
        <footer style={{
          padding: '3rem 2rem', textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(3,1,6,0.8)',
        }}>
          <p style={{ color: '#555', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
            AssignAI Architecture — Engineered by Mohamed Fazil Pasha
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
