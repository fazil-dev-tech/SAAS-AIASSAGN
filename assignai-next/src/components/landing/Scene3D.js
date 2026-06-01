"use client";
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Stars, Sparkles, Line, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Mouse tracking for parallax
function Rig({ isMobile }) {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();

  return useFrame((state) => {
    if (isMobile) {
      // Smooth automatic pan for mobile instead of erratic touch jumps
      camera.position.lerp(vec.set(Math.sin(state.clock.elapsedTime * 0.2) * 1.5, Math.cos(state.clock.elapsedTime * 0.2) * 1.5, 12), 0.02);
    } else {
      camera.position.lerp(vec.set(mouse.x * 2.5, mouse.y * 2.5, 10), 0.05);
    }
    camera.lookAt(0, 0, 0);
  });
}

// Sophisticated abstract wireframe core
const NeuralCore = ({ isMobile }) => {
  const coreRef = useRef();
  const outerRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.15;
      coreRef.current.rotation.x = t * 0.1;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y = -t * 0.1;
      outerRef.current.rotation.z = t * 0.05;
      
      // Gentle pulsing effect
      const scale = 1 + Math.sin(t * 2) * 0.05;
      outerRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, isMobile ? -3.5 : 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
        <mesh ref={coreRef} scale={1.8}>
          <icosahedronGeometry args={[1, 2]} />
          {isMobile ? (
            <meshBasicMaterial color="#ff007f" wireframe transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          ) : (
            <meshPhysicalMaterial 
              color="#0a0a0a" emissive="#db2777" emissiveIntensity={0.6}
              roughness={0.2} metalness={0.8} wireframe transparent opacity={0.3}
            />
          )}
        </mesh>
        
        <mesh ref={outerRef} scale={2.5}>
          <icosahedronGeometry args={[1, 1]} />
          {isMobile ? (
            <meshBasicMaterial color="#db2777" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
          ) : (
            <meshPhysicalMaterial 
              color="#db2777" emissive="#000000" emissiveIntensity={0}
              wireframe transparent opacity={0.15} roughness={0.1} metalness={1}
            />
          )}
        </mesh>
        
        {/* Inner solid glowing core */}
        <mesh scale={0.5}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color={isMobile ? "#ffffff" : "#fce7f3"} />
        </mesh>

        {/* Fake Bloom Glow for mobile */}
        {isMobile && (
          <mesh scale={3.5}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial 
              color="#db2777" 
              transparent 
              opacity={0.15} 
              blending={THREE.AdditiveBlending} 
              depthWrite={false}
            />
          </mesh>
        )}
      </Float>
    </group>
  );
};

// Dynamic connecting lines representing neural/AI network
const NetworkLines = ({ isMobile }) => {
  const points = useMemo(() => {
    const p = [];
    const count = isMobile ? 15 : 40;
    for (let i = 0; i < count; i++) {
      p.push(new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10 - 5
      ));
    }
    return p;
  }, [isMobile]);

  const linesRef = useRef();
  
  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      linesRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
    }
  });

  return (
    <group ref={linesRef}>
      {points.map((p1, i) => 
        points.slice(i + 1, i + 3).map((p2, j) => (
          <Line
            key={`${i}-${j}`}
            points={[p1, p2]}
            color="#ec4899"
            opacity={0.15}
            transparent
            lineWidth={1.5}
          />
        ))
      )}
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#fbcfe8" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

export default function Scene3D() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return null; // Prevent SSR hydration mismatch

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 50%, #17072b 0%, #050209 100%)', overflow: 'hidden' }}>
      
      {/* Pure CSS Fallback: Guaranteed to show even if WebGL completely crashes in WhatsApp/Embedded browsers */}
      {isMobile && (
        <div style={{ position: 'absolute', top: '70%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,127,0.4) 0%, rgba(219,39,119,0.1) 40%, transparent 70%)', boxShadow: '0 0 100px rgba(255,0,127,0.3)', zIndex: 1 }} />
      )}

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={isMobile ? 1 : [1, 2]} style={{ position: 'relative', zIndex: 2 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ec4899" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
        
        <NeuralCore isMobile={isMobile} />
        {!isMobile && <NetworkLines isMobile={isMobile} />}
        
        {/* Cinematic Particles */}
        <Stars radius={100} depth={50} count={isMobile ? 300 : 2000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={isMobile ? 50 : 300} scale={15} size={isMobile ? 6 : 4} speed={0.4} opacity={isMobile ? 0.8 : 0.4} color="#fbcfe8" noise={1} />
        {!isMobile && <Sparkles count={150} scale={20} size={6} speed={0.6} opacity={0.2} color="#8b5cf6" noise={2} />}
        
        {/* Infinite Grid for extreme depth scale */}
        {!isMobile && (
          <Grid 
            position={[0, -4, 0]} 
            args={[20, 20]} 
            cellSize={1} 
            cellThickness={0.5} 
            cellColor="#db2777" 
            sectionSize={4} 
            sectionThickness={1} 
            sectionColor="#ec4899" 
            fadeDistance={25} 
            fadeStrength={1} 
          />
        )}
        
        <Rig isMobile={isMobile} />

        {!isMobile && (
          <EffectComposer disableNormalPass multisampling={4}>
            <Bloom luminanceThreshold={0.2} mipmapBlur={true} intensity={1.5} />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.001, 0.001]} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
