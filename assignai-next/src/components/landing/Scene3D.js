"use client";
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Stars, Sparkles, Line, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Mouse tracking for parallax
function Rig() {
  const { camera, mouse } = useThree();
  const vec = new THREE.Vector3();

  return useFrame((state) => {
    camera.position.lerp(vec.set(mouse.x * 2.5, mouse.y * 2.5, camera.position.z), 0.05);
    camera.lookAt(0, 0, 0);
  });
}

// Sophisticated abstract wireframe core
const NeuralCore = () => {
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
    <group position={[0, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
        <mesh ref={coreRef} scale={1.8}>
          <icosahedronGeometry args={[1, 2]} />
          <meshPhysicalMaterial 
            color="#0a0a0a"
            emissive="#db2777"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
            wireframe={true}
            transparent
            opacity={0.3}
          />
        </mesh>
        
        <mesh ref={outerRef} scale={2.5}>
          <icosahedronGeometry args={[1, 1]} />
          <meshPhysicalMaterial 
            color="#db2777"
            wireframe={true}
            transparent
            opacity={0.15}
            roughness={0.1}
            metalness={1}
          />
        </mesh>
        
        {/* Inner solid glowing core */}
        <mesh scale={0.5}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#fce7f3" />
        </mesh>
      </Float>
    </group>
  );
};

// Dynamic connecting lines representing neural/AI network
const NetworkLines = () => {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < 40; i++) {
      p.push(new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10 - 5
      ));
    }
    return p;
  }, []);

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
  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // Prevent SSR hydration mismatch

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 50%, #17072b 0%, #050209 100%)' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ec4899" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
        
        <NeuralCore />
        <NetworkLines />
        
        {/* Cinematic Particles */}
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={300} scale={15} size={4} speed={0.4} opacity={0.4} color="#fbcfe8" noise={1} />
        <Sparkles count={150} scale={20} size={6} speed={0.6} opacity={0.2} color="#8b5cf6" noise={2} />
        
        {/* Infinite Grid for extreme depth scale */}
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
        
        <Rig />

        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.1} mipmapBlur intensity={1.5} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.001, 0.001]} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
