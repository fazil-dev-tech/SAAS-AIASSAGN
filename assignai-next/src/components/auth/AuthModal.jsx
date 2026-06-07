import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthModal({
  loginType,
  setLoginType,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authOtp,
  setAuthOtp,
  isAuthenticating,
  requestOtp,
  verifyOtp,
  otpSent,
  setOtpSent
}) {
  const [emailFocused, setEmailFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const otpInputRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  // Reset countdown and focus OTP input when sent
  useEffect(() => {
    if (otpSent) {
      setCountdown(60);
      setTimeout(() => {
        if (otpInputRef.current) otpInputRef.current.focus();
      }, 300); // Wait for transition
    }
  }, [otpSent]);

  // Auto-submit OTP
  useEffect(() => {
    if (otpSent && authOtp.length === 6 && !isAuthenticating) {
      verifyOtp();
    }
  }, [authOtp, otpSent, isAuthenticating]);

  // Premium input style builder
  const inputStyle = (focused) => ({
    width: '100%',
    padding: '15px 18px',
    background: focused ? 'rgba(168,85,247,0.06)' : 'rgba(0,0,0,0.25)',
    border: `1.5px solid ${focused ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '14px',
    color: '#fff',
    fontSize: '0.95rem',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: focused ? '0 0 0 3px rgba(168,85,247,0.12), 0 4px 16px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
  });

  return (
    <motion.div
      className="page active"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 100px)', overflow: 'hidden',
      }}
    >

      {/* ── Ambient background glows ── */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%', width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
        filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
        filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '30%', width: '25vw', height: '25vw',
        background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Auth Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          zIndex: 10, width: '100%', maxWidth: '440px', padding: '2.5rem 2.5rem 2rem',
          textAlign: 'center', borderRadius: '28px', position: 'relative', overflow: 'hidden',
          background: 'rgba(8, 4, 18, 0.65)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(168,85,247,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        {/* Card top glow accent */}
        <div style={{
          position: 'absolute', top: '-60%', left: '50%', transform: 'translateX(-50%)',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* ── Logo ── */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200 }}
          style={{
            width: '68px', height: '68px', margin: '0 auto 1.5rem', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.12) 50%, rgba(0,229,255,0.1) 100%)',
            border: '1px solid rgba(168,85,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px -4px rgba(168, 85, 247, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '2rem', position: 'relative', zIndex: 1 }}>🎓</span>
        </motion.div>

        {/* ── Heading ── */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.03em',
            marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif",
            background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          {loginType === 'login' ? 'Welcome Back' : 'Create Account'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            color: '#7c7c9a', marginBottom: '2rem', fontSize: '0.88rem', fontWeight: 400,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {loginType === 'login'
            ? 'Sign in to access your workspace'
            : 'Get started with AssignAI for free'}
        </motion.p>

        {/* ── Tab Switcher ── */}
        <div style={{
          display: 'flex', position: 'relative', marginBottom: '2rem',
          background: 'rgba(0,0,0,0.35)', padding: '4px', borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <motion.div
            layout
            style={{
              position: 'absolute', top: 4, bottom: 4,
              left: loginType === 'login' ? 4 : 'calc(50%)',
              width: 'calc(50% - 4px)',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))',
              borderRadius: '10px',
              border: '1px solid rgba(168,85,247,0.2)',
              boxShadow: '0 2px 12px rgba(168,85,247,0.15)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          <button
            style={{
              flex: 1, zIndex: 1, background: 'transparent', border: 'none',
              padding: '0.65rem', color: loginType === 'login' ? '#e2e2ff' : '#555',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              fontFamily: "'Inter', sans-serif", transition: 'color 0.3s',
              letterSpacing: '0.3px',
            }}
            onClick={() => setLoginType('login')}
          >
            Sign In
          </button>
          <button
            style={{
              flex: 1, zIndex: 1, background: 'transparent', border: 'none',
              padding: '0.65rem', color: loginType === 'signup' ? '#e2e2ff' : '#555',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              fontFamily: "'Inter', sans-serif", transition: 'color 0.3s',
              letterSpacing: '0.3px',
            }}
            onClick={() => setLoginType('signup')}
          >
            Create Account
          </button>
        </div>

        {/* ── Form ── */}
        <div style={{ textAlign: 'left', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.3 }}
              >
                {/* Name field (signup only) */}
                {loginType === 'signup' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block', fontSize: '0.72rem', fontWeight: 600,
                      color: '#8888aa', marginBottom: '0.5rem', letterSpacing: '1.5px',
                      textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={authName}
                      onChange={e => setAuthName(e.target.value)}
                      disabled={isAuthenticating}
                      style={inputStyle(nameFocused)}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </div>
                )}

                {/* Email field */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block', fontSize: '0.72rem', fontWeight: 600,
                    color: '#8888aa', marginBottom: '0.5rem', letterSpacing: '1.5px',
                    textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    disabled={isAuthenticating}
                    style={inputStyle(emailFocused)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', padding: '15px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    color: '#fff', border: 'none', borderRadius: '14px',
                    fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px',
                    opacity: isAuthenticating || (loginType === 'signup' && !authName.trim()) ? 0.6 : 1,
                    boxShadow: '0 8px 24px -6px rgba(168,85,247,0.4)',
                    transition: 'opacity 0.3s, box-shadow 0.3s',
                  }}
                  onClick={requestOtp}
                  disabled={isAuthenticating || (loginType === 'signup' && !authName.trim())}
                >
                  {isAuthenticating ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }}
                      />
                      Sending code...
                    </span>
                  ) : (
                    <>Continue with Email →</>
                  )}
                </motion.button>

                {/* Privacy note */}
                <p style={{
                  textAlign: 'center', marginTop: '1.25rem', fontSize: '0.7rem',
                  color: '#555', fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.5,
                }}>
                  🔒 We'll send a secure one-time code to verify your identity
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
              >
                {/* OTP instruction */}
                <div style={{
                  textAlign: 'center', marginBottom: '1.5rem',
                  padding: '1rem', borderRadius: '14px',
                  background: 'rgba(168,85,247,0.06)',
                  border: '1px solid rgba(168,85,247,0.1)',
                }}>
                  <p style={{ color: '#c084fc', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    ✉️ Code sent!
                  </p>
                  <p style={{ color: '#7c7c9a', fontSize: '0.78rem' }}>
                    Check <strong style={{ color: '#bbb' }}>{authEmail}</strong> for a 6-digit code
                  </p>
                </div>

                {/* OTP input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: '#8888aa', letterSpacing: '1.5px',
                      textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Verification Code
                    </label>
                    <span style={{ fontSize: '0.7rem', color: countdown > 0 ? '#ec4899' : '#888', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                      00:{countdown.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <input
                    ref={otpInputRef}
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={authOtp}
                    onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={isAuthenticating}
                    style={{
                      ...inputStyle(otpFocused),
                      fontSize: '1.5rem', letterSpacing: '10px', textAlign: 'center',
                      fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    }}
                    onFocus={() => setOtpFocused(true)}
                    onBlur={() => setOtpFocused(false)}
                  />
                </div>

                {/* Verify button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', padding: '15px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)',
                    color: '#fff', border: 'none', borderRadius: '14px',
                    fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px',
                    opacity: isAuthenticating ? 0.6 : 1,
                    boxShadow: '0 8px 24px -6px rgba(168,85,247,0.4)',
                    transition: 'opacity 0.3s',
                  }}
                  onClick={verifyOtp}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }}
                      />
                      Verifying...
                    </span>
                  ) : (
                    <>Verify & Sign In →</>
                  )}
                </motion.button>

                {/* Back link */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setOtpSent(false); }}
                    style={{
                      fontSize: '0.82rem', color: '#7c7c9a', textDecoration: 'none',
                      fontWeight: 500, fontFamily: "'Inter', sans-serif",
                      transition: 'color 0.3s',
                    }}
                    onMouseOver={(e) => e.target.style.color = '#c084fc'}
                    onMouseOut={(e) => e.target.style.color = '#7c7c9a'}
                  >
                    ← Use different email
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom accent line ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), rgba(236,72,153,0.2), transparent)',
        }} />
      </motion.div>
    </motion.div>
  );
}
