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
      
      {/* EXTREME AMBIENT GLOW EFFECTS */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ zIndex: 10, width: '100%', maxWidth: '440px', padding: '3.5rem 3rem', textAlign: 'center', borderRadius: '32px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)', backdropFilter: 'blur(50px)', WebkitBackdropFilter: 'blur(50px)' }}>
        
        <div style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', borderRadius: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 35px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)', overflow: 'hidden' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>
        
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '0.5rem', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>AssignAI Network</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Secure Biometric Generation Core</p>

        <div style={{ display: 'flex', position: 'relative', marginBottom: '2.5rem', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loginType === 'login' && <motion.div layoutId="auth-tab" style={{ position: 'absolute', top: 6, bottom: 6, left: 6, width: 'calc(50% - 6px)', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' }} />}
          {loginType === 'signup' && <motion.div layoutId="auth-tab" style={{ position: 'absolute', top: 6, bottom: 6, right: 6, width: 'calc(50% - 6px)', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' }} />}
          
          <button 
            style={{ flex: 1, zIndex: 1, background: 'transparent', border: 'none', padding: '0.8rem', color: loginType === 'login' ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'color 0.3s' }}
            onClick={() => setLoginType('login')}>
            Identity Sync
          </button>
          <button 
            style={{ flex: 1, zIndex: 1, background: 'transparent', border: 'none', padding: '0.8rem', color: loginType === 'signup' ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'color 0.3s' }}
            onClick={() => setLoginType('signup')}>
            New Identity
          </button>
        </div>

        <div style={{ textAlign: 'left' }}>
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div key="form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                {loginType === 'signup' && (
                  <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
                    <input type="text" placeholder="Full Identity Name" value={authName} onChange={e => setAuthName(e.target.value)} disabled={isAuthenticating} style={{ width: '100%', padding: '16px 20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} onFocus={(e) => {e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(0,0,0,0.5)'}} onBlur={(e) => {e.target.style.borderColor = 'rgba(255,255,255,0.05)'; e.target.style.background = 'rgba(0,0,0,0.3)'}} />
                  </div>
                )}
                <div style={{ marginBottom: '2rem', position: 'relative' }}>
                  <input type="email" placeholder="Primary Email Vector" value={authEmail} onChange={e => setAuthEmail(e.target.value)} disabled={isAuthenticating} style={{ width: '100%', padding: '16px 20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} onFocus={(e) => {e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(0,0,0,0.5)'}} onBlur={(e) => {e.target.style.borderColor = 'rgba(255,255,255,0.05)'; e.target.style.background = 'rgba(0,0,0,0.3)'}} />
                </div>
                
                <button style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: isAuthenticating || (loginType === 'signup' && !authName.trim()) ? 'not-allowed' : 'pointer', opacity: isAuthenticating || (loginType === 'signup' && !authName.trim()) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' }} onClick={requestOtp} disabled={isAuthenticating || (loginType === 'signup' && !authName.trim())} onMouseDown={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(0.97)'}} onMouseUp={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(1)'}}>
                  {isAuthenticating ? 'Transmitting...' : 'Initialize Uplink'}
                </button>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div style={{ marginBottom: '2rem', position: 'relative' }}>
                  <input type="text" placeholder="• • • • • •" maxLength={6} value={authOtp} onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ''))} disabled={isAuthenticating} style={{ width: '100%', padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid #10b981', borderRadius: '16px', color: '#10b981', fontSize: '1.5rem', letterSpacing: '10px', textAlign: 'center', outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(16,185,129,0.2)' }} />
                </div>
                <button style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: isAuthenticating ? 'not-allowed' : 'pointer', opacity: isAuthenticating ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' }} onClick={verifyOtp} disabled={isAuthenticating} onMouseDown={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(0.97)'}} onMouseUp={(e) => { if (!e.target.disabled) e.target.style.transform = 'scale(1)'}}>
                  {isAuthenticating ? 'Verifying Neural Match...' : 'Confirm Authentication'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setOtpSent(false); }} style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#64748b'}>&larr; Abort & Return</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
