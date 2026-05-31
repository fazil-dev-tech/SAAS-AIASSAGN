"use client";

import { useState } from 'react';
import PreviewEngine from '../preview/PreviewEngine';
import { puter } from '@heyputer/puter.js';

export default function Wizard({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '', subject: '', course: '', inst: 'Siddaganga Institute of Technology, Tumakuru', dept: 'ISE', students: []
  });
  const [fileContent, setFileContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  const handleNext = () => setStep(s => s + 1);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // 1. Wikipedia Grounding API
      const groundRes = await fetch('/api/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: formData.subject, title: formData.title })
      });
      const groundData = await groundRes.json();

      // 2. Client-Side AI Generation using Puter (No manual token needed!)
      const generatedAnswers = [];
      const questions = [
        { unit: 'Unit 1', num: 1, text: `Explain the core concepts of ${formData.subject}` }
        // Real implementation extracts from PDF
      ];

      for (const q of questions) {
        const prompt = `You are a strict academic professor generating a detailed answer for the subject "${formData.subject}".
        Question: ${q.text}
        Fact-checked context (use this if relevant): ${groundData.context || 'None'}
        Provide a highly detailed, professional academic response formatted in HTML. Do not include markdown tags like \`\`\`html. 
        Just return raw HTML content (paragraphs, lists, etc).`;

        const response = await puter.ai.chat(prompt);
        
        let imageHtml = '';
        if (q.text.toLowerCase().includes('diagram') || q.text.toLowerCase().includes('architecture')) {
            try {
               const imgUrl = await puter.ai.txt2img(`Academic diagram illustrating: ${q.text} in context of ${formData.subject}`);
               imageHtml = `<br/><img src="${imgUrl}" alt="Generated Diagram" style="max-width:100%; border:1px solid #ccc; margin-top:1rem;"/>`;
            } catch(e) {
               console.log("Image gen failed", e);
            }
        }

        generatedAnswers.push({
          unit: q.unit,
          num: q.num,
          text: q.text,
          answerHTML: response + imageHtml
        });
      }

      // 3. Database Save API (Fails gracefully if no Supabase keys)
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'demo-user',
          title: formData.title,
          subject: formData.subject,
          htmlContent: '<p>Report content generated.</p>' // Real HTML
        })
      }).catch(e => console.log("DB save skipped."));

      setGeneratedReport({ reportData: formData, answers: generatedAnswers });
      setStep(4);
    } catch (e) {
      alert("Generation failed: " + e.message);
    }
    setIsGenerating(false);
  };

  return (
    <div className="wizard-container glass-card" style={{ padding: '2rem' }}>
      {/* Basic Step Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        {['Details', 'Upload', 'Generate', 'Preview'].map((s, i) => (
          <div key={i} style={{ fontWeight: step === i + 1 ? 'bold' : 'normal', color: step === i + 1 ? 'var(--primary)' : '#888' }}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="step-content">
          <h3>Report Details</h3>
          <input className="form-control" placeholder="Assignment Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ marginBottom: '1rem', width: '100%', padding: '0.5rem' }} />
          <input className="form-control" placeholder="Subject Name" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} style={{ marginBottom: '1rem', width: '100%', padding: '0.5rem' }} />
          <button className="btn btn-primary" onClick={handleNext}>Next: Upload Questions</button>
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <h3>Upload PDF</h3>
          <input type="file" accept=".pdf,.txt" onChange={e => setFileContent(e.target.files[0]?.name)} style={{ marginBottom: '1rem' }} />
          <button className="btn btn-primary" onClick={handleNext}>Next: Generate</button>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <h3>Generate Report</h3>
          <p>Ready to synthesize answers for {fileContent}?</p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating with AI...' : '✨ Start Generation'}
          </button>
        </div>
      )}

      {step === 4 && generatedReport && (
        <div className="step-content">
          <PreviewEngine report={generatedReport} />
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={onComplete}>Finish & Back to Dashboard</button>
        </div>
      )}
    </div>
  );
}
