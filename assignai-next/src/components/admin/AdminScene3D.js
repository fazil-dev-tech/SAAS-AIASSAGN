"use client";
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Line, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// ── CYBER GLOBE ──
const CyberGlobe = () => {
  const groupRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, -6]}>
      <Float speed={1} rotationIntensity={0.5} floatIntensity={1}>
        {/* Core Sphere */}
        <mesh scale={3.8}>
          <icosahedronGeometry args={[1, 4]} />
          <meshBasicMaterial color="#020617" wireframe={false} transparent opacity={0.9} />
        </mesh>
        
        {/* Wireframe Matrix */}
        <mesh scale={3.82}>
          <icosahedronGeometry args={[1, 4]} />
          <meshBasicMaterial color="#ec4899" wireframe transparent opacity={0.3} />
        </mesh>

        {/* Orbiting Security Rings */}
        <mesh rotation={[Math.PI / 2.2, 0, 0]} scale={5.5}>
          <torusGeometry args={[1, 0.005, 16, 100]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 1.8, Math.PI / 4, 0]} scale={5.0}>
          <torusGeometry args={[1, 0.003, 16, 100]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
        </mesh>
      </Float>
    </group>
  );
};

// ── FLOATING ENCRYPTED PARTICLES ──
const DataParticles = ({ count = 200 }) => {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed / 2;
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);
      
      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <dodecahedronGeometry args={[0.3, 0]} />
      <meshBasicMaterial color="#d946ef" transparent opacity={0.6} wireframe />
    </instancedMesh>
  );
};

export default function AdminScene3D() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#020617']} />
        
        <ambientLight intensity={0.5} />
        
        <CyberGlobe />
        <DataParticles count={150} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} opacity={2.5} intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
