"use client";

import { useState } from 'react';

export default function PreviewEngine({ report }) {
  const [isExporting, setIsExporting] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  const handleDocxExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      
      if (!res.ok) throw new Error("Failed to generate DOCX");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_${report.reportData.subject}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
    setIsExporting(false);
  };

  const handleEmail = async () => {
    if (!emailTo) return alert("Please enter an email address");
    setIsExporting(true);
    try {
      // For this demo, we assume the PDF is already generated on the server or passed as base64
      // In production, we'd trigger a PDF generation API here before emailing
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: `Assignment Report: ${report.reportData.subject}`,
          text: 'Here is your generated report.',
          pdfBase64: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLY31jBQKCgzhQq4hCgC5WQa2CmVuZHN0cmVhbQplbmRvYmoK' // Dummy tiny PDF
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert("Email sent successfully securely from the server!");
    } catch(e) {
      alert("Failed to send email: " + e.message);
    }
    setIsExporting(false);
  };

  return (
    <div className="preview-engine">
      <h3 className="text-gradient">Report Preview</h3>
      <div className="preview-toolbar" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <button className="btn btn-primary" onClick={handleDocxExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : '📄 Download True DOCX'}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="email" placeholder="student@univ.edu" className="form-control" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={handleEmail} disabled={isExporting}>
            ✉️ Secure Email
          </button>
        </div>
      </div>
      
      <div className="a4-preview-mock" style={{ border: '1px solid #e2e8f0', padding: '2rem', height: '400px', overflowY: 'auto', background: '#fff', color: '#000' }}>
        <h1 style={{ textAlign: 'center', color: 'darkred' }}>Siddaganga Institute of Technology</h1>
        <h2 style={{ textAlign: 'center' }}>{report.reportData.subject}</h2>
        <hr />
        {report.answers.map((a, i) => (
          <div key={i} style={{ marginTop: '1rem' }}>
            <h3 style={{ color: 'darkblue' }}>{a.unit} - Q{a.num}: {a.text}</h3>
            <div dangerouslySetInnerHTML={{ __html: a.answerHTML }} />
          </div>
        ))}
      </div>
    </div>
  );
}
