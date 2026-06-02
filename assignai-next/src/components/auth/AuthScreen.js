import React from 'react';
import { motion } from 'framer-motion';

export default function AuthScreen({
  loginType,
  setLoginType,
  authEmail,
  setAuthEmail,
  isAuthenticating,
  requestOtp,
  otpSent,
  setOtpSent,
  authOtp,
  setAuthOtp,
  verifyOtp,
  authPassword,
  setAuthPassword,
  adminLogin
}) {
  return (
    <motion.div 
      className="page active" 
      key="auth" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      transition={{ duration: 0.5, ease: "easeOut" }} 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)' }}
    >
      <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '3rem 2.5rem', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="AssignAI Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto 1rem', display: 'block', borderRadius: '50%', boxShadow: 'var(--shadow-glow)' }} />
        <h1 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>AssignAI</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Premium AI-Powered Academic Report Generator</p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          <button 
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.5rem', color: loginType === 'student' ? 'var(--text)' : 'var(--text-secondary)', borderBottom: loginType === 'student' ? '2px solid var(--accent)' : 'none', cursor: 'pointer', fontWeight: loginType === 'student' ? 'bold' : 'normal' }}
            onClick={() => setLoginType('student')}>
            Student Login
          </button>
          <button 
            style={{ flex: 1, background: 'transparent', border: 'none', paddi
<truncated 3377 bytes>