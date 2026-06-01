"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

// Mini 3D Core for the Header
const MiniCore = () => {
  const coreRef = useRef();
  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      coreRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={coreRef} scale={1.5}>
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial 
          color="#ec4899"
          emissive="#db2777"
          emissiveIntensity={0.8}
          wireframe={true}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh scale={0.6}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#fbcfe8" />
      </mesh>
    </Float>
  );
};

export default function GuideBot({ onNavigate, onScanner }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hi! I am the AssignAI Guide Core. How can I assist your workflow today?' }
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleAction = (action) => {
    // Add user message
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: action.label }]);
    
    // Simulate thinking delay
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: action.response, btnLabel: action.btnLabel, btnAction: action.btnAction }]);
    }, 600);
  };

  const actions = [
    {
      label: 'How to Login (Puter.js)?',
      response: 'AssignAI uses Puter.js for secure authentication and cloud storage. Click the button below to go to the login portal. You will be briefly redirected to Puter.com to authorize, then instantly routed back securely.',
      btnLabel: 'Take Me To Login ➔',
      btnAction: 'login'
    },
    {
      label: 'How to Generate Reports?',
      response: 'It is fully automated! Go to the Dashboard, click "New Report", and enter your Topic, Subject, and desired Tone. The AI Engine will handle the rest.',
      btnLabel: 'Go To Dashboard ➔',
      btnAction: 'dashboard'
    },
    {
      label: 'How to Download/Export?',
      response: 'Once your report is generated, you will see a live preview. At the top of the preview, you can click "Export PDF" or "Export True DOCX" to download it directly to your device.',
      btnLabel: 'Generate a Report First ➔',
      btnAction: 'wizard'
    },
    {
      label: 'Support the Developer ☕',
      response: 'Building multi-million dollar tools takes time! You can support Mohamed Fazil Pasha directly below:',
      btnLabel: 'Open Scanner 📷',
      btnAction: 'scanner'
    }
  ];

  const executeAction = (actionType) => {
    if (actionType === 'scanner' && onScanner) {
      onScanner();
    } else if (onNavigate) {
      if (actionType === 'login') onNavigate('auth');
      if (actionType === 'dashboard') onNavigate('dashboard');
      if (actionType === 'wizard') onNavigate('wizard');
    }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 99999 }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ 
              position: 'absolute', 
              bottom: '80px', 
              right: 0, 
              width: '380px', 
              height: '550px',
              background: 'rgba(10, 10, 10, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(236,72,153,0.3)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ height: '100px', background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(139,92,246,0.1))', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 1.5rem', position: 'relative' }}>
              <div style={{ width: '60px', height: '60px', position: 'relative', marginRight: '1rem' }}>
                <Canvas camera={{ position: [0, 0, 5] }}>
                  <ambientLight intensity={1} />
                  <pointLight position={[10, 10, 10]} intensity={2} color="#ec4899" />
                  <MiniCore />
                </Canvas>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>GuideBot Core</h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 10px #10b981' }} /> Online
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((m) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ 
                    alignSelf: m.type === 'bot' ? 'flex-start' : 'flex-end',
                    background: m.type === 'bot' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#fff',
                    padding: '1rem',
                    borderRadius: '16px',
                    borderBottomLeftRadius: m.type === 'bot' ? '4px' : '16px',
                    borderBottomRightRadius: m.type === 'user' ? '4px' : '16px',
                    maxWidth: '85%',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    border: m.type === 'bot' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    boxShadow: m.type === 'user' ? '0 10px 20px rgba(236,72,153,0.3)' : 'none'
                  }}
                >
                  {m.text}
                  {m.btnLabel && (
                    <button 
                      onClick={() => executeAction(m.btnAction)}
                      style={{ 
                        display: 'block', 
                        marginTop: '1rem', 
                        padding: '0.6rem 1rem', 
                        background: '#10b981', 
                        color: '#000', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {m.btnLabel}
                    </button>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Area */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', marginTop: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Suggested Topics</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAction(act)}
                    style={{
                      background: 'rgba(236,72,153,0.1)',
                      border: '1px solid rgba(236,72,153,0.3)',
                      color: '#fbcfe8',
                      padding: '0.6rem 1rem',
                      borderRadius: '100px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.1)'; }}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          boxShadow: '0 0 30px rgba(236,72,153,0.5)',
          color: '#fff',
          zIndex: 99999
        }}
      >
        {isOpen ? '×' : '🤖'}
      </motion.button>
    </div>
  );
}
