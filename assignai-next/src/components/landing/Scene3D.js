"use client";
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ── CIRCULAR PARTICLE TEXTURE ──
// Creates a soft circular glow texture via canvas, replacing WebGL's
// default square point rendering with smooth round particles.
const createCircleTexture = () => {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// Singleton — shared by all particle layers
let _circleTexture = null;
const getCircleTexture = () => {
  if (!_circleTexture) _circleTexture = createCircleTexture();
  return _circleTexture;
};

// ── WEBGL SUPPORT DETECTION ──
const checkWebGLSupport = () => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
};

// ── GLOBAL SCROLL TRACKER (passive for perf) ──
const useScrollPos = () => {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement;
      const b = document.body;
      const percent = (h.scrollTop || b.scrollTop) / ((h.scrollHeight || b.scrollHeight) - h.clientHeight);
      setScroll(Math.min(percent || 0, 1));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scroll;
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 1 — DEEP SPACE STARFIELD WITH TWINKLING
//  8000+ points in a vast sphere with realistic color temperature
//  distribution. Stars individually twinkle via vertex shader-like
//  opacity modulation in the animation loop.
// ═══════════════════════════════════════════════════════════════
const DeepStarField = ({ isMobile }) => {
  const ref = useRef();
  const count = isMobile ? 4000 : 9000;

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 20 + Math.pow(Math.random(), 0.55) * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Realistic star color temperature distribution
      const temp = Math.random();
      if (temp > 0.88) {
        // O/B class — hot blue-white
        col[i * 3] = 0.72 + Math.random() * 0.28;
        col[i * 3 + 1] = 0.85 + Math.random() * 0.15;
        col[i * 3 + 2] = 1.0;
      } else if (temp > 0.72) {
        // K/M class — warm amber
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.85 + Math.random() * 0.1;
        col[i * 3 + 2] = 0.55 + Math.random() * 0.25;
      } else {
        // G class — white
        const b = 0.82 + Math.random() * 0.18;
        col[i * 3] = b;
        col[i * 3 + 1] = b;
        col[i * 3 + 2] = b + Math.random() * 0.06;
      }
      // Random size variation for depth
      siz[i] = 0.04 + Math.random() * (isMobile ? 0.1 : 0.08);
    }
    return [pos, col, siz];
  }, [count, isMobile]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.0018;
    ref.current.rotation.x = Math.sin(t * 0.0007) * 0.012;
    // Subtle opacity pulse for twinkle effect
    ref.current.material.opacity = 0.88 + Math.sin(t * 0.5) * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={getCircleTexture()}
        size={isMobile ? 0.12 : 0.1}
        vertexColors
        transparent
        opacity={0.92}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 2 — GALAXY SPIRAL ARMS (Enhanced 6-arm)
//  Logarithmic spiral with 6 arms, denser core, and 3-stop
//  color gradient from hot pink center to cool cyan at tips.
//  Enhanced with tighter spiral and more particles for density.
// ═══════════════════════════════════════════════════════════════
const GalaxySpiralArms = ({ isMobile }) => {
  const ref = useRef();
  const count = isMobile ? 2500 : 6000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const cCore = new THREE.Color('#ff2d95');
    const cMid = new THREE.Color('#a855f7');
    const cEdge = new THREE.Color('#00e5ff');

    for (let i = 0; i < count; i++) {
      const radius = Math.pow(Math.random(), 0.65) * 9;
      const spin = radius * 2.8;
      const arms = 6;
      const branch = ((i % arms) * Math.PI * 2) / arms;

      // Gaussian scatter that increases with radius
      const scatter = 0.12 + radius * 0.065;
      const rx = (Math.random() - 0.5) * scatter * 2;
      const ry = (Math.random() - 0.5) * scatter * 0.4;
      const rz = (Math.random() - 0.5) * scatter * 2;

      pos[i * 3] = Math.cos(branch + spin) * radius + rx;
      pos[i * 3 + 1] = ry;
      pos[i * 3 + 2] = Math.sin(branch + spin) * radius + rz;

      // 3-stop gradient: core → mid → edge
      const t = radius / 9;
      const mixed = t < 0.35
        ? cCore.clone().lerp(cMid, t / 0.35)
        : cMid.clone().lerp(cEdge, (t - 0.35) / 0.65);

      col[i * 3] = mixed.r;
      col[i * 3 + 1] = mixed.g;
      col[i * 3 + 2] = mixed.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.018;
  });

  const galPos = isMobile ? [0, -0.5, -3] : [3, 0.3, -2];

  return (
    <points ref={ref} position={galPos}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={getCircleTexture()}
        size={isMobile ? 0.08 : 0.06}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 3 — COSMIC NEBULA DUST
//  Larger, softer particles for volumetric depth. Three nebula
//  colors: deep violet, teal, and hot rose with animated drift.
// ═══════════════════════════════════════════════════════════════
const CosmicDust = ({ isMobile }) => {
  const ref = useRef();
  const count = isMobile ? 300 : 600;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;

      const t = Math.random();
      if (t > 0.6) {
        col[i * 3] = 0.38; col[i * 3 + 1] = 0.15; col[i * 3 + 2] = 0.78;
      } else if (t > 0.3) {
        col[i * 3] = 0.05; col[i * 3 + 1] = 0.58; col[i * 3 + 2] = 0.88;
      } else {
        col[i * 3] = 0.78; col[i * 3 + 1] = 0.12; col[i * 3 + 2] = 0.52;
      }
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.005;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.003) * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={getCircleTexture()}
        size={0.5}
        vertexColors
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 4 — WIREFRAME STRUCTURES WITH INNER GLOW
//  Floating geometric shapes rendered as wireframes with a
//  glowing inner sphere for an "energy core" effect.
//  5 shapes: icosahedron, dodecahedron, torus knot, octahedron,
//  and a tetrahedron — each with slow rotation.
// ═══════════════════════════════════════════════════════════════
const WireframeStructures = ({ isMobile }) => {
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef()];

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (refs[0].current) { refs[0].current.rotation.x = t * 0.08; refs[0].current.rotation.y = t * 0.06; }
    if (refs[1].current) { refs[1].current.rotation.y = t * 0.11; refs[1].current.rotation.z = t * 0.04; }
    if (refs[2].current) { refs[2].current.rotation.x = -t * 0.07; refs[2].current.rotation.z = t * 0.09; }
    if (refs[3].current) { refs[3].current.rotation.y = -t * 0.05; refs[3].current.rotation.x = t * 0.03; }
    if (refs[4].current) { refs[4].current.rotation.z = t * 0.1; refs[4].current.rotation.y = -t * 0.07; }
  });

  const structures = [
    { pos: isMobile ? [-2.5, 3, -9] : [-7, 2.5, -12], geo: 'icosahedron', args: [2.8, 1], color: '#a855f7', opacity: 0.12, glow: 0.15 },
    { pos: isMobile ? [2.5, -4, -7] : [7, -2.5, -10], geo: 'dodecahedron', args: [2, 0], color: '#00e5ff', opacity: 0.1, glow: 0.12 },
    { pos: isMobile ? [0, 6, -14] : [-5, 6, -18], geo: 'torusKnot', args: [1.8, 0.25, 64, 8, 2, 3], color: '#ff0088', opacity: 0.07, glow: 0.1 },
    { pos: isMobile ? [3, 1.5, -11] : [9, 4, -14], geo: 'octahedron', args: [1.6, 0], color: '#ec4899', opacity: 0.12, glow: 0.14 },
    { pos: isMobile ? [-3, -5, -12] : [-9, -3, -16], geo: 'tetrahedron', args: [2.2, 0], color: '#f59e0b', opacity: 0.08, glow: 0.1 },
  ];

  const getGeometry = (geo, args) => {
    switch (geo) {
      case 'icosahedron': return <icosahedronGeometry args={args} />;
      case 'dodecahedron': return <dodecahedronGeometry args={args} />;
      case 'torusKnot': return <torusKnotGeometry args={args} />;
      case 'octahedron': return <octahedronGeometry args={args} />;
      case 'tetrahedron': return <tetrahedronGeometry args={args} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <group>
      {structures.map((s, i) => (
        <Float key={i} speed={0.5 + i * 0.15} rotationIntensity={0.12} floatIntensity={0.25 + i * 0.08}>
          {/* Wireframe shell */}
          <mesh ref={refs[i]} position={s.pos}>
            {getGeometry(s.geo, s.args)}
            <meshBasicMaterial color={s.color} wireframe transparent opacity={s.opacity} depthWrite={false} />
          </mesh>
          {/* Inner glow sphere */}
          <mesh position={s.pos}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshBasicMaterial color={s.color} transparent opacity={s.glow} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </Float>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 5 — ORBITAL RINGS (Enhanced with particle trail ring)
//  Concentric torus rings at different tilts plus a dotted
//  particle ring that simulates orbiting debris/data.
// ═══════════════════════════════════════════════════════════════
const OrbitalRings = ({ isMobile }) => {
  const r1 = useRef(), r2 = useRef(), r3 = useRef(), r4 = useRef();
  const particleRingRef = useRef();

  // Particle ring — dots orbiting the galaxy core
  const particleCount = isMobile ? 200 : 400;
  const particlePositions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 3.8 + (Math.random() - 0.5) * 0.4;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, [particleCount]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (r1.current) { r1.current.rotation.x = Math.PI / 2.2; r1.current.rotation.z = t * 0.1; }
    if (r2.current) { r2.current.rotation.y = Math.PI / 3.5; r2.current.rotation.x = -t * 0.07; }
    if (r3.current) { r3.current.rotation.z = Math.PI / 2.8; r3.current.rotation.y = t * 0.05; }
    if (r4.current) { r4.current.rotation.x = Math.PI / 4; r4.current.rotation.z = -t * 0.04; }
    if (particleRingRef.current) {
      particleRingRef.current.rotation.x = Math.PI / 2.5;
      particleRingRef.current.rotation.z = t * 0.15;
    }
  });

  const center = isMobile ? [0, -0.5, -3] : [3, 0.3, -2];

  const rings = [
    { ref: r1, radius: 3.2, tube: 0.012, color: '#00e5ff', opacity: 0.5 },
    { ref: r2, radius: 4.5, tube: 0.008, color: '#a855f7', opacity: 0.35 },
    { ref: r3, radius: 5.8, tube: 0.005, color: '#ff0088', opacity: 0.22 },
    { ref: r4, radius: 7.2, tube: 0.003, color: '#00e5ff', opacity: 0.12 },
  ];

  return (
    <group position={center}>
      {rings.map((ring, i) => (
        <mesh key={i} ref={ring.ref}>
          <torusGeometry args={[ring.radius, ring.tube, 16, 128]} />
          <meshBasicMaterial color={ring.color} transparent opacity={ring.opacity} depthWrite={false} />
        </mesh>
      ))}
      {/* Particle trail ring */}
      <points ref={particleRingRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={particlePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          map={getCircleTexture()}
          size={0.06}
          color="#00e5ff"
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 6 — GLOWING CORE WITH ENERGY RAYS
//  Brilliant galaxy center with three concentric pulsing spheres
//  plus radial "energy burst" rays emanating outward.
// ═══════════════════════════════════════════════════════════════
const GlowingCore = ({ isMobile }) => {
  const coreRef = useRef();
  const midRef = useRef();
  const haloRef = useRef();
  const raysRef = useRef();

  // Energy rays — thin lines emanating from center
  const rayCount = isMobile ? 12 : 24;
  const rayPositions = useMemo(() => {
    const pos = new Float32Array(rayCount * 2 * 3); // 2 vertices per line
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const innerR = 0.5;
      const outerR = 1.8 + Math.random() * 1.2;
      // Start point
      pos[i * 6] = Math.cos(angle) * innerR;
      pos[i * 6 + 1] = (Math.random() - 0.5) * 0.3;
      pos[i * 6 + 2] = Math.sin(angle) * innerR;
      // End point
      pos[i * 6 + 3] = Math.cos(angle) * outerR;
      pos[i * 6 + 4] = (Math.random() - 0.5) * 0.3;
      pos[i * 6 + 5] = Math.sin(angle) * outerR;
    }
    return pos;
  }, [rayCount]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.4 + Math.sin(t * 2.0) * 0.05);
    }
    if (midRef.current) {
      midRef.current.scale.setScalar(0.8 + Math.sin(t * 1.2) * 0.1);
      midRef.current.material.opacity = 0.3 + Math.sin(t * 1.6) * 0.08;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1.4 + Math.sin(t * 0.7) * 0.18);
      haloRef.current.material.opacity = 0.1 + Math.sin(t * 1.0) * 0.04;
    }
    if (raysRef.current) {
      raysRef.current.rotation.z = t * 0.08;
      raysRef.current.material.opacity = 0.08 + Math.sin(t * 1.5) * 0.04;
    }
  });

  const center = isMobile ? [0, -0.5, -3] : [3, 0.3, -2];

  return (
    <group position={center}>
      {/* Energy burst rays */}
      <lineSegments ref={raysRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={rayCount * 2} array={rayPositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#00e5ff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      {/* Inner white-hot core */}
      <mesh ref={coreRef} scale={0.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Mid cyan glow */}
      <mesh ref={midRef} scale={0.8}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Outer violet halo */}
      <mesh ref={haloRef} scale={1.4}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 7 — SHOOTING STARS
//  Animated streak particles that fly across the field on random
//  trajectories. Each one has a brief lifespan with fade-in and
//  fade-out, creating meteor-like visuals.
// ═══════════════════════════════════════════════════════════════
const ShootingStars = ({ isMobile }) => {
  const count = isMobile ? 4 : 8;
  const meshRefs = useRef([]);
  const trailRefs = useRef([]);

  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        speed: 4 + Math.random() * 6,
        delay: Math.random() * 12,
        duration: 1.5 + Math.random() * 2,
        startX: (Math.random() - 0.5) * 40,
        startY: 5 + Math.random() * 15,
        startZ: -10 - Math.random() * 20,
        dirX: (Math.random() - 0.5) * 0.6,
        dirY: -0.8 - Math.random() * 0.4,
        dirZ: -0.3 + Math.random() * 0.6,
        color: ['#ffffff', '#00e5ff', '#a855f7', '#ff0088'][Math.floor(Math.random() * 4)],
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    stars.forEach((star, i) => {
      const head = meshRefs.current[i];
      const tail = trailRefs.current[i];
      if (!head || !tail) return;

      const cycle = star.delay + star.duration;
      const phase = (t % (cycle + 8)) - star.delay;

      if (phase < 0 || phase > star.duration) {
        head.visible = false;
        tail.visible = false;
        return;
      }

      head.visible = true;
      tail.visible = true;

      const progress = phase / star.duration;
      const fadeIn = Math.min(progress * 5, 1);
      const fadeOut = Math.min((1 - progress) * 3, 1);
      const alpha = fadeIn * fadeOut;

      const x = star.startX + star.dirX * star.speed * phase;
      const y = star.startY + star.dirY * star.speed * phase;
      const z = star.startZ + star.dirZ * star.speed * phase;

      head.position.set(x, y, z);
      head.material.opacity = alpha * 0.9;
      head.scale.setScalar(0.08 + alpha * 0.06);

      // Trail behind the head
      const trailLen = 1.5;
      tail.position.set(
        x - star.dirX * trailLen,
        y - star.dirY * trailLen,
        z - star.dirZ * trailLen,
      );
      tail.material.opacity = alpha * 0.3;
      tail.scale.set(0.02, 0.02, trailLen);
      tail.lookAt(x, y, z);
    });
  });

  return (
    <group>
      {stars.map((star, i) => (
        <React.Fragment key={i}>
          {/* Head glow */}
          <mesh ref={(el) => meshRefs.current[i] = el} visible={false}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={star.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* Trail streak */}
          <mesh ref={(el) => trailRefs.current[i] = el} visible={false}>
            <cylinderGeometry args={[1, 0.1, 1, 4]} />
            <meshBasicMaterial color={star.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 8 — CONSTELLATION GRID (Neural Network Effect)
//  Faint connected nodes creating a data-mesh / neural-network
//  visual. Nodes pulse independently and connecting lines fade
//  in and out, creating a living data-fabric in the background.
// ═══════════════════════════════════════════════════════════════
const ConstellationGrid = ({ isMobile }) => {
  const pointsRef = useRef();
  const linesRef = useRef();
  const nodeCount = isMobile ? 30 : 60;
  const connectionThreshold = isMobile ? 7 : 6;

  const [nodePositions, linePositions, lineCount] = useMemo(() => {
    const nodes = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      nodes[i * 3] = (Math.random() - 0.5) * 30;
      nodes[i * 3 + 1] = (Math.random() - 0.5) * 18;
      nodes[i * 3 + 2] = -8 - Math.random() * 20;
    }

    // Find connections (pairs within threshold distance)
    const lineVerts = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i * 3] - nodes[j * 3];
        const dy = nodes[i * 3 + 1] - nodes[j * 3 + 1];
        const dz = nodes[i * 3 + 2] - nodes[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < connectionThreshold) {
          lineVerts.push(
            nodes[i * 3], nodes[i * 3 + 1], nodes[i * 3 + 2],
            nodes[j * 3], nodes[j * 3 + 1], nodes[j * 3 + 2],
          );
        }
      }
    }
    return [nodes, new Float32Array(lineVerts), lineVerts.length / 3];
  }, [nodeCount, connectionThreshold]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.material.opacity = 0.25 + Math.sin(t * 0.8) * 0.08;
    }
    if (linesRef.current) {
      linesRef.current.material.opacity = 0.04 + Math.sin(t * 0.6) * 0.02;
      linesRef.current.rotation.y = t * 0.003;
    }
  });

  return (
    <group>
      {/* Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nodeCount} array={nodePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          map={getCircleTexture()}
          size={0.15}
          color="#a855f7"
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* Connection lines */}
      {lineCount > 0 && (
        <lineSegments ref={linesRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={lineCount} array={linePositions} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#a855f7" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
//  LAYER 9 — ENERGY VORTEX PARTICLES
//  Particles that spiral inward toward the galaxy core, creating
//  a gravitational vortex / data-flow ingestion visual.
// ═══════════════════════════════════════════════════════════════
const EnergyVortex = ({ isMobile }) => {
  const ref = useRef();
  const count = isMobile ? 150 : 300;

  const baseAngles = useMemo(() => {
    const angles = new Float32Array(count * 3); // angle, radius, height
    for (let i = 0; i < count; i++) {
      angles[i * 3] = Math.random() * Math.PI * 2;      // angle
      angles[i * 3 + 1] = 2 + Math.random() * 6;            // radius
      angles[i * 3 + 2] = (Math.random() - 0.5) * 1.5;     // height
    }
    return angles;
  }, [count]);

  const positions = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const geo = ref.current.geometry;
    const posArr = geo.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const baseAngle = baseAngles[i * 3];
      const baseRadius = baseAngles[i * 3 + 1];
      const baseHeight = baseAngles[i * 3 + 2];

      // Spiral inward over time, then reset
      const cycle = (t * 0.3 + baseAngle) % (Math.PI * 4);
      const spiralR = baseRadius * (1 - (cycle / (Math.PI * 4)) * 0.7);
      const angle = baseAngle + t * (0.5 + (1 / (spiralR + 0.5)) * 0.5);

      posArr[i * 3] = Math.cos(angle) * spiralR;
      posArr[i * 3 + 1] = baseHeight * (spiralR / baseRadius);
      posArr[i * 3 + 2] = Math.sin(angle) * spiralR;
    }
    geo.attributes.position.needsUpdate = true;
  });

  const center = isMobile ? [0, -0.5, -3] : [3, 0.3, -2];

  return (
    <points ref={ref} position={center}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={getCircleTexture()}
        size={0.05}
        color="#00e5ff"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ═══════════════════════════════════════════════════════════════
//  CAMERA RIG — smooth parallax + scroll depth travel
//  Mouse parallax on desktop, scroll-based vertical camera
//  movement for a cinematic "fly-through" as user scrolls.
// ═══════════════════════════════════════════════════════════════
const CameraRig = ({ scroll, isMobile }) => {
  const { camera } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
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
    const depth = scroll * 20;
    const mx = isMobile ? 0 : mouse.current.x;
    const my = isMobile ? 0 : mouse.current.y;

    // Camera moves deeper into the scene as user scrolls + mouse parallax
    targetPos.set(mx * 1.2, -depth + my * 0.6, 10 - scroll * 3);
    camera.position.lerp(targetPos, 0.03);

    targetLook.set(0, -depth * 0.8, -2);
    const savedQuat = camera.quaternion.clone();
    camera.lookAt(targetLook);
    const goalQuat = camera.quaternion.clone();
    camera.quaternion.copy(savedQuat);
    camera.quaternion.slerp(goalQuat, 0.03);
  });

  return null;
};

// ═══════════════════════════════════════════════════════════════
//  MAIN SCENE EXPORT
//  Orchestrates all 9 layers inside a single R3F Canvas.
//  Falls back to a CSS radial-gradient nebula if WebGL is
//  unavailable (e.g., old phones, SW-rendered headless browsers).
// ═══════════════════════════════════════════════════════════════
export default function Scene3D() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const scroll = useScrollPos();

  useEffect(() => {
    let active = true;
    const check = () => { if (active) setIsMobile(window.innerWidth < 768); };
    check();
    window.addEventListener('resize', check);
    setWebglSupported(checkWebGLSupport());
    requestAnimationFrame(() => { if (active) setMounted(true); });
    return () => { active = false; window.removeEventListener('resize', check); };
  }, []);

  if (!mounted) return null;

  const containerStyle = {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    zIndex: 0,
    pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 65% 35%, rgba(168, 85, 247, 0.14) 0%, rgba(0, 229, 255, 0.07) 25%, rgba(255, 0, 136, 0.04) 50%, #030106 75%)',
    overflow: 'hidden',
  };

  if (!webglSupported) {
    return <div style={containerStyle} />;
  }

  return (
    <div style={containerStyle}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={isMobile ? 1 : 1.5}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        style={{ background: 'transparent' }}
      >
        {/* Scene lighting */}
        <ambientLight intensity={0.08} />
        <pointLight position={[3, 0.3, -2]} intensity={1.8} color="#00e5ff" distance={20} decay={2} />
        <pointLight position={[-4, 2, -5]} intensity={0.6} color="#a855f7" distance={15} decay={2} />

        {/* ── 9-layer cosmic scene ── */}
        <DeepStarField isMobile={isMobile} />
        <GalaxySpiralArms isMobile={isMobile} />
        <CosmicDust isMobile={isMobile} />
        <WireframeStructures isMobile={isMobile} />
        <OrbitalRings isMobile={isMobile} />
        <GlowingCore isMobile={isMobile} />
        <ShootingStars isMobile={isMobile} />
        <ConstellationGrid isMobile={isMobile} />
        <EnergyVortex isMobile={isMobile} />
        <CameraRig scroll={scroll} isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
