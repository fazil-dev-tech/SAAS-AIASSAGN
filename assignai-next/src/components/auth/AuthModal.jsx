import React from 'react';
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
  return (
    <motion.div className="page active" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, filter: 'blur(20px)' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      
      {/* Subtle ambient glow */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '35vw', height: '35vw', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ zIndex: 10, width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', textAlign: 'center', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
        
        <div style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        </div>
        
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '0.5rem', color: '#fff' }}>Welcome to AssignAI</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem', fontWeight: 400 }}>Sign in to access your workspace</p>

        <div style={{ display: 'flex', position: 'relative', marginBottom: '2rem', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loginType === 'login' && <motion.div layoutId="auth-tab" style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />}
          {loginType === 'signup' && <motion.div layoutId="auth-tab" style={{ position: 'absolute', top: 4, bottom: 4, right: 4, width: 'calc(50% - 4px)', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />}
          
          <button 
            style={{ flex: 1, zIndex: 1, background: 'transparent', border: 'none', padding: '0.6rem', color: loginType === 'login' ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'color 0.3s' }}
            onClick={() => setLoginType('login')}>
            Sign In
          </button>
          <button 
            style={{ flex: 1, zIndex: 1, background: 'transparent', border: 'none', padding: '0.6rem', color: loginType === 'signup' ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'color 0.3s' }}
            onClick={() => setLoginType('signup')}>
            Create Account
          </button>
        </div>

        <div style={{ textAlign: 'left' }}>
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div key="form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                {loginType === 'signup' && (
                  <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
                    <input type="text" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} disabled={isAuthenticating} style={{ width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s' }} onFocus={(e) => {e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(0,0,0,0.4)'}} onBlur={(e) => {e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(0,0,0,0.2)'}} />
                  </div>
                )}
                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <input type="email" placeholder="Email Address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} disabled={isAuthenticating} style={{ width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s' }} onFocus={(e) => {e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(0,0,0,0.4)'}} onBlur={(e) => {e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(0,0,0,0.2)'}} />
                </div>
                
                <button style={{ width: '100%', padding: '14px', background: '#fff', color: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: isAuthenticating || (loginType === 'signup' && !authName.trim()) ? 'not-allowed' : 'pointer', opacity: isAuthenticating || (loginType === 'signup' && !authName.trim()) ? 0.7 : 1, transition: 'all 0.2s' }} onClick={requestOtp} disabled={isAuthenticating || (loginType === 'signup' && !authName.trim())} onMouseDown={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(0.98)'}} onMouseUp={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(1)'}}>
                  {isAuthenticating ? 'Sending code...' : 'Continue with Email'}
                </button>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>Enter the 6-digit code sent to your email.</p>
                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <input type="text" placeholder="••••••" maxLength={6} value={authOtp} onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ''))} disabled={isAuthenticating} style={{ width: '100%', padding: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid #3b82f6', borderRadius: '12px', color: '#fff', fontSize: '1.25rem', letterSpacing: '8px', textAlign: 'center', outline: 'none', transition: 'all 0.3s', boxShadow: '0 0 0 2px rgba(59,130,246,0.2)' }} />
                </div>
                <button style={{ width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: isAuthenticating ? 'not-allowed' : 'pointer', opacity: isAuthenticating ? 0.7 : 1, transition: 'all 0.2s' }} onClick={verifyOtp} disabled={isAuthenticating} onMouseDown={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(0.98)'}} onMouseUp={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(1)'}}>
                  {isAuthenticating ? 'Verifying...' : 'Verify Code'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setOtpSent(false); }} style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#64748b'}>&larr; Back to login</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

