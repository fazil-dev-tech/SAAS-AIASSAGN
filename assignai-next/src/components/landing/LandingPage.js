"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Scene3D from './Scene3D';

// Spotlight Bento Card Component
const BentoCard = ({ children, className, style = {} }) => {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(1); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); };
  const handleMouseEnter = () => { setOpacity(1); };
  const handleMouseLeave = () => { setOpacity(0); };

  // Separate grid container styles from inner content layout styles
  const { gridColumn, gridRow, ...innerStyles } = style;
  const outerStyles = { gridColumn, gridRow };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
      style={{
        position: 'relative',
        background: 'rgba(5, 2, 9, 0.6)',
        borderRadius: '24px',
        padding: '1px', // Border width
        overflow: 'hidden',
        boxShadow: opacity ? '0 10px 40px -10px rgba(236,72,153,0.3)' : 'none',
        ...outerStyles
      }}
    >
      {/* Outer Glow Border Tracking Mouse */}
      <div
        style={{
          position: 'absolute',
          left: 0, top: 0, width: '100%', height: '100%',
          background: `radial-gradient(800px circle at ${position.x}px ${position.y}px, rgba(236,72,153,0.6), transparent 40%)`,
          opacity: opacity,
          transition: 'opacity 0.5s ease',
          zIndex: 0
        }}
      />
      
      {/* Inner Card Content Wrapper */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: innerStyles.background || 'rgba(10, 5, 15, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '23px',
        zIndex: 1,
        overflow: 'hidden',
        ...innerStyles
      }}>
        {/* Inner Hover Highlight */}
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: 0, top: 0, width: '100%', height: '100%',
            opacity: opacity * 0.5,
            transition: 'opacity 0.5s ease',
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(236,72,153,.15), transparent 40%)`,
            zIndex: 0
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default function LandingPage({ onStart, isLoggedIn }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Spring animation variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const springUp = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#030106', color: '#fff' }}>
      
      {/* 3D Background with Parallax */}
      <motion.div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0, y: isMobile ? 0 : y, opacity: isMobile ? 1 : opacity }}>
        <Scene3D />
      </motion.div>
      
      {/* Navbar */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, background: 'linear-gradient(180deg, rgba(3,1,6,0.8) 0%, rgba(3,1,6,0) 100%)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
      >
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="AssignAI Logo" 
            style={{ 
              height: '40px', 
              filter: 'invert(1) hue-rotate(180deg) brightness(1.5)', 
              mixBlendMode: 'screen' 
            }} 
          />
        </div>
        <div>
          <button onClick={onStart} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '100px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.5)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            {isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 2rem' }}>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ textAlign: 'center', maxWidth: '1000px', marginTop: isMobile ? '80px' : '-5vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <motion.div variants={springUp} style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ padding: '0.5rem 1.5rem', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: '100px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 10px #ec4899' }}></span>
              <span style={{ color: '#fbcfe8', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'var(--font-ui)' }}>AssignAI Engine 2.0 Live</span>
            </div>
          </motion.div>

          <div style={{ position: 'relative', width: '100%' }}>
            {/* Absolute pure dark backing behind text on mobile to ensure flawless readability against 3D */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '160%' : '120%', height: isMobile ? '160%' : '140%', background: `radial-gradient(ellipse at center, rgba(3,1,6,${isMobile ? '1' : '0.6'}) 0%, rgba(3,1,6,${isMobile ? '0.8' : '0.3'}) 40%, transparent 70%)`, zIndex: -1, pointerEvents: 'none' }} />
            
            <motion.h1 variants={springUp} style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(2.6rem, 10vw, 8rem)', lineHeight: 1.1, marginBottom: '1.2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
              Academic Reports,<br />
              <motion.span 
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                style={{ 
                  background: 'linear-gradient(90deg, #fce7f3, #d946ef, #ec4899, #fce7f3)', 
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block',
                  paddingRight: '0.1em'
                }}>
                Synthesized.
              </motion.span>
            </motion.h1>
          </div>

          <motion.p variants={springUp} style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(0.95rem, 4vw, 1.4rem)', color: '#94a3b8', marginBottom: '3.5rem', maxWidth: '750px', width: '100%', marginInline: 'auto', lineHeight: 1.7, fontWeight: 400, letterSpacing: '0px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            Harness the power of god-level AI to instantly compile, format, and illustrate 
            SIT VTU standard documents. Precision engineering for your academic workflow.
          </motion.p>

          <motion.div variants={springUp} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}>
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(236,72,153,0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              style={{ width: isMobile ? '100%' : 'auto', fontSize: '1rem', fontWeight: 600, padding: '1.1rem 2.5rem', borderRadius: '100px', background: 'linear-gradient(135deg, #db2777, #7e22ce)', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 0 20px rgba(236,72,153,0.3)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)', animation: 'sweep 3s infinite' }} />
              Initialize Workspace
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.getElementById('architecture-section').scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ width: isMobile ? '100%' : 'auto', fontSize: '1rem', fontWeight: 500, padding: '1.1rem 2.5rem', borderRadius: '100px', background: 'transparent', border: isMobile ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              View Architecture
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bento Box Features Section */}
      <div id="features" style={{ position: 'relative', zIndex: 10, background: '#030106', padding: '8rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ textAlign: 'center', marginBottom: '5rem' }}
          >
            <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.04em' }}>The Unfair Advantage.</h2>
            <p style={{ fontFamily: 'var(--font-ui)', color: '#94a3b8', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', letterSpacing: '-0.01em' }}>A masterclass in automation. Built exclusively for students who value time, perfection, and bleeding-edge technology.</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', autoRows: 'minmax(300px, auto)' }}>
            
            {/* Massive Hero Feature */}
            <BentoCard style={{ gridColumn: 'span 12', padding: 'clamp(1.5rem, 5vw, 4rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(236,72,153,0.05), rgba(0,0,0,0))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1.5rem, 5vw, 3rem)', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 min(100%, 400px)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '2rem' }}>⚡</div>
                  <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Puter AI Engine Integration</h3>
                  <p style={{ fontFamily: 'var(--font-ui)', color: '#94a3b8', fontSize: '1.2rem', lineHeight: 1.6 }}>Powered by advanced LLMs that parse complex academic assignments. It doesn't just answer questions; it structures them specifically for university standards, handling complex formatting natively.</p>
                </div>
                {/* Abstract Visualizer for the card */}
                <div style={{ flex: '1 1 min(100%, 300px)', minHeight: '300px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {/* Conic border spin */}
                  <div style={{ position: 'absolute', width: '150%', height: '150%', background: 'conic-gradient(from 90deg at 50% 50%, rgba(3,1,6,1) 0%, rgba(236,72,153,0.3) 50%, rgba(3,1,6,1) 100%)', animation: 'spin 6s linear infinite' }} />
                  
                  {/* Inner Card content */}
                  <div style={{ position: 'absolute', inset: '2px', background: '#0a0a0a', borderRadius: '18px', display: 'flex', flexDirection: 'column', padding: 'clamp(1rem, 5vw, 2.5rem)', overflow: 'hidden' }}>
                    
                    {/* Floating ambient blurs for depth */}
                    <div style={{ position: 'absolute', right: '-20px', top: '20%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: 0 }} />
                    <div style={{ position: 'absolute', left: '-20px', bottom: '-20px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

                    {/* Top Skeleton Loaders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: 'auto', position: 'relative', zIndex: 1 }}>
                      <div style={{ position: 'relative', height: '16px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(236,72,153,0.4), transparent)', animation: 'sweep 2s infinite 0s' }} />
                      </div>
                      <div style={{ position: 'relative', height: '16px', width: '85%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(236,72,153,0.4), transparent)', animation: 'sweep 2s infinite 0.2s' }} />
                      </div>
                      <div style={{ position: 'relative', height: '16px', width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(236,72,153,0.4), transparent)', animation: 'sweep 2s infinite 0.4s' }} />
                      </div>
                    </div>

                    {/* Bottom AI Processing Status */}
                    <div style={{ position: 'relative', zIndex: 1, marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 'clamp(0.4rem, 2vw, 1.2rem)', padding: 'clamp(0.5rem, 2vw, 1.2rem)', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '14px', backdropFilter: 'blur(5px)' }}>
                       {/* Spinning AI Orb */}
                       <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'conic-gradient(from 0deg, #db2777, #7e22ce, transparent)', animation: 'spin 2s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(236,72,153,0.3)' }}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 10px #ec4899', animation: 'pulse 1.5s ease-in-out infinite' }} />
                         </div>
                       </div>
                       
                       {/* Progress Bar & Text */}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(0.65rem, 2vw, 0.85rem)', color: '#fbcfe8', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.5px' }}>
                           <span style={{ animation: 'pulse 2s ease-in-out infinite', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Synthesizing...</span>
                           <span style={{ flexShrink: 0, marginLeft: '0.5rem' }}>84%</span>
                         </div>
                         <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', width: '100%' }}>
                           <div style={{ height: '100%', width: '84%', background: 'linear-gradient(90deg, #db2777, #a855f7)', boxShadow: '0 0 10px rgba(236,72,153,0.5)', borderRadius: '3px' }} />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Sub Feature 1 */}
            <BentoCard className="bento-sub" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>📄</div>
              <h4 style={{ fontFamily: 'var(--font-ui)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>One-Click Export</h4>
              <p style={{ fontFamily: 'var(--font-ui)', color: '#94a3b8', lineHeight: 1.6 }}>Download fully editable Word documents or print-ready PDFs. Formatting is preserved flawlessly.</p>
            </BentoCard>

            {/* Sub Feature 2 */}
            <BentoCard className="bento-sub" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>🎨</div>
              <h4 style={{ fontFamily: 'var(--font-ui)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>AI Vision Diagrams</h4>
              <p style={{ fontFamily: 'var(--font-ui)', color: '#94a3b8', lineHeight: 1.6 }}>Automatically generate stunning technical illustrations and diagrams injected directly into your reports.</p>
            </BentoCard>

            {/* Sub Feature 3 */}
            <BentoCard className="bento-sub" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>📦</div>
              <h4 style={{ fontFamily: 'var(--font-ui)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>Batch Processing</h4>
              <p style={{ fontFamily: 'var(--font-ui)', color: '#94a3b8', lineHeight: 1.6 }}>Upload a class CSV. Spin up 60+ unique, individualized reports in minutes. Complete autonomy.</p>
            </BentoCard>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '4rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#030106', textAlign: 'center' }}>
        <img 
          src="/logo.png" 
          alt="AssignAI Logo" 
          style={{ 
            height: '40px', 
            margin: '0 auto 1.5rem', 
            display: 'block',
            filter: 'invert(1) hue-rotate(180deg) brightness(1.5)', 
            mixBlendMode: 'screen' 
          }} 
        />
        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Engineered by Mohamed Fazil Pasha.</p>
        <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>Pushing the boundaries of academic technology.</p>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes sweep { 0% { left: -100%; } 100% { left: 200%; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .bento-sub { grid-column: span 12; }
        @media (min-width: 768px) {
          .bento-sub { grid-column: span 4; }
        }
      `}} />
    </div>
  );
}
