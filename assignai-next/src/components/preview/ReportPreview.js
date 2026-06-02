import React from 'react';
import { motion } from 'framer-motion';

export default function ReportPreview({
  report,
  form,
  setView,
  handleDownload,
  emailTo,
  setEmailTo,
  sendEmail,
  emailSending
}) {
  if (!report) return null;

  return (
    <motion.div 
      className="page active" 
      key="preview" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      transition={{ duration: 0.5, ease: "easeOut" }} 
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Toolbar */}
      <div className="preview-topbar glass-card">
        <div className="preview-actions">
          <button className="btn btn-secondary" onClick={() => setView('dashboard')}>← Dashboard</button>
          <button className="btn btn-primary" onClick={() => handleDownload('pdf')} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>📕 Download PDF</button>
          <a href="/SIT_Front_Page_Editable.docx" download className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>📄 SIT Front Page</a>
        </div>
        <div className="preview-email-group">
          <input type="email" className="form-control" placeholder="email@uni.edu" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={sendEmail} disabled={emailSending}>
            {emailSending ? '⏳ Sending...' : '✉️ Email PDF'}
          </button>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="report-page-container" style={{ background: '#94a3b8', padding: '2rem', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
        <div id="report-preview-content" className="a4-container">

          {/* ── CONTINUOUS DOCUMENT ── */}
          <div className="report-document">
            
            {/* Single HTML header for screen 
<truncated 1684 bytes>