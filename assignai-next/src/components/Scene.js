'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Environment, Lightformer, Grid, Trail } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

function DataParticles({ count = 1500 }) {
  const points = useRef();
  const { mouse, viewport } = useThree();

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line react-hooks/purity
      p[i * 3] = (Math.random() - 0.5) * 30;
      // eslint-disable-next-line react-hooks/purity
      p[i * 3 + 1] = (Math.random() - 0.5) * 30;
      // eslint-disable-next-line react-hooks/purity
      p[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return p;
  }, [count]);

  useFrame((state, delta) => {
    if (points.current) {
      points.current.rotation.z -= delta * 0.05;
      points.current.position.x += (mouse.x * viewport.width * 0.02 - points.current.position.x) * 0.05;
      points.current.position.y += (mouse.y * viewport.height * 0.02 - points.current.position.y) * 0.05;
    }
  });

  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#fbcfe8" size={0.04} sizeAttenuation={true} depthWrite={false} opacity={0.6} />
    </Points>
  );
}

function ConcentricRings() {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth, professional rotation
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Outer Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6, 0.015, 16, 100]} />
        <meshBasicMaterial color="#db2777" transparent opacity={0.3} />
      </mesh>
      
      {/* Middle Ring - Wireframe */}
      <mesh rotation={[Math.PI / 2.2, 0.1, 0]}>
        <torusGeometry args={[4.5, 0.4, 8, 50]} />
        <meshStandardMaterial color="#ec4899" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Inner Data Ring */}
      <mesh rotation={[Math.PI / 1.8, -0.1, 0]}>
        <torusGeometry args={[3, 0.03, 16, 100]} />
        <meshBasicMaterial color="#f472b6" transparent opacity={0.6} />
      </mesh>

      {/* Core Glowing Sphere */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshPhysicalMaterial 
          color="#ec4899" 
          emissive="#be185d"
          emissiveIntensity={2}
          transmission={0.9} 
          opacity={1} 
          metalness={0.5} 
          roughness={0.1} 
          ior={1.5} 
          thickness={1}
        />
      </mesh>
    </group>
  );
}

function TechGrid() {
  return (
    <group position={[0, -4, 0]}>
      <Grid 
        args={[40, 40]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#86198f" 
        sectionSize={4} 
        sectionThickness={1.5} 
        sectionColor="#ec4899" 
        fadeDistance={25} 
        fadeStrength={1} 
      />
    </group>
  );
}

export default function Scene() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <color attach="background" args={['#09010e']} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 0]} intensity={5} color="#ec4899" distance={10} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={2} color="#f472b6" />

        <DataParticles count={2000} />
        
        {/* The Professional Grid and Rotating Circles */}
        <TechGrid />
        <ConcentricRings />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} color="#ff69b4" />
          </group>
        </Environment>

        <EffectComposer disableNormalPass multisampling={4}>
          <Bloom luminanceThreshold={0.2} mipmapBlur luminanceSmoothing={0.9} intensity={2} />
          <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
          <ChromaticAberration offset={[0.001, 0.001]} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>

      </Canvas>
    </div>
  );
}
