"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useInView } from 'framer-motion';
import Scene3D from './Scene3D';

// ═══════════════════════════════════════════════════════════
//  PREMIUM REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── MAGNETIC BUTTON ──
const MagneticButton = ({ children, onClick, primary = true, style: extraStyle }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    setPos({ x: (clientX - (left + width / 2)) * 0.15, y: (clientY - (top + height / 2)) * 0.15 });
  };
  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setPos({ x: 0, y: 0 }); setHovered(false); }}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'relative', overflow: 'hidden', padding: '1.1rem 2.8rem',
        fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
        borderRadius: '100px', cursor: 'pointer', pointerEvents: 'auto',
        color: primary ? '#fff' : (hovered ? '#e0d0ff' : '#aaa'),
        border: primary ? 'none' : `1px solid ${hovered ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)'}`,
        background: primary
          ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #d946ef 100%)'
          : (hovered ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)'),
        boxShadow: primary
          ? (hovered ? '0 0 50px rgba(168,85,247,0.5), 0 8px 32px rgba(168,85,247,0.3)' : '0 0 30px rgba(168,85,247,0.25), 0 8px 24px rgba(0,0,0,0.3)')
          : (hovered ? '0 0 20px rgba(168,85,247,0.15)' : 'none'),
        backdropFilter: 'blur(12px)', fontFamily: "'Inter', sans-serif",
        transition: 'background 0.4s, border-color 0.4s, color 0.4s, box-shadow 0.4s',
        ...extraStyle,
      }}
    >
      {/* Animated shimmer on primary */}
      {primary && (
        <motion.div
          animate={{ x: hovered ? '200%' : '-100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
};

// ── ANIMATED COUNTER ──
const AnimatedCounter = ({ value, suffix = '', prefix = '', label, color = '#fff' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 2200;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      style={{ textAlign: 'center', padding: '1.5rem 1rem' }}
    >
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
        fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
        background: `linear-gradient(135deg, ${color}, #fff)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div style={{
        marginTop: '0.75rem', color: '#666', fontSize: '0.8rem', fontWeight: 600,
        letterSpacing: '2px', textTransform: 'uppercase',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {label}
      </div>
    </motion.div>
  );
};

// ── HOLOGRAPHIC FEATURE CARD ──
const FeatureCard = ({ title, desc, icon, index, accent }) => {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [hovered, setHovered] = useState(false);
  const handleMouseMove = (e) => {
    const { left, top } = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const accentColor = accent || '#a855f7';

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      style={{
        position: 'relative', background: 'rgba(8, 4, 18, 0.5)',
        border: `1px solid ${hovered ? accentColor + '35' : 'rgba(255, 255, 255, 0.05)'}`,
        borderRadius: '20px', padding: '2.5rem 2rem',
        backdropFilter: 'blur(20px)', pointerEvents: 'auto', overflow: 'hidden',
        cursor: 'default', transition: 'border-color 0.4s ease',
        boxShadow: hovered ? `0 8px 40px ${accentColor}12, 0 0 0 1px ${accentColor}10` : 'none',
      }}
    >
      {/* Mouse-follow glow */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: useTransform(
          [mouseX, mouseY],
          ([x, y]) => `radial-gradient(350px circle at ${x}px ${y}px, ${accentColor}18, transparent 40%)`
        ),
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '2rem', marginBottom: '1.25rem',
          width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '16px', background: `${accentColor}10`,
          border: `1px solid ${accentColor}22`,
        }}>
          {icon}
        </div>
        <h3 style={{
          fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#fff',
          letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif",
        }}>{title}</h3>
        <p style={{ color: '#777', lineHeight: 1.7, fontSize: '0.92rem' }}>{desc}</p>
      </div>
    </motion.div>
  );
};

// ── REVEAL HEADING ──
const RevealHeading = ({ children, style, tag: Tag = 'h2' }) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
    whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 1, ease: 'easeOut' }}
  >
    <Tag style={{
      fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800,
      letterSpacing: '-0.04em', marginBottom: '1rem', color: '#fff',
      fontFamily: "'Inter', sans-serif", lineHeight: 1.15, ...style,
    }}>
      {children}
    </Tag>
  </motion.div>
);

// ── SECTION LABEL PILL ──
const SectionLabel = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.4rem 1.2rem', marginBottom: '1.5rem',
      border: '1px solid rgba(168,85,247,0.3)', borderRadius: '100px',
      background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.04))',
      backdropFilter: 'blur(8px)',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
      fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c084fc',
      boxShadow: '0 2px 12px rgba(168,85,247,0.1)',
    }}
  >
    <motion.span
      animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 6px #a855f7' }}
    />
    {children}
  </motion.div>
);

// ── PIPELINE STEP ──
const PipelineStep = ({ step, title, desc, icon, color, isLast, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.7, delay: index * 0.15 }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, position: 'relative' }}
  >
    {/* Step circle */}
    <div style={{
      width: '72px', height: '72px', borderRadius: '20px',
      background: `${color}12`, border: `1.5px solid ${color}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.8rem', marginBottom: '1.25rem', position: 'relative',
    }}>
      {icon}
      {/* Step number badge */}
      <div style={{
        position: 'absolute', top: '-8px', right: '-8px',
        width: '22px', height: '22px', borderRadius: '50%',
        background: color, color: '#fff', fontSize: '0.65rem', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: `0 0 12px ${color}60`,
      }}>
        {step}
      </div>
    </div>
    <h4 style={{
      fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem',
      fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
    }}>{title}</h4>
    <p style={{ color: '#777', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '250px' }}>{desc}</p>
  </motion.div>
);

// ── TESTIMONIAL CARD ──
const TestimonialCard = ({ quote, name, role, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.7, delay: index * 0.12 }}
    style={{
      background: 'rgba(8, 4, 18, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '20px', padding: '2rem', backdropFilter: 'blur(16px)',
      pointerEvents: 'auto',
    }}
  >
    {/* Stars */}
    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '2px' }}>⭐⭐⭐⭐⭐</div>
    <p style={{ color: '#bbb', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem', fontStyle: 'italic' }}>
      "{quote}"
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: '0.85rem',
      }}>
        {name[0]}
      </div>
      <div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
        <div style={{ color: '#666', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>{role}</div>
      </div>
    </div>
  </motion.div>
);

// ── TECH BADGE ──
const TechBadge = ({ name, icon, index }) => {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -5, transition: { duration: 0.25 } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '0.9rem 1.6rem', borderRadius: '16px',
        background: hover ? 'rgba(168,85,247,0.1)' : 'rgba(8,4,18,0.6)',
        border: `1px solid ${hover ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
        backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', gap: '0.8rem',
        color: hover ? '#fff' : '#ccc', fontSize: '0.9rem', fontWeight: 600,
        fontFamily: "'Inter', sans-serif", pointerEvents: 'auto', cursor: 'default',
        transition: 'all 0.35s ease',
        boxShadow: hover ? '0 8px 24px rgba(168,85,247,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      {name}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════

const features = [
  { icon: '⚡', title: 'Sub-Second Compile', desc: 'Edge-powered infrastructure delivers 50+ page academic reports in under 3 seconds. No browser freezing, no waiting.', accent: '#f59e0b' },
  { icon: '🎨', title: 'AI Vision Diagrams', desc: 'Automatic high-fidelity flowcharts, system diagrams, and technical illustrations generated by AI vision models.', accent: '#a855f7' },
  { icon: '📦', title: 'Batch Automation', desc: 'Upload a CSV of 100 students. AssignAI compiles 100 unique, personalized reports simultaneously.', accent: '#ec4899' },
  { icon: '🎓', title: 'University Formatting', desc: 'Pixel-perfect compliance with SIT, VTU, NIT, and IIT academic standards — cover pages, headers, footers.', accent: '#3b82f6' },
  { icon: '📄', title: 'Multi-Format Export', desc: 'One-click export to DOCX or PDF. Both formats maintain perfect A4 formatting with embedded images and tables.', accent: '#10b981' },
  { icon: '📧', title: 'Smart Email Delivery', desc: 'Compiled reports delivered directly to student inboxes via automated Nodemailer integration. Zero manual steps.', accent: '#06b6d4' },
];

const stats = [
  { value: 50000, suffix: '+', label: 'Reports Generated', color: '#a855f7' },
  { value: 99, suffix: '.7%', label: 'Format Accuracy', color: '#10b981' },
  { value: 2, suffix: '.5s', label: 'Avg Compile Time', color: '#3b82f6' },
  { value: 500, suffix: '+', label: 'Students Served', color: '#ec4899' },
];

const pipeline = [
  { step: '1', title: 'Upload', desc: 'Drop your question paper or CSV. AI extracts requirements instantly.', icon: '📤', color: '#3b82f6' },
  { step: '2', title: 'Process', desc: 'Neural engine researches, structures, and formats to university standards.', icon: '⚙️', color: '#a855f7' },
  { step: '3', title: 'Export', desc: 'Download flawless DOCX/PDF or auto-deliver via email.', icon: '📄', color: '#10b981' },
];

const testimonials = [
  { name: 'Arjun Mehta', role: '6th Sem CSE · SIT Tumkur', quote: 'What used to take 4 hours of formatting now takes 30 seconds. AssignAI literally saved my semester. The VTU formatting is pixel-perfect.' },
  { name: 'Priya Sharma', role: '8th Sem ISE · CIT Tumkur', quote: 'The batch feature is insane. I uploaded my entire group\'s data and got 8 personalized reports back in under a minute.' },
  { name: 'Rahul Kumar', role: '4th Sem ECE · RV Bangalore', quote: 'The AI-generated diagrams are better than anything I could draw in Visio. Cover pages, TOC, everything is automated.' },
  { name: 'Sneha Reddy', role: '6th Sem CSE · NIT Surathkal', quote: 'I was skeptical at first, but the formatting quality is indistinguishable from manual work. The email delivery feature saved our entire batch.' },
  { name: 'Vikram Patel', role: '8th Sem ME · IIT Delhi', quote: 'The 3-tier AI fallback is genius — my reports never fail to generate. Quality is consistently high regardless of the subject.' },
  { name: 'Ananya Iyer', role: '4th Sem IT · SSIT Tumkur', quote: 'Submitted 12 lab reports in one night. Each one perfectly formatted with diagrams. My professors couldn\'t believe the output quality.' },
];

const techStack = [
  { name: 'NVIDIA NIMs', icon: '🟢' },
  { name: 'OpenRouter', icon: '🔗' },
  { name: 'Next.js 16', icon: '▲' },
  { name: 'Three.js', icon: '🔺' },
  { name: 'Supabase', icon: '⚡' },
  { name: 'React 19', icon: '⚛️' },
  { name: 'Puter.js', icon: '☁️' },
  { name: 'Nodemailer', icon: '📬' },
];

const universities = [
  'IIT Delhi', 'IIT Madras', 'NIT Surathkal', 'SIT Tumkur', 'CIT Tumkur',
  'SSIT Tumkur', 'VTU Belagavi', 'RV Bangalore', 'RNSIT Bangalore',
  'BIT Bangalore', 'MSRIT Bangalore', 'DSCE Bangalore',
  'NIE Mysuru', 'SJCE Mysuru', 'IIT Bombay', 'NIT Trichy',
];

// ═══════════════════════════════════════════════════════════
//  MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════

export default function LandingPage({ onStart, isLoggedIn }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Section wrapper with semi-transparent bg to overlay the 3D scene
  const Section = ({ children, style, transparent }) => (
    <div style={{
      position: 'relative', padding: isMobile ? '5rem 1.5rem' : '8rem 2rem',
      background: transparent ? 'transparent' : 'rgba(3, 1, 6, 0.88)',
      backdropFilter: transparent ? 'none' : 'blur(8px)',
      borderTop: transparent ? 'none' : '1px solid rgba(255,255,255,0.03)',
      ...style,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', backgroundColor: '#030106', color: '#fff', overflowX: 'hidden' }}>

      {/* ═══ FIXED 3D GALAXY BACKGROUND ═══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <Scene3D />
      </div>

      {/* ═══ HEADER ═══ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', padding: isMobile ? '0.8rem 1.5rem' : '1rem 3rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50,
        background: 'rgba(3, 1, 6, 0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        pointerEvents: 'none',
        transition: 'all 0.3s ease',
      }}>
        <div
          style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          onClick={onStart}
        >
          <span style={{ fontSize: '1.5rem' }}>🎓</span>
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #00ffff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>AssignAI</span>
        </div>
        <nav style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/architecture" target="_blank" rel="noopener noreferrer" style={{
            color: '#888', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none',
            transition: 'color 0.3s', fontFamily: "'Inter', sans-serif",
            borderBottom: '1px solid transparent', paddingBottom: '2px',
          }} onMouseOver={(e) => { e.target.style.color = '#c084fc'; e.target.style.borderBottomColor = 'rgba(168,85,247,0.4)'; }}
            onMouseOut={(e) => { e.target.style.color = '#888'; e.target.style.borderBottomColor = 'transparent'; }}>
            Architecture
          </a>
          <button onClick={onStart} style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))',
            border: '1px solid rgba(168,85,247,0.3)',
            color: '#e0d0ff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            padding: '0.55rem 1.3rem', borderRadius: '100px',
            fontFamily: "'Inter', sans-serif", transition: 'all 0.35s',
            backdropFilter: 'blur(12px)', letterSpacing: '0.3px',
            boxShadow: '0 2px 12px rgba(168,85,247,0.15)',
          }} onMouseOver={(e) => { e.target.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(236,72,153,0.25))'; e.target.style.borderColor = 'rgba(168,85,247,0.5)'; e.target.style.boxShadow = '0 4px 20px rgba(168,85,247,0.25)'; }}
            onMouseOut={(e) => { e.target.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))'; e.target.style.borderColor = 'rgba(168,85,247,0.3)'; e.target.style.boxShadow = '0 2px 12px rgba(168,85,247,0.15)'; }}>
            {isLoggedIn ? 'Dashboard →' : 'Sign In →'}
          </button>
        </nav>
      </header>

      {/* ═══ FOREGROUND CONTENT ═══ */}
      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>

        {/* ── SECTION 1: HERO ── */}
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
          justifyContent: 'center',
          paddingTop: isMobile ? '6.5rem' : '8.5rem',
          paddingBottom: '3.5rem',
          paddingLeft: isMobile ? '1.5rem' : '8%',
          paddingRight: isMobile ? '1.5rem' : '8%',
          boxSizing: 'border-box',
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            style={{ pointerEvents: 'auto', maxWidth: isMobile ? '100%' : '60%' }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.45rem 1.3rem', marginBottom: '2.5rem',
                border: '1px solid rgba(16,185,129,0.25)', borderRadius: '100px',
                backdropFilter: 'blur(10px)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(0,229,255,0.04))',
                boxShadow: '0 2px 12px rgba(16,185,129,0.1)',
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }}
              />
              <span style={{ color: '#5ee5b0', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                Engine 2.0 — Live
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 'clamp(3rem, 7vw, 7rem)', lineHeight: 1.05,
                fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '1.5rem',
                textShadow: '0 4px 30px rgba(0,0,0,0.9)',
              }}
            >
              Academic Reports.{!isMobile && <br />}
              <span style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899, #00e5ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}> Engineered.</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#888', lineHeight: 1.7,
                maxWidth: '580px', marginBottom: '3.5rem',
                marginInline: isMobile ? 'auto' : '0', fontWeight: 400,
              }}
            >
              Harness god-level AI to instantly compile, format, and export SIT VTU standard documents. From raw questions to pixel-perfect reports in seconds.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: isMobile ? 'center' : 'flex-start' }}
            >
              <MagneticButton primary onClick={onStart}>
                Start Building →
              </MagneticButton>
              <MagneticButton primary={false} onClick={() => window.open('/architecture', '_blank')}>
                View Architecture ↗
              </MagneticButton>
            </motion.div>

            {/* Trust line */}
            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}
            >
              <div style={{ display: 'flex' }}>
                {['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'].map((c, i) => (
                  <div key={i} style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${c}, ${c}88)`,
                    border: '2.5px solid #030106', marginLeft: i > 0 ? '-9px' : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                  }}>
                    {['A', 'P', 'R', 'S', 'V'][i]}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                Trusted by students from <strong style={{ color: '#c084fc' }}>IITs</strong>,{' '}
                <strong style={{ color: '#c084fc' }}>NITs</strong> &{' '}
                <strong style={{ color: '#c084fc' }}>VTU</strong>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── SECTION 2: UNIVERSITY MARQUEE ── */}
        <div style={{
          padding: '1.5rem 0 0.5rem', overflow: 'hidden', pointerEvents: 'auto',
          background: 'linear-gradient(180deg, transparent 0%, rgba(3,1,6,0.65) 25%, rgba(3,1,6,0.65) 75%, transparent 100%)',
          borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)',
        }}>
          {/* Label */}
          <div style={{
            textAlign: 'center', marginBottom: '1rem',
            color: '#444', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '3px',
            textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
          }}>
            Trusted by students from leading institutions
          </div>
          {/* Scrolling logos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', whiteSpace: 'nowrap', animation: 'marquee 40s linear infinite' }}>
            {[...universities, ...universities].map((u, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0' }}>
                <span style={{
                  color: '#555', fontSize: '0.8rem', fontWeight: 600,
                  letterSpacing: '2px', textTransform: 'uppercase',
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '0 1rem',
                }}>
                  {u}
                </span>
                <span style={{ color: '#333', fontSize: '0.5rem' }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: STATS ── */}
        <Section style={{ background: 'rgba(3,1,6,0.75)', backdropFilter: 'blur(12px)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '0', padding: '1rem 0',
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                borderRight: (!isMobile && i < 3) ? '1px solid rgba(255,255,255,0.06)' : 'none',
                borderBottom: (isMobile && i < 2) ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <AnimatedCounter {...s} />
              </div>
            ))}
          </div>
        </Section>

        {/* ── SECTION 4: HOW IT WORKS (Pipeline) ── */}
        <Section>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <SectionLabel>How it works</SectionLabel>
            <RevealHeading style={{ maxWidth: '700px', margin: '0 auto' }}>
              Three steps to a<br />
              <span style={{ color: '#888' }}>perfect report.</span>
            </RevealHeading>
          </div>
          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '3rem' : '2rem', alignItems: 'flex-start',
            position: 'relative', pointerEvents: 'auto',
          }}>
            {/* Connecting line (desktop) */}
            {!isMobile && (
              <div style={{
                position: 'absolute', top: '36px', left: '18%', right: '18%',
                height: '1px', background: 'linear-gradient(90deg, #3b82f6, #a855f7, #10b981)',
                opacity: 0.25, zIndex: 0,
              }} />
            )}
            {pipeline.map((p, i) => (
              <PipelineStep key={i} {...p} index={i} isLast={i === pipeline.length - 1} />
            ))}
          </div>
          {/* Link to full architecture */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            style={{ textAlign: 'center', marginTop: '3rem', pointerEvents: 'auto' }}
          >
            <a href="/architecture" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              color: '#aaa', fontSize: '0.82rem', textDecoration: 'none',
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px',
              padding: '0.55rem 1.5rem', borderRadius: '100px',
              border: '1px solid rgba(168,85,247,0.2)',
              background: 'rgba(168,85,247,0.04)',
              transition: 'all 0.35s',
            }} onMouseOver={(e) => { e.currentTarget.style.color = '#c084fc'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)'; e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.15)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.2)'; e.currentTarget.style.background = 'rgba(168,85,247,0.04)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <span style={{ fontSize: '0.75rem' }}>⚡</span>
              Explore full architecture
              <span style={{ fontSize: '0.7rem' }}>↗</span>
            </a>
          </motion.div>
        </Section>

        {/* ── SECTION 5: FEATURES ── */}
        <div data-section="features">
          <Section style={{ background: 'rgba(3,1,6,0.94)' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <SectionLabel>Features</SectionLabel>
              <RevealHeading>
                Uncompromising<br />
                <span style={{ color: '#888' }}>capabilities.</span>
              </RevealHeading>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                style={{ color: '#666', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '500px', margin: '0 auto' }}
              >
                Every feature designed to eliminate hours of manual formatting work.
              </motion.p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}>
              {features.map((f, i) => (
                <FeatureCard key={i} {...f} index={i} />
              ))}
            </div>
          </Section>
        </div>

        {/* ── SECTION 6: TECHNOLOGY ── */}
        <div data-section="tech">
          <Section>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <SectionLabel>Technology</SectionLabel>
              <RevealHeading>
                Powered by the<br />
                <span style={{ color: '#888' }}>bleeding edge.</span>
              </RevealHeading>
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: '0.75rem', maxWidth: '700px', margin: '0 auto',
            }}>
              {techStack.map((t, i) => (
                <TechBadge key={i} {...t} index={i} />
              ))}
            </div>
          </Section>
        </div>

        {/* ── SECTION 7: TESTIMONIALS ── */}
        <Section style={{ background: 'rgba(3,1,6,0.94)' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <SectionLabel>Testimonials</SectionLabel>
            <RevealHeading>
              Loved by students<br />
              <span style={{ color: '#888' }}>across India.</span>
            </RevealHeading>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '450px', margin: '0.5rem auto 0' }}
            >
              From IITs and NITs to VTU colleges — students everywhere trust AssignAI.
            </motion.p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '1.5rem',
          }}>
            {testimonials.slice(0, isMobile ? 3 : 6).map((t, i) => (
              <TestimonialCard key={i} {...t} index={i} />
            ))}
          </div>
        </Section>

        {/* ── SECTION 8: FINAL CTA ── */}
        <Section transparent style={{ padding: isMobile ? '6rem 1.5rem' : '10rem 2rem' }}>
          <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              style={{
                maxWidth: '700px', margin: '0 auto', padding: isMobile ? '3rem 2rem' : '5rem 4rem',
                borderRadius: '28px', position: 'relative', overflow: 'hidden',
                background: 'rgba(8,4,18,0.6)', border: '1px solid rgba(168,85,247,0.15)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Corner glow */}
              <div style={{
                position: 'absolute', top: '-40%', right: '-20%', width: '400px', height: '400px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1rem', lineHeight: 1.15,
                }}>
                  Ready to automate your<br />
                  <span style={{
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>academic workflow?</span>
                </h2>
                <p style={{ color: '#777', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '450px', margin: '0 auto 2.5rem' }}>
                  Join 500+ students who eliminated formatting pain. Start for free — no credit card required.
                </p>
                <MagneticButton primary onClick={onStart}>
                  Initialize Workspace →
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ── PREMIUM FOOTER ── */}
        <footer style={{
          pointerEvents: 'auto', position: 'relative', overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'linear-gradient(180deg, rgba(3,1,6,0.96) 0%, rgba(8,4,18,0.98) 100%)',
        }}>
          {/* Top gradient accent line */}
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), rgba(236,72,153,0.2), rgba(0,229,255,0.15), transparent)',
          }} />

          {/* Main footer content */}
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            padding: isMobile ? '3.5rem 1.5rem 2rem' : '4.5rem 2rem 2rem',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr',
            gap: isMobile ? '2.5rem' : '3rem',
          }}>
            {/* Column 1: Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎓</span>
                <span style={{
                  fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 800,
                  background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #00ffff 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>AssignAI</span>
              </div>
              <p style={{
                color: '#555', fontSize: '0.85rem', lineHeight: 1.7, maxWidth: '320px',
                marginBottom: '1.5rem',
              }}>
                The world's most advanced academic report engine. From raw questions to pixel-perfect, university-standard documents in seconds.
              </p>
              {/* Status badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.35rem 0.9rem', borderRadius: '100px',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: '#10b981',
                  boxShadow: '0 0 8px rgba(16,185,129,0.6)',
                }} />
                <span style={{
                  color: '#10b981', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  ALL SYSTEMS OPERATIONAL
                </span>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 style={{
                color: '#777', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2.5px',
                textTransform: 'uppercase', marginBottom: '1.25rem',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Navigate
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Architecture', href: '/architecture', external: true },
                  { label: 'Features', action: () => document.querySelector('[data-section="features"]')?.scrollIntoView({ behavior: 'smooth' }) },
                  { label: 'Technology', action: () => document.querySelector('[data-section="tech"]')?.scrollIntoView({ behavior: 'smooth' }) },
                  { label: isLoggedIn ? 'Dashboard' : 'Sign In', action: onStart },
                ].map((link, i) => (
                  link.href ? (
                    <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" style={{
                      color: '#555', fontSize: '0.82rem', textDecoration: 'none',
                      fontFamily: "'Inter', sans-serif", transition: 'all 0.3s',
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    }} onMouseOver={(e) => { e.target.style.color = '#c084fc'; e.target.style.transform = 'translateX(4px)'; }}
                      onMouseOut={(e) => { e.target.style.color = '#555'; e.target.style.transform = 'translateX(0)'; }}>
                      <span style={{ fontSize: '0.6rem', color: '#444' }}>→</span> {link.label}
                    </a>
                  ) : (
                    <span key={i} onClick={link.action} style={{
                      color: '#555', fontSize: '0.82rem', cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif", transition: 'all 0.3s',
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    }} onMouseOver={(e) => { e.target.style.color = '#c084fc'; e.target.style.transform = 'translateX(4px)'; }}
                      onMouseOut={(e) => { e.target.style.color = '#555'; e.target.style.transform = 'translateX(0)'; }}>
                      <span style={{ fontSize: '0.6rem', color: '#444' }}>→</span> {link.label}
                    </span>
                  )
                ))}
              </div>
            </div>

            {/* Column 3: Tech & Contact */}
            <div>
              <h4 style={{
                color: '#777', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2.5px',
                textTransform: 'uppercase', marginBottom: '1.25rem',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Powered By
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                {['NVIDIA', 'OpenRouter', 'Next.js', 'Three.js', 'Supabase'].map((t, i) => (
                  <span key={i} style={{
                    padding: '0.25rem 0.6rem', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    color: '#555', fontSize: '0.68rem', fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {t}
                  </span>
                ))}
              </div>
              <h4 style={{
                color: '#777', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2.5px',
                textTransform: 'uppercase', marginBottom: '0.75rem',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Built For
              </h4>
              <p style={{ color: '#555', fontSize: '0.78rem', lineHeight: 1.6 }}>
                SIT Tumkur · VTU · CIT · SSIT<br />
                IITs · NITs · Engineering Colleges
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 2rem',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '0.75rem',
          }}>
            <p style={{
              color: '#333', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.5px',
            }}>
              Engineered by Mohamed Fazil Pasha · © {new Date().getFullYear()} AssignAI
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#555', fontSize: '0.72rem', padding: '0.4rem 0.9rem', borderRadius: '8px',
                cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#c084fc'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              ↑ Back to top
            </button>
          </div>
        </footer>

      </div>

      {/* ── KEYFRAME ANIMATIONS ── */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
