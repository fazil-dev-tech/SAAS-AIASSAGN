"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import Scene3D from './Scene3D';

// ── CUSTOM MAGNETIC BUTTON (Million Dollar Vibe) ──
const PremiumButton = ({ children, onClick, primary = true }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
  };
  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '1.2rem 3rem',
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        borderRadius: '100px',
        color: primary ? '#000' : '#fff',
        cursor: 'pointer',
        pointerEvents: 'auto',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.2)',
        background: primary ? '#ffffff' : 'transparent',
        boxShadow: primary ? '0 0 40px rgba(255,255,255,0.2)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
};

// ── HOLOGRAPHIC FEATURE CARD ──
const MinimalCard = ({ title, desc, icon }) => {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    const { left, top } = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      style={{
        position: 'relative',
        background: 'rgba(10, 10, 10, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '3rem 2rem',
        backdropFilter: 'blur(20px)',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(168, 85, 247, 0.15), transparent 40%)`
          ),
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#a855f7' }}>{icon}</div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#fff', letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ color: '#888', lineHeight: 1.6, fontSize: '1rem' }}>{desc}</p>
      </div>
    </motion.div>
  );
};

// ── ARCHITECTURE SCROLL BLOCK ──
const ArchitectureBlock = ({ title, desc, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -50 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ margin: "-200px 0px" }}
    transition={{ duration: 0.8 }}
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      pointerEvents: 'auto',
    }}
  >
    <div style={{ color: '#a855f7', fontSize: '1rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '1rem' }}>STEP 0{index}</div>
    <h3 style={{ fontSize: '3rem', fontWeight: 700, color: '#fff', marginBottom: '1.5rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{title}</h3>
    <p style={{ color: '#888', fontSize: '1.25rem', lineHeight: 1.6, maxWidth: '500px' }}>{desc}</p>
  </motion.div>
);

// ── SCROLL REVEAL HEADING ──
const RevealHeading = ({ children, style }) => (
  <motion.h2 
    initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
    whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    viewport={{ margin: "-100px" }}
    transition={{ duration: 1, ease: 'easeOut' }}
    style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem', color: '#fff', ...style }}
  >
    {children}
  </motion.h2>
);

export default function LandingPage({ onStart, isLoggedIn }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', color: '#fff', overflowX: 'hidden' }}>
      
      {/* ── FIXED 3D SCENE BACKGROUND ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}>
        <Scene3D />
      </div>
      
      {/* ── HEADER ── */}
      <header 
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <img src="/logo.png" alt="AssignAI Logo" style={{ height: '35px', filter: 'invert(1) brightness(1.5)', mixBlendMode: 'screen' }} />
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <button onClick={onStart} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'color 0.3s ease' }} onMouseOver={(e) => e.target.style.color = '#a855f7'} onMouseOut={(e) => e.target.style.color = '#fff'}>
            {isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* ── FOREGROUND CONTENT (Scrolls over the 3D canvas) ── */}
      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
        
        {/* HERO SECTION */}
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 2rem', textAlign: 'center' }}>
          
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} style={{ pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
              <div style={{ padding: '0.4rem 1.2rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(10px)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', animation: 'pulse 2s infinite' }}></span>
                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>AssignAI Engine 2.0</span>
              </div>
            </div>

            {/* Stark, minimalist typography */}
            <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 'clamp(3.5rem, 8vw, 8rem)', lineHeight: 1.05, marginBottom: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>
              Academic Reports.<br />
              <span style={{ color: '#888' }}>Engineered.</span>
            </h1>

            <p style={{ fontSize: 'clamp(1rem, 3vw, 1.3rem)', color: '#666', marginBottom: '4rem', maxWidth: '600px', marginInline: 'auto', lineHeight: 1.7, fontWeight: 400 }}>
              Harness the precision of god-level AI to instantly compile and format SIT VTU standard documents. Total academic automation.
            </p>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'center' }}>
              <PremiumButton primary={true} onClick={onStart}>
                Initialize Workspace
              </PremiumButton>
              <PremiumButton primary={false} onClick={() => document.getElementById('architecture').scrollIntoView({ behavior: 'smooth' })}>
                View Architecture
              </PremiumButton>
            </div>
          </motion.div>
        </div>

        {/* ARCHITECTURE SECTION (The 3D nodes will be visible on the right) */}
        <div id="architecture" style={{ position: 'relative', padding: isMobile ? '5rem 2rem' : '10rem 10%', minHeight: '300vh' }}>
          <div style={{ width: isMobile ? '100%' : '40%' }}>
            <div style={{ paddingBottom: '30vh' }}>
              <RevealHeading>The Architecture.</RevealHeading>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ color: '#888', fontSize: '1.2rem', lineHeight: 1.6 }}
              >
                Scroll to visualize the real-time data pipeline of AssignAI.
              </motion.p>
            </div>

            <ArchitectureBlock 
              index="1" 
              title="Client Synthesis" 
              desc="You provide the raw requirements. The frontend instantly packages your constraints into an encrypted payload, ready for processing." 
            />
            <ArchitectureBlock 
              index="2" 
              title="Neural Processing" 
              desc="The Puter AI Engine ingests the payload. It expands, researches, and strictly structures the content to university formatting guidelines within milliseconds." 
            />
            <ArchitectureBlock 
              index="3" 
              title="Formatting Output" 
              desc="The highly structured data is compiled. AI vision models generate diagrams, and the final engine injects everything into a flawless DOCX/PDF." 
            />
          </div>
        </div>

        {/* FEATURES GRID */}
        <div style={{ background: '#050505', padding: '10rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
              <RevealHeading style={{ color: '#fff' }}>Uncompromising Features.</RevealHeading>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <MinimalCard 
                icon="⚡" 
                title="Sub-Second Latency" 
                desc="Powered by advanced Edge computing. Your massive reports compile in the blink of an eye without crushing your local browser." 
              />
              <MinimalCard 
                icon="🎨" 
                title="AI Vision Diagrams" 
                desc="Why manually draw flowcharts? The engine automatically builds high-fidelity technical diagrams injected straight into your thesis." 
              />
              <MinimalCard 
                icon="📦" 
                title="Batch Automation" 
                desc="Upload a CSV of 100 students. Step back. Watch AssignAI compile 100 unique, personalized reports simultaneously." 
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ padding: '4rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#000', textAlign: 'center', pointerEvents: 'auto' }}>
          <img src="/logo.png" alt="AssignAI Logo" style={{ height: '30px', margin: '0 auto 1.5rem', display: 'block', filter: 'invert(1) brightness(1.5)', mixBlendMode: 'screen' }} />
          <p style={{ color: '#666', fontSize: '0.9rem', fontWeight: 500 }}>Engineered by Mohamed Fazil Pasha.</p>
        </footer>

      </div>
    </div>
  );
}
