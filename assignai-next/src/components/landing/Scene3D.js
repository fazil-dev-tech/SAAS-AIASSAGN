"use client";
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Stars, Line, Sphere, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

// ── GLOBAL SCROLL TRACKER ──
// We track scroll manually so the 3D camera can react to the standard HTML scrollbar without hijacking it.
const useScrollPos = () => {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      // Normalize scroll between 0 and 1 based on body height vs window height
      const h = document.documentElement;
      const b = document.body;
      const st = 'scrollTop';
      const sh = 'scrollHeight';
      const percent = (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight);
      setScroll(percent || 0);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scroll;
};

// ── PREMIUM GLASS MATERIAL ──
const getPremiumGlass = () => new THREE.MeshPhysicalMaterial({
  color: "#ffffff",
  metalness: 0.9,
  roughness: 0.1,
  transmission: 1.0, // glass effect
  ior: 1.5,
  thickness: 2.0,
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide
});

// ── HERO SCENE (The Core) ──
const HeroCore = () => {
  const groupRef = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.1;
      groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z = -t * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Inner intricate geometry */}
        <mesh scale={1.5}>
          <icosahedronGeometry args={[1, 1]} />
          <meshPhysicalMaterial color="#ffffff" wireframe transparent opacity={0.15} />
        </mesh>
        
        {/* Outer Premium Glass Shell */}
        <mesh scale={1.8} material={getPremiumGlass()}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>

        {/* Floating Data Ring */}
        <mesh ref={ringRef} scale={3.5}>
          <torusGeometry args={[1, 0.005, 16, 100]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
        </mesh>
      </Float>
    </group>
  );
};

// ── ANIMATED RINGS ──
const AnimatedRing = ({ color, scale }) => {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.x = Math.PI / 2;
      ref.current.rotation.z = t * 0.5;
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      ref.current.scale.set(scale * pulse, scale * pulse, scale * pulse);
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
};

// ── ARCHITECTURE SCENE (The Nodes) ──
const ArchitectureNodes = ({ isMobile }) => {
  const nodes = [
    { pos: [-4, -12, -2], label: "1. Client Input", color: "#3b82f6" },
    { pos: [0, -10, -5], label: "2. AssignAI Engine", color: "#a855f7" },
    { pos: [4, -13, 0], label: "3. Formatted Document", color: "#10b981" }
  ];

  // Adjust for mobile stacking
  if (isMobile) {
    nodes[0].pos = [0, -10, 0];
    nodes[1].pos = [0, -13, -2];
    nodes[2].pos = [0, -16, 0];
  }

  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Node 1 */}
      <Float speed={1.5} floatIntensity={0.5}>
        <mesh position={nodes[0].pos} material={getPremiumGlass()}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
        </mesh>
        <Sphere position={nodes[0].pos} args={[0.3, 16, 16]}>
          <meshBasicMaterial color={nodes[0].color} />
        </Sphere>
        <group position={nodes[0].pos}>
          <AnimatedRing color={nodes[0].color} scale={1.2} />
          <Html position={[0, 1.5, 0]} center transform sprite zIndexRange={[100, 0]}>
            <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${nodes[0].color}`, padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '10px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {nodes[0].label}
            </div>
          </Html>
        </group>
      </Float>

      {/* Node 2 */}
      <Float speed={2} floatIntensity={0.8} rotationIntensity={1}>
        <mesh position={nodes[1].pos} material={getPremiumGlass()}>
          <octahedronGeometry args={[2, 0]} />
        </mesh>
        <Sphere position={nodes[1].pos} args={[0.5, 16, 16]}>
          <meshBasicMaterial color={nodes[1].color} />
        </Sphere>
        <group position={nodes[1].pos}>
          <AnimatedRing color={nodes[1].color} scale={1.6} />
          <AnimatedRing color={nodes[1].color} scale={1.8} />
          <Html position={[0, 2.2, 0]} center transform sprite zIndexRange={[100, 0]}>
            <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${nodes[1].color}`, padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '10px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {nodes[1].label}
            </div>
          </Html>
        </group>
      </Float>

      {/* Node 3 */}
      <Float speed={1.2} floatIntensity={0.4}>
        <mesh position={nodes[2].pos} material={getPremiumGlass()}>
          <cylinderGeometry args={[1, 1, 2, 32]} />
        </mesh>
        <Sphere position={nodes[2].pos} args={[0.4, 16, 16]}>
          <meshBasicMaterial color={nodes[2].color} />
        </Sphere>
        <group position={nodes[2].pos}>
          <AnimatedRing color={nodes[2].color} scale={1.2} />
          <Html position={[0, 1.8, 0]} center transform sprite zIndexRange={[100, 0]}>
            <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${nodes[2].color}`, padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '10px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {nodes[2].label}
            </div>
          </Html>
        </group>
      </Float>

      {/* Connecting Data Lines */}
      <Line points={[nodes[0].pos, nodes[1].pos]} color="#ffffff" opacity={0.2} transparent lineWidth={1} dashed dashScale={10} />
      <Line points={[nodes[1].pos, nodes[2].pos]} color="#ffffff" opacity={0.2} transparent lineWidth={1} dashed dashScale={10} />
      
      {/* Moving Data Packets */}
      <DataPacket start={nodes[0].pos} end={nodes[1].pos} color={nodes[0].color} delay={0} />
      <DataPacket start={nodes[1].pos} end={nodes[2].pos} color={nodes[1].color} delay={0.5} />
    </group>
  );
};

const DataPacket = ({ start, end, color, delay }) => {
  const ref = useRef();
  useFrame((state) => {
    const t = (state.clock.elapsedTime * 0.5 + delay) % 1; // 0 to 1 looping
    if (ref.current) {
      ref.current.position.lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), t);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

// ── INTERACTIVE PARTICLES (Mouse Repelling) ──
const InteractiveParticles = ({ isMobile }) => {
  const count = isMobile ? 800 : 2500;
  const [data, setData] = useState(null);

  useEffect(() => {
    const p = new Float32Array(count * 3);
    const op = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      p[i * 3] = op[i * 3] = x;
      p[i * 3 + 1] = op[i * 3 + 1] = y;
      p[i * 3 + 2] = op[i * 3 + 2] = z;
      
      const mixedColor = Math.random() > 0.5 ? '#ffffff' : '#a855f7';
      color.set(mixedColor);
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    setTimeout(() => setData([p, op, c]), 0);
  }, [count]);

  const pointsRef = useRef();
  const { mouse, camera } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state) => {
    if (!pointsRef.current || !data) return;
    const [positions, originalPositions] = data;
    const time = state.clock.elapsedTime;
    
    // Convert mouse to 3D world space (approximate projection)
    vec.set(mouse.x * 20, mouse.y * 20, 0);
    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = 10;
    const mouseWorld = camera.position.clone().add(vec.multiplyScalar(distance));

    const positionsArray = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const ox = originalPositions[idx];
      const oy = originalPositions[idx + 1];
      
      const dx = mouseWorld.x - ox;
      const dy = mouseWorld.y - oy;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 4) {
        const force = (4 - dist) / 4;
        positionsArray[idx] = ox - dx * force * 0.8;
        positionsArray[idx + 1] = oy - dy * force * 0.8;
      } else {
        positionsArray[idx] += (ox - positionsArray[idx]) * 0.05;
        positionsArray[idx + 1] += (oy - positionsArray[idx + 1]) * 0.05;
      }
      positionsArray[idx] += Math.sin(time * 0.5 + idx) * 0.02;
      positionsArray[idx + 1] += Math.cos(time * 0.5 + idx) * 0.02;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = time * 0.02;
  });

  if (!data) return null;
  const [positions, originalPositions, colors] = data;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={isMobile ? 0.08 : 0.06} vertexColors transparent opacity={0.6} sizeAttenuation={true} />
    </points>
  );
};

// ── CAMERA RIG ──
// Interpolates camera position based on normalized scroll percentage.
const CameraRig = ({ scroll, isMobile }) => {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  const targetLook = new THREE.Vector3();

  useFrame(() => {
    // Scroll 0 = Hero. Scroll 1 = Bottom of page.
    // We want the camera to move down to the architecture nodes as we scroll.
    
    // Smooth scroll interpolation
    const scrollDepth = scroll * 18; // Move camera down by 18 units max

    if (isMobile) {
      targetPos.set(0, -scrollDepth, 12);
    } else {
      // Add subtle mouse parallax on desktop
      targetPos.set(mouse.x * 2, -scrollDepth + (mouse.y * 1), 10);
    }
    
    camera.position.lerp(targetPos, 0.05);
    
    // Look at target moves down with scroll
    targetLook.set(0, -scrollDepth, 0);
    
    // Create a temporary quaternion to store the target rotation
    const currentRot = camera.quaternion.clone();
    camera.lookAt(targetLook);
    const targetRot = camera.quaternion.clone();
    
    // Revert and slerp for ultra smooth looking
    camera.quaternion.copy(currentRot);
    camera.quaternion.slerp(targetRot, 0.05);
  });
  
  return null;
};

// ── POSTPROCESSING WRAPPER ──
// Defers rendering to ensure WebGL context is fully initialized and prevents 'alpha' of null errors.
const PostProcessing = ({ isMobile }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);
  
  if (!ready) return null;
  return (
    <EffectComposer key={isMobile ? 'mobile' : 'desktop'} disableNormalPass multisampling={isMobile ? 0 : 4}>
      <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.2} radius={0.5} />
      <Noise opacity={0.03} />
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
    </EffectComposer>
  );
};

// ── MAIN SCENE EXPORT ──
export default function Scene3D() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scroll = useScrollPos();

  useEffect(() => {
    let active = true;
    const checkMobile = () => { if (active) setIsMobile(window.innerWidth < 768); };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    setTimeout(() => { if (active) setMounted(true); }, 0);
    return () => { active = false; window.removeEventListener('resize', checkMobile); };
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', background: '#000000', overflow: 'hidden' }}>
      
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }} dpr={isMobile ? 1 : [1, 2]}>
        <color attach="background" args={['#000000']} />
        
        {/* Lighting critical for glassmorphism */}
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} intensity={2} color="#ffffff" penumbra={1} />
        <spotLight position={[-10, 0, -10]} intensity={2} color="#a855f7" penumbra={1} />
        <spotLight position={[0, -20, 0]} intensity={2} color="#3b82f6" penumbra={1} />
        
        {/* Environment map for realistic glass reflections (studio lighting) */}
        <Environment preset="studio" />

        <HeroCore />
        <ArchitectureNodes isMobile={isMobile} />
        
        {/* Deep Space Background Interactive Particles */}
        <InteractiveParticles isMobile={isMobile} />

        <CameraRig scroll={scroll} isMobile={isMobile} />

        {/* Minimal, professional post-processing */}
        <PostProcessing isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
