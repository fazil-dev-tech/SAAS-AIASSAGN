import React from 'react';
import { motion } from 'framer-motion';

export default function Dashboard({
  user,
  stats,
  startWizard,
  startBatchWizard,
  startAdmin,
  savedReports,
  setForm,
  setReport,
  setView
}) {
  return (
    <motion.div 
      className="page active" 
      key="dashboard" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      transition={{ duration: 0.5, ease: "easeOut" }} 
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Hero */}
      <div className="glass-card hero-section" style={{ padding: '2.5rem 3rem' }}>
        <div className="hero-content">
          <p className="mono" style={{ color: 'var(--accent)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>WELCOME BACK</p>
          <h1 className="hero-title">
            Hello, <span className="text-gradient">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px' }}>
            Generate professional, AI-powered academic reports with pixel-perfect SIT VTU formatting.
          </p>
          <button className="btn btn-primary" onClick={startWizard} style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
            ✨ Create New Report
          </button>
        </div>
        <div className="hero-bg-icon">📄</div>
      </div>

      {/* REAL Stats from Supabase */}
      <div className="stats-grid" style={{ marginTop: '2rem' }}>
        {[
          { icon: '📊', label: 'Reports Generated', value: stats.reports, color: 'var(--accent)' },
          { icon: '📝', label: 'Total Words', value: stats.words.toLocaleString(), color: 'var(--success)' },
          { icon: '⚡', label: 'AI Engine', value: 'Puter', color: 'var(--warning)' },
          { icon: '📧', label: 'Emails Sent', value: stats.emails, color: 'var(--accent2)' },

<truncated 4258 bytes>