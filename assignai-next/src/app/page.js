"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const sb = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

/* ── Puter.js loader (properly via CDN for browser, avoids SSR issues with NPM) ── */
function loadPuter() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.puter) { resolve(window.puter); return; }
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.onload = () => resolve(window.puter);
    document.head.appendChild(script);
  });
}

const extractImageBase64 = async (imgResult) => {
  if (!imgResult) return '';
  if (typeof imgResult === 'string') return imgResult;
  if (imgResult instanceof HTMLImageElement) {
    if (imgResult.src && imgResult.src.startsWith('data:')) return imgResult.src;
    return new Promise((resolve) => {
      const toBase64 = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgResult.width || imgResult.naturalWidth || 800;
          canvas.height = imgResult.height || imgResult.naturalHeight || 600;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgResult, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) { resolve(imgResult.src || ''); }
      };
      if (imgResult.complete) toBase64();
      else {
        imgResult.crossOrigin = 'anonymous';
        imgResult.onload = toBase64;
        imgResult.onerror = () => resolve(imgResult.src || '');
      }
    });
  }
  return imgResult?.src || '';
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('auth');
  const [theme, setTheme] = useState('dark');
  const [toasts, setToasts] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [stats, setStats] = useState({ reports: 0, words: 0, emails: 0 });

  const [authEmail, setAuthEmail] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginType, setLoginType] = useState('student');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);

  /* ── THEME ── */
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  /* ── TOAST ── */
  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  /* ── AUTH ── */
  useEffect(() => {
    const savedUser = localStorage.getItem('assignai_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  const requestOtp = async () => {
    if (!authEmail.includes('@')) { toast('Enter a valid email address', 'error'); return; }
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        toast('OTP sent to your email!', 'success');
      } else {
        toast(data.error || 'Failed to send OTP', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    }
    setIsAuthenticating(false);
  };

  const verifyOtp = async () => {
    if (authOtp.length !== 6) { toast('OTP must be 6 digits', 'error'); return; }
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, code: authOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('assignai_user', JSON.stringify(data.user));
        setView('dashboard');
        toast('Logged in successfully!', 'success');
      } else {
        toast(data.error || 'Invalid OTP', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    }
    setIsAuthenticating(false);
  };

  const adminLogin = () => {
    if (authEmail === 'mohamedfazilpasha156@gmail.com' && authPassword === 'Adil123#') {
      const adminUser = { email: 'mohamedfazilpasha156@gmail.com', id: 'admin-super' };
      setUser(adminUser);
      localStorage.setItem('assignai_user', JSON.stringify(adminUser));
      setView('dashboard');
      toast('Admin logged in successfully!', 'success');
    } else {
      toast('Invalid Admin Credentials', 'error');
    }
  };

  const signOut = () => {
    localStorage.removeItem('assignai_user');
    setUser(null);
    setView('auth');
    setOtpSent(false);
    setAuthEmail('');
    setAuthOtp('');
    toast('Signed out.', 'success');
  };

  /* ── FETCH REAL STATS + REPORT HISTORY ── */
  useEffect(() => {
    if (!sb || !user?.id) return;
    
    // Fetch reports
    const query = user.id === 'admin-super'
      ? sb.from('reports').select('*').order('created_at', { ascending: false })
      : sb.from('reports').select('*').eq('user_id', user.email || user.id).order('created_at', { ascending: false });
      
    query.then(({ data }) => {
        if (data) {
          setSavedReports(data);
          setStats({
            reports: data.length,
            words: data.reduce((sum, r) => sum + (r.word_count || 0), 0),
            emails: new Set(data.map(r => r.user_id)).size
          });
        }
      });
  }, [user, view]);

  /* ── WIZARD STATE ── */
  const [wizStep, setWizStep] = useState(0);
  const INITIAL_FORM = {
    title: '', subject: 'Biology for Engineers', course: '', dept: 'ISE',
    inst: 'Siddaganga Institute of Technology, Tumakuru',
    includeCoverPage: true,
    students: [{ name: '', roll: '' }],
  };
  const [form, setForm] = useState(INITIAL_FORM);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genLogs, setGenLogs] = useState([]);
  const [report, setReport] = useState(null);

  /* ── LOCALSTORAGE AUTO-SAVE ── */
  useEffect(() => {
    const saved = localStorage.getItem('assignai-form');
    if (saved) { try { setForm(JSON.parse(saved)); } catch {} }
  }, []);
  useEffect(() => {
    if (form.title || form.subject) localStorage.setItem('assignai-form', JSON.stringify(form));
  }, [form]);

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const addStudent = () => setForm(f => ({ ...f, students: [...f.students, { name: '', roll: '' }] }));
  const removeStudent = (i) => setForm(f => ({ ...f, students: f.students.filter((_, idx) => idx !== i) }));
  const updateStudent = (i, key, val) => setForm(f => ({
    ...f, students: f.students.map((s, idx) => idx === i ? { ...s, [key]: val } : s)
  }));

  const startWizard = () => { setView('wizard'); setWizStep(0); setReport(null); setGenLogs([]); setGenProgress(0); };

  /* ── BATCH WIZARD STATE ── */
  const [batchStep, setBatchStep] = useState(0);
  const [batchStudents, setBatchStudents] = useState([]);
  const [batchLogs, setBatchLogs] = useState([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchZipBlob, setBatchZipBlob] = useState(null);

  const startBatchWizard = () => { setView('batch-wizard'); setBatchStep(0); setBatchLogs([]); setBatchProgress(0); setBatchZipBlob(null); setBatchStudents([]); };

  const startAdmin = () => { setView('admin'); };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const students = lines.map((l, i) => {
        const parts = l.split(',');
        return { name: parts[0]?.trim() || `Student ${i+1}`, roll: parts[1]?.trim() || '' };
      });
      setBatchStudents(students);
      setBatchStep(3); // skip straight to Review
    };
    reader.readAsText(file);
  };

  const startBatchGeneration = async () => {
    if (!form.subject || !form.title || extractedQuestions.length === 0 || batchStudents.length === 0) {
      toast("Missing required details", "error");
      return;
    }
    
    setIsBatchGenerating(true);
    setBatchStep(4);
    setBatchLogs(["🚀 Starting Batch Assignment Generation..."]);
    
    const zip = new JSZip();
    let completed = 0;
    
    for (let i = 0; i < batchStudents.length; i++) {
      const student = batchStudents[i];
      setBatchLogs(l => [...l, `[${i+1}/${batchStudents.length}] Generating for ${student.name}...`]);
      
      try {
        const answers = [];
        for (let j = 0; j < extractedQuestions.length; j++) {
           const q = extractedQuestions[j];
           const minWords = 450; // Force highly detailed 1-page length
           const puter = window.puter;
           const prompt = `You are a student (${student.name}, USN: ${student.roll}) answering this specific question for ${form.subject}.
Question: ${q.text}
Requirements:
1. VERY IMPORTANT: Write the answer exactly as a student would write it in their assignment notebook.
2. Use simple formatting: use <b> for bold, <i> for italics, <br> for new lines, and <p> for short paragraphs (max 4-5 sentences).
3. Be EXTREMELY comprehensive and highly detailed (target ~${minWords} words) to completely fill a full A4 page.
4. CRITICAL: You MUST properly close EVERY HTML tag (e.g. <b>term</b>). DO NOT wrap the entire answer in bold/strong tags.
5. DO NOT use markdown. DO NOT output \`\`\`html. Output ONLY the raw HTML string for the solution itself.`;

           let rawHTML = '';
           let attempts = 0;
           let success = false;
           while (attempts < 3 && !success) {
             try {
               const resp = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
               let currentRaw = '';
               if (typeof resp === 'string') currentRaw = resp;
               else if (Array.isArray(resp?.message?.content)) currentRaw = resp.message.content.map(c => c.text || '').join('\n');
               else if (typeof resp?.message?.content === 'string') currentRaw = resp.message.content;
               else if (resp?.text) currentRaw = resp.text;
               else if (resp && typeof resp.toString === 'function' && resp.toString() !== '[object Object]') currentRaw = resp.toString();
               else currentRaw = JSON.stringify(resp) || '';

               currentRaw = String(currentRaw).replace(/```html/gi, '').replace(/```/g, '').trim();
               if (currentRaw.length > 50) {
                 rawHTML = currentRaw;
                 success = true;
               } else {
                 throw new Error("Answer too short");
               }
             } catch (e) {
               attempts++;
               if (attempts < 3) {
                 setBatchLogs(l => [...l, `  ⚠️ Q${j+1} failed. Retrying (${attempts}/3)...`]);
                 await new Promise(r => setTimeout(r, 2000));
               }
             }
           }
           
           if (!success) {
             rawHTML = `<p><em>Failed to generate after 3 attempts.</em></p>`;
           }
           
           // Auto-generate diagram if requested and question mentions image/diagram
           let diagramHtml = '';
           const needsDiagram = includeImages && /diagram|architecture|flowchart|block\s*diagram|structure|draw|image|illustrate|sketch|figure|picture|table/i.test(q.text);
           if (needsDiagram) {
             try {
               const imgResult = await puter.ai.txt2img(`Professional academic style diagram for a college report. Clear, technical, minimalist educational illustration. Subject: ${form.subject}. Topic: ${q.text}`, { model: 'google/imagen-4.0' });
               if (imgResult) {
                 const imgSrc = await extractImageBase64(imgResult);
                 if (imgSrc) diagramHtml = `<div style="text-align:center;margin:1rem 0"><img src="${imgSrc}" alt="Diagram" style="max-width:90%;border:1px solid #ccc;border-radius:4px"/><p style="font-style:italic;font-size:10pt;color:#666">Fig: Illustration for ${q.text.substring(0, 40)}</p></div>`;
               }
             } catch (e) { console.log('Image generation failed', e); }
           }
           
           answers.push({ ...q, num: j + 1, answerHTML: rawHTML + diagramHtml });
        }
        
        setBatchLogs(l => [...l, `  - Compiling DOCX for ${student.name}...`]);
        const docxResp = await fetch('/api/export/docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reportData: { ...form, students: [student] }, 
            answers 
          })
        });
        
        if (!docxResp.ok) throw new Error("Failed to generate DOCX");
        const blob = await docxResp.blob();
        
        zip.file(`${student.name.replace(/[^a-z0-9]/gi, '_')}_${form.subject.replace(/[^a-z0-9]/gi, '_')}.docx`, blob);
        
        if (sb && user) {
          await sb.from('reports').insert([{
            user_id: user.email || user.id,
            assignment_title: form.title,
            subject: `${form.subject} | Student: ${student.name}`,
            word_count: answers.reduce((sum, a) => sum + (a.answerHTML.split(' ').length), 0)
          }]);
        }
        
      } catch (err) {
        setBatchLogs(l => [...l, `❌ Error generating for ${student.name}: ${err.message}`]);
      }
      
      completed++;
      setBatchProgress((completed / batchStudents.length) * 100);
      
      if (i < batchStudents.length - 1) {
         setBatchLogs(l => [...l, `  - Cooling down AI (3s) before next student...`]);
         await new Promise(r => setTimeout(r, 3000));
      }
    }
    
    setBatchLogs(l => [...l, `✅ Batch complete! Compiling ZIP...`]);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    setBatchZipBlob(zipBlob);
    setIsBatchGenerating(false);
    setBatchLogs(l => [...l, `🎉 Ready to download!`]);
  };

  const parseQuestionsWithAI = async (rawText) => {
    toast('🤖 AI is perfectly structuring the document...', 'info');
    try {
      const puter = await loadPuter();
      const prompt = `You are a strict document parser. I will provide raw text extracted from an assignment document. Extract all the questions and their associated Units/Modules/Chapters. Fix any OCR typos.
Return ONLY a valid JSON array of objects. Do not wrap it in markdown. Do not add any text before or after.
Format: [{"unit": "Unit Name", "num": 1, "text": "Question text..."}]

Raw Text:
${rawText.substring(0, 8000)}`;

      const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
      let jsonText = '';
      if (typeof response === 'string') jsonText = response;
      else if (Array.isArray(response?.message?.content)) jsonText = response.message.content.map(c => c.text || '').join('\n');
      else if (typeof response?.message?.content === 'string') jsonText = response.message.content;
      else jsonText = response?.text || '';
      
      jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(jsonText);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        
        // Randomly select 5 questions per unit if there are multiple units (Unit-wise doc)
        const units = [...new Set(parsed.map(q => q.unit))];
        if (units.length > 1) {
           let limitedQuestions = [];
           units.forEach(u => {
              const unitQs = parsed.filter(q => q.unit === u);
              // Shuffle array to randomize selection
              const shuffled = unitQs.sort(() => 0.5 - Math.random());
              limitedQuestions.push(...shuffled.slice(0, 5));
           });
           // Re-sort back to original logical order
           parsed = limitedQuestions.sort((a, b) => {
              if (a.unit === b.unit) return a.num - b.num;
              return units.indexOf(a.unit) - units.indexOf(b.unit);
           });
           toast('Automatically selected 5 random questions per unit.', 'info');
        }

        setExtractedQuestions(parsed);
        toast(`✨ AI perfectly extracted ${parsed.length} questions!`, 'success');
        return true;
      }
    } catch (err) {
      console.error('AI parse error:', err);
      toast('AI Parsing failed, falling back to simple extraction.', 'error');
    }
    return false;
  };

  /* ── FILE UPLOAD (Real PDF.js & Tesseract OCR & AI Parsing) ── */
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          if (!window.pdfjsLib) {
            toast('Loading PDF Engine...', 'info');
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            document.head.appendChild(script);
            await new Promise(r => script.onload = r);
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          const pdf = await window.pdfjsLib.getDocument(new Uint8Array(ev.target.result)).promise;
          let extractedLines = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            content.items.sort((a, b) => {
              if (Math.abs(a.transform[5] - b.transform[5]) > 5) return b.transform[5] - a.transform[5];
              return a.transform[4] - b.transform[4];
            });
            
            let currentLineY = null;
            let currentLineStr = '';
            content.items.forEach(item => {
              if (currentLineY === null) {
                currentLineY = item.transform[5];
                currentLineStr = item.str;
              } else if (Math.abs(currentLineY - item.transform[5]) <= 5) {
                currentLineStr += (currentLineStr.endsWith(' ') ? '' : ' ') + item.str.trim();
              } else {
                extractedLines.push(currentLineStr.trim());
                currentLineY = item.transform[5];
                currentLineStr = item.str;
              }
            });
            if (currentLineStr) extractedLines.push(currentLineStr.trim());
          }

          let rawText = extractedLines.filter(l => l.length > 0).join('\n');
          
          if (rawText.length < 50) { // Likely Scanned PDF
            toast('Running AI Vision OCR on scanned PDF...', 'info');
            if (!window.Tesseract) {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
              document.head.appendChild(script);
              await new Promise(r => script.onload = r);
            }
            rawText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport }).promise;
              const result = await window.Tesseract.recognize(canvas, 'eng');
              rawText += result.data.text + '\n';
            }
          }

          // Use AI to perfectly parse the raw text
          const success = await parseQuestionsWithAI(rawText);
          if (!success) {
             // Fallback
             const lines = rawText.split('\n').filter(l => l.trim().length > 15);
             setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim() })));
             toast(`Extracted ${lines.length} questions using fallback.`, 'success');
          }

        } catch (err) { toast('PDF parse failed: ' + err.message, 'error'); }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      toast('Running AI Vision OCR on image...', 'info');
      try {
        if (!window.Tesseract) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
          document.head.appendChild(script);
          await new Promise(r => script.onload = r);
        }
        const result = await window.Tesseract.recognize(file, 'eng');
        const success = await parseQuestionsWithAI(result.data.text);
        if (!success) {
           const lines = result.data.text.split('\n').filter(l => l.trim().length > 10);
           setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim() })));
           toast(`Extracted ${lines.length} questions from image fallback.`, 'success');
        }
      } catch (e) {
        toast('Failed to read text from image.', 'error');
      }
    } else {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const success = await parseQuestionsWithAI(ev.target.result);
        if (!success) {
          const lines = ev.target.result.split('\n').filter(l => l.trim().length > 5);
          setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim() })));
          toast(`Loaded ${lines.length} questions using fallback.`, 'success');
        }
      };
      reader.readAsText(file);
    }
  };

  /* ── GENERATE (Real Puter AI + Wikipedia + Diagrams) ── */
  const handleGenerate = async () => {
    if (extractedQuestions.length === 0) { toast('No questions!', 'error'); return; }
    setGenerating(true); setGenProgress(0);
    setGenLogs([{ text: '🔄 Initializing Puter AI Engine...', status: 'active' }]);

    try {
      // 1. Load Puter
      const puter = await loadPuter();
      setGenLogs(l => [{ text: '✅ Puter AI Engine loaded', status: 'done' }, ...l.slice(1)]);

      // 2. Wikipedia grounding
      setGenLogs(l => [...l, { text: '📚 Fetching Wikipedia context...', status: 'active' }]);
      let context = '';
      try {
        const res = await fetch('/api/grounding', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: form.subject, title: form.title })
        });
        const data = await res.json();
        context = data.context || '';
        setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: `📚 Loaded ${context.length} chars of context`, status: 'done' }; return c; });
      } catch { setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: '📚 Wikipedia unavailable', status: 'error' }; return c; }); }
      setGenProgress(10);

      // 3. Generate each answer
      const answers = [];
      const total = extractedQuestions.length;
      for (let i = 0; i < total; i++) {
        const q = extractedQuestions[i];
        const seqNum = i + 1; // Always sequential: 1, 2, 3...
        setGenLogs(l => [...l, { text: `✨ Q${seqNum}: ${q.text.substring(0, 60)}...`, status: 'active' }]);

        const needsDiagram = includeImages && /diagram|architecture|flowchart|block\s*diagram|structure|draw|image|illustrate|sketch|figure|picture|table/i.test(q.text);
        
        // Force full-page answers (target ~450 words) to ensure 1 question = 1 full page.
        // If it has a diagram, it will naturally push to ~1.5 - 2 pages.
        const minWords = total > 20 ? 250 : 450; 
        const seed = `${Date.now()}-${user?.email}-${Math.random().toString(36).slice(2)}`;
        const prompt = `You are a senior academic professor writing an extremely detailed and exhaustive answer for "${form.subject}".
Variation seed: ${seed}
Question: ${q.text}
Factual context: ${context || 'Use your knowledge.'}
Write a comprehensive, professional academic answer (target ~${minWords} words). It MUST be highly detailed to completely fill a full A4 page.
Format as clean HTML: use <h4> for sub-headings, <p> for short paragraphs (max 4-5 sentences), <ul><li> for lists, <strong> for key terms.
CRITICAL RULES:
1. You MUST properly close EVERY HTML tag (e.g. <strong>term</strong>).
2. DO NOT wrap the entire answer in bold/strong tags. Only use <strong> for short specific key terms or headings.
3. Do NOT wrap in \`\`\`html. Return raw HTML only.`;

        let answerText = '';
        let attempts = 0;
        let success = false;

        // Retry loop to ensure NO QUESTION IS MISSED
        while (attempts < 3 && !success) {
          try {
            const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
            if (total > 5) await new Promise(r => setTimeout(r, 800)); // Rate limit protection
            
            let currentText = '';
            if (typeof response === 'string') currentText = response;
            else if (Array.isArray(response?.message?.content)) currentText = response.message.content.map(c => c.text || '').join('\n');
            else if (typeof response?.message?.content === 'string') currentText = response.message.content;
            else if (response?.text) currentText = response.text;
            else if (response && typeof response.toString === 'function' && response.toString() !== '[object Object]') currentText = response.toString();
            else currentText = JSON.stringify(response) || '';

            currentText = String(currentText).replace(/```html/gi, '').replace(/```/g, '').trim();
            
            if (currentText.length > 50) {
              answerText = currentText;
              success = true;
            } else {
              throw new Error("Answer too short or blank");
            }
          } catch (err) {
            attempts++;
            if (attempts < 3) {
              setGenLogs(l => [...l, { text: `⚠️ Generation failed for Q${seqNum}. Retrying (${attempts}/3)...`, status: 'active' }]);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }

        if (!success) {
          answerText = `<p><em>Failed to generate answer for this question after 3 attempts. Please try regenerating.</em></p>`;
        }

        // 4. Auto-generate diagram if question mentions diagram/architecture/flowchart/image/draw
        let diagramHtml = '';
        if (needsDiagram) {
          setGenLogs(l => [...l, { text: `🎨 Generating diagram for Q${seqNum}...`, status: 'active' }]);
          try {
            const imgResult = await puter.ai.txt2img(`Professional academic style diagram for a college report. Clear, technical, minimalist educational illustration. Subject: ${form.subject}. Topic: ${q.text}`, { model: 'google/imagen-4.0' });
            if (imgResult) {
              const imgSrc = await extractImageBase64(imgResult);
              if (imgSrc) diagramHtml = `<div style="text-align:center;margin:1rem 0"><img src="${imgSrc}" alt="Diagram" style="max-width:90%;border:1px solid #ccc;border-radius:4px"/><p style="font-style:italic;font-size:10pt;color:#666">Fig: Illustration for ${q.text.substring(0, 40)}</p></div>`;
            }
            setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: `🎨 Diagram generated for Q${seqNum}`, status: 'done' }; return c; });
          } catch (e) {
            setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: `🎨 Diagram skipped (${e.message})`, status: 'error' }; return c; });
          }
        }

        answers.push({ unit: q.unit, num: seqNum, text: q.text, answerHTML: answerText + diagramHtml });
        setGenProgress(10 + Math.round(((i + 1) / total) * 80));
        setGenLogs(l => { const c = [...l]; const idx = c.findLastIndex(x => x.text.startsWith(`✨ Q${seqNum}`)); if (idx >= 0) c[idx] = { text: `✅ Q${seqNum} complete (${answerText.length} chars)`, status: 'done' }; return c; });
      }

      // 5. Save to Supabase
      setGenLogs(l => [...l, { text: '💾 Archiving to cloud database...', status: 'active' }]);
      const wordCount = answers.reduce((sum, a) => sum + String(a.answerHTML || '').replace(/<[^>]+>/g, '').split(/\s+/).length, 0);
      try {
        const studentNames = form.students.map(s => s.name).filter(Boolean).join(', ');
        const finalSubject = studentNames ? `${form.subject} | Student: ${studentNames}` : form.subject;
        const userId = user?.email || user?.id || 'guest';

        // Use client-side Supabase to save (works without service role key)
        if (sb) {
          const { error: dbErr } = await sb.from('reports').insert([{
            user_id: userId,
            assignment_title: form.title,
            subject: finalSubject,
            html_content: JSON.stringify(answers),
            word_count: wordCount
          }]);
          if (dbErr) throw dbErr;
        }

        setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: '💾 Report archived!', status: 'done' }; return c; });
      } catch(e) { console.error('DB save error:', e); setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: '💾 DB save skipped', status: 'error' }; return c; }); }

      setGenProgress(100);
      setReport({ reportData: form, answers });
      setGenLogs(l => [...l, { text: '🎉 All done! Downloading report...', status: 'done' }]);
      toast('Report generated successfully!', 'success');
      localStorage.removeItem('assignai-form');
      
      // Auto download removed as requested
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
      setGenLogs(l => [...l, { text: '❌ ' + err.message, status: 'error' }]);
    }
    setGenerating(false);
  };

  /* ── EXPORT: PDF (generates real base64 for email too) ── */
  const pdfBlobRef = useRef(null);
  const exportPdf = async (returnBlob = false) => {
    if (!window.html2pdf) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(s);
      await new Promise(r => s.onload = r);
    }
    const el = document.getElementById('report-preview-content');
    
    // Switch to export mode: hides HTML headers/footers and removes CSS padding
    // so we can rely purely on html2pdf's native margins and pagination.
    el.classList.add('pdf-export-mode');

    const opt = { 
      margin: [25, 0, 25, 0],  // Top and Bottom margins only! (Left/Right handled by CSS padding)
      filename: `Report_${form.subject}.pdf`, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, letterRendering: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['img', 'h1', 'h2', 'h3', 'li', '.question-label', 'p', 'tr', 'td'] }
    };
    
    const worker = window.html2pdf().set(opt).from(el).toPdf().get('pdf').then((pdf) => {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        // Header
        pdf.text('Academic year - 2025-26', 15, 15);
        const subj = form.subject?.split(' | Student:')[0] || '';
        pdf.text(subj, 195, 15, { align: 'right' });
        pdf.setDrawColor(139, 0, 0); // #8B0000
        pdf.setLineWidth(0.5);
        pdf.line(15, 18, 195, 18);
        
        // Footer
        pdf.line(15, 282, 195, 282);
        pdf.text(`Dept of ${form.dept}, ${form.inst}`, 15, 287);
        pdf.text(`Page ${i}`, 195, 287, { align: 'right' });
      }
    });

    if (returnBlob) {
      const blob = await worker.outputPdf('blob');
      pdfBlobRef.current = blob;
      el.classList.remove('pdf-export-mode');
      return blob;
    }
    await worker.save();
    el.classList.remove('pdf-export-mode');
    toast('PDF downloaded!', 'success');
  };

  /* ── EXPORT: DOCX ── */
  const exportDocx = async () => {
    toast('Generating Word document...', 'info');
    try {
      const res = await fetch('/api/export/docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportData: form, answers: report?.answers || [] }) });
      if (!res.ok) throw new Error('Server error');
      const blob = await res.blob();
      saveAs(blob, `Report_${(form.subject || 'Assignment').replace(/\s+/g, '_')}.docx`);
      toast('Word document downloaded!', 'success');
    } catch (e) { toast('DOCX failed: ' + e.message, 'error'); }
  };

  const handleDownload = (type) => {
    setShowScannerModal(true);
    if (type === 'pdf') exportPdf(false);
    if (type === 'docx') exportDocx();
  };

  /* ── EXPORT: EMAIL (sends REAL PDF, not placeholder) ── */
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const sendEmail = async () => {
    if (!emailTo) { toast('Enter an email', 'error'); return; }
    setEmailSending(true);
    toast('Generating PDF for email attachment...', 'info');
    try {
      const blob = await exportPdf(true);
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: `Assignment Report: ${form.subject}`, text: `Your AI-generated report for "${form.title}" is attached.`, pdfBase64: base64, filename: `Report_${form.subject}.pdf` })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast('Email sent with PDF attachment!', 'success');
    } catch (e) { toast('Email failed: ' + e.message, 'error'); }
    setEmailSending(false);
  };

  /* ── KEYBOARD SHORTCUTS ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (view === 'preview') setView('dashboard');
        else if (view === 'wizard' && wizStep > 0) setWizStep(s => s - 1);
        else if (view === 'wizard') setView('dashboard');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, wizStep]);

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="brand" onClick={() => user ? setView('dashboard') : null} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '1.5rem' }}>🎓</span>
          <span className="text-gradient">AssignAI</span>
          <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>PRO</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowScannerModal(true)} title="Buy Me A Coffee" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>☕ Support Me</button>
          <button className="btn btn-icon btn-secondary" onClick={toggleTheme} title="Toggle theme">{theme === 'dark' ? '☀️' : '🌙'}</button>
          {user && (
            <>
              <div className="user-pill">
                <div className="user-avatar">
                  {(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase() || 'G'}
                </div>
                <span className="user-email">{user.email?.split('@')[0]}</span>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={signOut}>Sign Out</button>
            </>
          )}
        </div>
      </header>

      <div className="container" style={{ paddingTop: '1.5rem' }}>
        <AnimatePresence mode="wait">

        {/* ══════════════════════════════════════════
            AUTH PAGE
            ══════════════════════════════════════════ */}
        {view === 'auth' && (
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)' }}>
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
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.5rem', color: loginType === 'admin' ? 'var(--text)' : 'var(--text-secondary)', borderBottom: loginType === 'admin' ? '2px solid var(--success)' : 'none', cursor: 'pointer', fontWeight: loginType === 'admin' ? 'bold' : 'normal' }}
                  onClick={() => setLoginType('admin')}>
                  Admin Portal
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                {loginType === 'student' ? (
                  !otpSent ? (
                    <>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email Address</label>
                      <input className="form-control" type="email" placeholder="you@university.edu" value={authEmail} onChange={e => setAuthEmail(e.target.value)} disabled={isAuthenticating} style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }} />
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={requestOtp} disabled={isAuthenticating}>
                        {isAuthenticating ? 'Sending...' : 'Continue with Email'}
                      </button>
                    </>
                  ) : (
                    <>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Enter 6-Digit Code</label>
                      <input className="form-control" type="text" placeholder="123456" maxLength={6} value={authOtp} onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ''))} disabled={isAuthenticating} style={{ width: '100%', marginBottom: '1rem', letterSpacing: '5px', textAlign: 'center', fontSize: '1.2rem', boxSizing: 'border-box' }} />
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={verifyOtp} disabled={isAuthenticating}>
                        {isAuthenticating ? 'Verifying...' : 'Secure Login'}
                      </button>
                      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); setOtpSent(false); }} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>&larr; Back to Email</a>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Admin Email</label>
                    <input className="form-control" type="email" placeholder="Admin Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }} />
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Admin Password</label>
                    <input className="form-control" type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }} />
                    <button className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={adminLogin}>
                      Login as Admin
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════
            DASHBOARD
            ══════════════════════════════════════════ */}
        {view === 'dashboard' && (
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', flexDirection: 'column' }}>
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
              ].map((s, i) => (
                <div key={i} className="glass-card stat-card" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <h3 style={{ marginBottom: '1rem', marginTop: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={startWizard}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📄</div>
                <h4 style={{ marginBottom: '0.5rem' }}>New Assignment</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Upload a question PDF and generate a full report with AI.</p>
              </div>
              {user?.email === 'mohamedfazilpasha156@gmail.com' && (
                <>
                  <div className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={startBatchWizard}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📦</div>
                    <h4 style={{ marginBottom: '0.5rem' }}>Batch Generate</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Upload CSV of students for bulk unique reports.</p>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={startAdmin}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
                    <h4 style={{ marginBottom: '0.5rem' }}>Admin Panel</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Analytics, audit logs, and user management.</p>
                  </div>
                </>
              )}
            </div>

            {/* REAL Report History */}
            <h3 style={{ marginBottom: '1rem' }}>Recent Reports</h3>
            {savedReports.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📭</div>
                <h4 style={{ color: 'var(--text-secondary)' }}>No reports yet</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Click &quot;Create New Report&quot; to get started.</p>
              </div>
            ) : (
              <div className="report-grid">
                {savedReports.map((r, i) => (
                  <div key={i} className="glass-card report-item">
                    <div className="report-meta">
                      <span className="badge badge-success">Complete</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4>{r.assignment_title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.subject}</p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.word_count?.toLocaleString() || '—'} words</div>
                    <button className="btn btn-primary" style={{ marginTop: '0.8rem', width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={(e) => {
                      e.stopPropagation();
                      const dummyForm = { title: r.assignment_title, subject: r.subject, dept: 'ISE', inst: 'SIT Tumakuru-03', students: [{name: '', roll: ''}] };
                      let savedAnswers = [];
                      try {
                        savedAnswers = JSON.parse(r.html_content);
                        if (!Array.isArray(savedAnswers)) throw new Error('Not an array');
                      } catch (err) {
                        // Fallback for older reports saved as raw html
                        savedAnswers = [{ text: '', answerHTML: r.html_content }];
                      }
                      setForm(dummyForm);
                      setReport({ reportData: dummyForm, answers: savedAnswers });
                      setView('preview');
                    }}>👀 View Report</button>
                  </div>
                ))}
              </div>
            )}
            
            {/* BOTTOM FULL PROFESSIONAL SET */}
            <div className="glass-card" style={{ marginTop: '3rem', padding: '3rem', display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center', justifyContent: 'center', borderColor: 'var(--accent)', background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(15,5,20,0.8) 100%)' }}>
              <div style={{ flex: '1 1 400px', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>☕ Support AssignAI</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.2rem', lineHeight: 1.6 }}>
                  Developed by <strong style={{ color: 'var(--text-primary)' }}>MOHAMED FAZIL PASHA</strong>.<br/>
                  If this tool has saved you valuable time on your academic reports, please consider buying me a coffee to support continuous platform improvements!
                </p>
                <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', display: 'inline-block' }}>
                  For technical support or enterprise solutions, contact:<br/>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.5rem', display: 'block', marginTop: '0.5rem' }}>📞 +91 7019145837</strong>
                </div>
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '24px', display: 'inline-block', boxShadow: '0 10px 40px rgba(236,72,153,0.3)' }}>
                  <img src="/scanner.jpg" alt="Payment Scanner" style={{ width: '250px', height: '250px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  <div style={{ display: 'none', color: '#666', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>Please add your QR code as public/scanner.jpg</div>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════
            WIZARD
            ══════════════════════════════════════════ */}
        {view === 'wizard' && (
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Stepper */}
            <div className="stepper">
              <div className="stepper-line"><div className="stepper-progress" style={{ width: `${(wizStep / 3) * 100}%` }} /></div>
              {['Details', 'Upload', 'Review', 'Generate'].map((label, i) => (
                <div key={i} className={`step ${wizStep === i ? 'active' : ''} ${wizStep > i ? 'done' : ''}`}>
                  <div className="step-dot">{wizStep > i ? '✓' : i + 1}</div>
                  <div className="step-label">{label}</div>
                </div>
              ))}
            </div>

            {/* STEP 0: Details */}
            {wizStep === 0 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Report Details</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Fill in the academic metadata. <span className="mono" style={{ fontSize: '0.7rem' }}>Auto-saved to browser.</span></p>

                <div className="form-grid">
                  <div className="form-group col-span-2">
                    <label className="form-label">Assignment Title</label>
                    <input className="form-control" placeholder="e.g. Assignment on Data Structures" value={form.title} onChange={e => updateForm('title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-control" placeholder="e.g. Biology" value={form.subject} onChange={e => updateForm('subject', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-control" placeholder="e.g. 21CS33" value={form.course} onChange={e => updateForm('course', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={form.dept} onChange={e => updateForm('dept', e.target.value)}>
                      <option>ISE</option><option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option><option>EEE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Institution</label>
                    <input className="form-control" value={form.inst} onChange={e => updateForm('inst', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(236,72,153,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <input type="checkbox" id="includeImages" checked={includeImages} onChange={e => setIncludeImages(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                  <label htmlFor="includeImages" style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    <strong>Generate AI Diagrams & Images</strong> <span style={{ color: 'var(--text-secondary)' }}>(when explicitly asked in a question)</span>
                  </label>
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Team Members</h3>
                {form.students.map((s, i) => (
                  <div key={i} className="student-entry">
                    {i > 0 && <span className="remove-student" onClick={() => removeStudent(i)}>✕</span>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Name</label>
                        <input className="form-control" placeholder="Student Name" value={s.name} onChange={e => updateStudent(i, 'name', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">USN / Roll</label>
                        <input className="form-control" placeholder="1SI21IS001" value={s.roll} onChange={e => updateStudent(i, 'roll', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addStudent}>+ Add Member</button>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setView('dashboard')}>← Dashboard</button>
                  <button className="btn btn-primary" onClick={() => { if (!form.title || !form.subject) { toast('Title & Subject required', 'error'); return; } setWizStep(1); }}>Next →</button>
                </div>
              </div>
            )}

            {/* STEP 1: Upload */}
            {wizStep === 1 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Upload Question Paper</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Upload a PDF or text file. Questions will be auto-extracted and you can edit them.</p>

                <div className="upload-zone">
                  <input type="file" accept=".pdf,.txt" onChange={handleFile} />
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                  <h3>Drop your file here</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>PDF, TXT supported &bull; Real PDF.js extraction</p>
                </div>

                {uploadedFile && (
                  <div className="file-preview">
                    <div className="file-icon">📄</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{uploadedFile.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(uploadedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <span className="badge badge-success">Ready</span>
                  </div>
                )}

                {extractedQuestions.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.25rem' }}>Extracted Questions ({extractedQuestions.length})</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Please <strong style={{color: 'var(--accent)'}}>verify and edit the full questions</strong> before continuing, as OCR may make mistakes. Remove any unwanted questions.
                    </p>
                    <div className="q-editor" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {extractedQuestions.map((q, i) => (
                        <div key={i} className="q-card" style={{ position: 'relative' }}>
                          <button 
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                            onClick={() => setExtractedQuestions(qs => qs.filter((_, idx) => idx !== i).map((item, index) => ({ ...item, num: index + 1 })))}
                            title="Remove Question"
                          >&times;</button>
                          <div className="q-num">{i + 1}</div>
                          <div className="q-text" style={{ paddingRight: '1.5rem' }}>
                            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>{q.unit}</div>
                            <textarea className="q-textarea" value={q.text}
                              onChange={e => { const u = [...extractedQuestions]; u[i].text = e.target.value; setExtractedQuestions(u); }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setWizStep(0)}>← Back</button>
                  <button className="btn btn-primary" onClick={() => { if (extractedQuestions.length === 0) { toast(uploadedFile ? 'No text extracted. If it is a scanned PDF, please upload a plain image instead for AI Vision.' : 'Upload a file first', 'error'); return; } setWizStep(2); }}>Next →</button>
                </div>
              </div>
            )}

            {/* STEP 2: Review */}
            {wizStep === 2 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Review & Confirm</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Everything correct? Press generate to start the AI engine.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div><span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TITLE</span><br /><strong>{form.title}</strong></div>
                  <div><span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SUBJECT</span><br /><strong>{form.subject}</strong></div>
                  <div><span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>DEPARTMENT</span><br /><strong>{form.dept}</strong></div>
                  <div><span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>QUESTIONS</span><br /><strong>{extractedQuestions.length} questions</strong></div>
                </div>

                <h4 style={{ marginBottom: '0.5rem' }}>Team</h4>
                {form.students.filter(s => s.name).map((s, i) => (
                  <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                    {s.name} — <span className="mono" style={{ color: 'var(--accent)' }}>{s.roll}</span>
                  </div>
                ))}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setWizStep(1)}>← Back</button>
                  <button className="btn btn-primary" onClick={() => { setWizStep(3); handleGenerate(); }} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    🚀 Start AI Generation
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Generating */}
            {wizStep === 3 && (
              <div className="loader-container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                
                <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                  
                  {/* Glowing background orb for effect */}
                  <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'var(--accent-glow)', filter: 'blur(60px)', opacity: 0.5, zIndex: 0 }} />

                  <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    {generating && <div className="spinner" style={{ width: '60px', height: '60px', borderWidth: '4px', marginBottom: '1.5rem' }} />}
                    {!generating && genProgress === 100 && <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'slideIn 0.5s ease-out' }}>🎉</div>}
                    
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: '800', background: 'linear-gradient(to right, #fff, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {generating ? 'Generating Your Report...' : 'Generation Complete!'}
                    </h2>
                    
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', textAlign: 'center' }}>
                      {generating ? 'Puter AI is crafting detailed, academically rigorous answers.' : 'Your professional academic report is fully compiled and ready.'}
                    </p>

                    {/* Developer Support Card */}
                    {generating && (
                      <div className="support-card" style={{ 
                          width: '100%', padding: '1.5rem', marginBottom: '2.5rem', borderRadius: 'var(--radius-lg)', 
                          background: 'linear-gradient(145deg, rgba(30,10,45,0.8), rgba(15,5,25,0.9))',
                          border: '1px solid rgba(236,72,153,0.3)', boxShadow: '0 10px 30px -10px rgba(236,72,153,0.2)',
                          display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.3s ease' 
                        }} 
                        onClick={() => setShowScannerModal(true)}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 10px 30px -5px rgba(236,72,153,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.3)'; e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(236,72,153,0.2)'; }}
                      >
                        <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(252,211,77,0.5))' }}>☕</div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: 'var(--gold)', marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: '700' }}>Support the Developer</h4>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>While you wait, consider buying Mohamed Fazil Pasha a coffee to keep this powerful tool alive!</p>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', padding: '0.5rem 1.25rem', background: 'rgba(236,72,153,0.1)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>View Scanner</button>
                      </div>
                    )}

                    {/* Progress Area */}
                    <div style={{ width: '100%', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {generating ? 'Progress' : 'Done'}
                        </span>
                        <span className="mono" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent)' }}>{genProgress}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="progress-fill" style={{ width: `${genProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: '100px', boxShadow: '0 0 15px var(--accent-glow)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>

                    {/* Log Terminal */}
                    <div className="log-box" style={{ 
                      width: '100%', background: '#0a0a0a', border: '1px solid #27272a', borderRadius: 'var(--radius-md)', 
                      padding: '1.25rem', height: '180px', overflowY: 'auto', textAlign: 'left', 
                      fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#a1a1aa',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                      </div>
                      {genLogs.map((log, i) => (
                        <div key={i} className={`log-line ${log.status}`} style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ opacity: 0.5 }}>[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                          <span style={{ 
                            color: log.status === 'error' ? '#ef4444' : log.status === 'done' ? '#10b981' : '#60a5fa',
                            fontWeight: log.status === 'active' ? 'bold' : 'normal'
                          }}>{log.text}</span>
                        </div>
                      ))}
                    </div>
                    
                  </div>
                </div>

                {!generating && genProgress === 100 && (
                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button className="btn btn-primary" onClick={() => setView('preview')} style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}>👀 View Generated Report (PDF)</button>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                      <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent)' }}>📄 Official SIT Front Page</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Download the editable SIT Front Page template to attach to your printed assignment.</p>
                      <a href="/SIT_Front_Page.docx" download className="btn btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>📥 Download SIT Template (DOCX)</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════
            REPORT PREVIEW (Full SIT Format)
            ══════════════════════════════════════════ */}
        {view === 'preview' && report && (
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div className="preview-topbar glass-card">
              <div className="preview-actions">
                <button className="btn btn-secondary" onClick={() => setView('dashboard')}>← Dashboard</button>
                <button className="btn btn-primary" onClick={() => handleDownload('pdf')} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>📕 Download PDF</button>
                <a href="/SIT_Front_Page_Editable.docx" download className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>📄 SIT Front Page</a>
              </div>
              <div className="preview-email-group">
                <input type="email" className="form-control" placeholder="email@uni.edu" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
                <button className="btn btn-secondary" onClick={sendEmail} disabled={emailSending}>{emailSending ? '⏳ Sending...' : '✉️ Email PDF'}</button>
              </div>
            </div>

            {/* A4 Preview */}
            <div className="report-page-container" style={{ background: '#94a3b8', padding: '2rem', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
              <div id="report-preview-content" className="a4-container">

                {/* ── CONTINUOUS DOCUMENT ── */}
                <div className="report-document">
                  
                  {/* Single HTML header for screen preview (hidden during PDF export) */}
                  <div className="report-header">
                    <span>Academic year - 2025-26</span>
                    <span>{form.subject?.split(' | Student:')[0]}</span>
                  </div>

                  <div className="report-body">
                    {report.answers.map((a, i) => {
                      const isNewUnit = i === 0 || a.unit !== report.answers[i - 1].unit;
                      return (
                        <div key={i} className={`question-block ${isNewUnit && i !== 0 ? 'new-unit-break' : ''}`}>
                          
                          {isNewUnit && (
                            <div className="chapter-header">
                              <div className="chapter-num">{(a.unit || '').toUpperCase()}</div>
                            </div>
                          )}

                          <p className="question-label">
                            <strong style={{ color: '#1F497D' }}>Q{i + 1}:</strong>{' '}
                            <span style={{ color: '#000', fontWeight: 'normal', fontStyle: 'normal', fontSize: '11pt' }}>{a.text}</span>
                          </p>

                          <div className="report-content" dangerouslySetInnerHTML={{ __html: a.answerHTML || 'Error generating answer. Please try again.' }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Single HTML footer for screen preview (hidden during PDF export) */}
                  <div className="report-footer">
                    <span>Dept of {form.dept}, {form.inst}</span>
                    <span>Page Preview</span>
                  </div>

                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════
            BATCH WIZARD
            ══════════════════════════════════════════ */}
        {view === 'batch-wizard' && (
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="stepper">
              <div className="stepper-line"><div className="stepper-progress" style={{ width: `${(batchStep / 4) * 100}%` }} /></div>
              {['Details', 'Questions', 'Class CSV', 'Review', 'Generate'].map((label, i) => (
                <div key={i} className={`step ${batchStep === i ? 'active' : ''} ${batchStep > i ? 'done' : ''}`}>
                  <div className="step-dot">{batchStep > i ? '✓' : i + 1}</div>
                  <div className="step-label">{label}</div>
                </div>
              ))}
            </div>

            {/* STEP 0: Details */}
            {batchStep === 0 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Batch Details</h2>
                <div className="form-grid">
                  <div className="form-group col-span-2">
                    <label className="form-label">Assignment Title</label>
                    <input className="form-control" placeholder="e.g. Assignment on Data Structures" value={form.title} onChange={e => updateForm('title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-control" placeholder="e.g. Biology" value={form.subject} onChange={e => updateForm('subject', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-control" value={form.course} onChange={e => updateForm('course', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={form.dept} onChange={e => updateForm('dept', e.target.value)}>
                      <option>ISE</option><option>CSE</option><option>ECE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Institution</label>
                    <input className="form-control" value={form.inst} onChange={e => updateForm('inst', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(236,72,153,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <input type="checkbox" id="includeImagesBatch" checked={includeImages} onChange={e => setIncludeImages(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                  <label htmlFor="includeImagesBatch" style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    <strong>Generate AI Diagrams & Images</strong> <span style={{ color: 'var(--text-secondary)' }}>(when explicitly asked in a question)</span>
                  </label>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setView('dashboard')}>← Dashboard</button>
                  <button className="btn btn-primary" onClick={() => { if (!form.title || !form.subject) return toast('Title & Subject required', 'error'); setBatchStep(1); }}>Next →</button>
                </div>
              </div>
            )}

            {/* STEP 1: Questions Upload */}
            {batchStep === 1 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Upload Question Paper</h2>
                <div className="upload-zone">
                  <input type="file" accept=".pdf,.txt,.png,.jpg" onChange={handleFile} />
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                  <h3>Drop Question Paper</h3>
                </div>
                {extractedQuestions.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Extracted ({extractedQuestions.length})</h4>
                    <div className="q-editor" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {extractedQuestions.map((q, i) => (
                        <div key={i} className="q-card">
                          <div className="q-num">{q.num}</div>
                          <div className="q-text">
                            <textarea className="q-textarea" value={q.text} onChange={e => { const u = [...extractedQuestions]; u[i].text = e.target.value; setExtractedQuestions(u); }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setBatchStep(0)}>← Back</button>
                  <button className="btn btn-primary" onClick={() => { if(extractedQuestions.length===0) return toast(uploadedFile ? 'No text extracted from PDF. Please upload an image instead for AI Vision.' : 'Upload file first','error'); setBatchStep(2); }}>Next →</button>
                </div>
              </div>
            )}

            {/* STEP 2: CSV Upload */}
            {batchStep === 2 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Upload Class List (CSV)</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Format: Name, USN (e.g., John Doe, 1SI21IS001)</p>
                <div className="upload-zone">
                  <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} />
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <h3>Drop CSV Here</h3>
                </div>
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setBatchStep(1)}>← Back</button>
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {batchStep === 3 && (
              <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Ready for Batch Generation</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div><span className="mono">SUBJECT</span><br /><strong>{form.subject}</strong></div>
                  <div><span className="mono">STUDENTS</span><br /><strong>{batchStudents.length} Students</strong></div>
                  <div><span className="mono">QUESTIONS</span><br /><strong>{extractedQuestions.length} Questions</strong></div>
                  <div><span className="mono">TOTAL AI CALLS</span><br /><strong>{batchStudents.length * extractedQuestions.length} API Calls</strong></div>
                </div>
                
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                  <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.9rem' }}>
                    <strong>⚠️ Important Notice:</strong> To prevent hitting AI rate limits while generating reports for multiple students, please use different Gmail logins across multiple tabs or browsers. Generating too many reports on a single account may cause the AI provider to temporarily block your requests.
                  </p>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setBatchStep(2)}>← Back</button>
                  <button className="btn btn-primary" onClick={startBatchGeneration} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>🚀 Start Batch Generation</button>
                </div>
              </div>
            )}

            {/* STEP 4: Generating */}
            {batchStep === 4 && (
              <div className="loader-container" style={{ minHeight: '60vh' }}>
                {isBatchGenerating && <div className="spinner" />}
                {!isBatchGenerating && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>}
                <h2>{isBatchGenerating ? 'Batch Generating Class Reports...' : 'Batch Generation Complete!'}</h2>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${batchProgress}%` }} /></div>
                <p className="mono">{Math.round(batchProgress)}%</p>
                <div className="log-box">
                  {batchLogs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
                </div>
                {!isBatchGenerating && batchZipBlob && (
                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                    <button className="btn btn-primary" style={{ padding: '1rem 2rem' }} onClick={() => saveAs(batchZipBlob, `${form.subject}_Class_Reports.zip`)}>
                      📥 Download ZIP ({batchStudents.length} Reports)
                    </button>

                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                      <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent)' }}>📄 Official SIT Front Page</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Download the editable SIT Front Page template to distribute or attach.</p>
                      <a href="/SIT_Front_Page.docx" download className="btn btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>📥 Download SIT Template (DOCX)</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════
            ADMIN PANEL
            ══════════════════════════════════════════ */}
        {view === 'admin' && (
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', flexDirection: 'column' }}>
            {user?.email !== 'mohamedfazilpasha156@gmail.com' ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h2>Access Denied</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Only the Global Admin can access this panel.</p>
                <button className="btn btn-secondary" onClick={() => setView('dashboard')}>Return to Dashboard</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Global Admin Panel</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>System-wide analytics and audit logs.</p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setView('dashboard')}>← Exit Admin</button>
                </div>

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                  <div className="glass-card stat-card" style={{ padding: '1.5rem', borderColor: 'var(--accent)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
                    <div className="stat-value">{stats.reports}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Total Global Reports</div>
                  </div>
                  <div className="glass-card stat-card" style={{ padding: '1.5rem', borderColor: 'var(--success)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                    <div className="stat-value">{stats.words.toLocaleString()}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Total AI Words Generated</div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>Global Audit Log (All Users)</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '1rem 0' }}>Date</th>
                          <th style={{ padding: '1rem 0' }}>Assignment</th>
                          <th style={{ padding: '1rem 0' }}>Subject</th>
                          <th style={{ padding: '1rem 0' }}>Student Name</th>
                          <th style={{ padding: '1rem 0' }}>Linked Email</th>
                          <th style={{ padding: '1rem 0' }}>Words</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedReports.map((r, i) => {
                          const parts = (r.subject || '').split(' | Student: ');
                          const cleanSubject = parts[0];
                          const studentName = parts[1] || '—';
                          
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(r.created_at).toLocaleString()}</td>
                              <td style={{ padding: '1rem 0', fontWeight: '500' }}>{r.assignment_title}</td>
                              <td style={{ padding: '1rem 0' }}>{cleanSubject}</td>
                              <td style={{ padding: '1rem 0', color: 'var(--accent)', fontWeight: 'bold' }}>{studentName}</td>
                              <td style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{r.user_id}</td>
                              <td style={{ padding: '1rem 0' }}>{r.word_count?.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ── TOASTS ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* SCANNER MODAL OVERLAY */}
      {showScannerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ padding: '3rem 2rem', maxWidth: '400px', width: '90%', textAlign: 'center', position: 'relative', border: '1px solid var(--accent)', boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)' }}>
            <button onClick={() => setShowScannerModal(false)} style={{ position: 'absolute', top: '1rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>☕ Support the Developer</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem', lineHeight: 1.5 }}>
              Developed by <strong style={{ color: 'var(--text-primary)' }}>MOHAMED FAZIL PASHA</strong>.<br/>
              If AssignAI has saved your valuable time, please consider buying me a coffee to support continuous platform improvements!
            </p>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '16px', display: 'inline-block', marginBottom: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <img src="/scanner.jpg" alt="Payment Scanner" style={{ width: '220px', height: '220px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <div style={{ display: 'none', color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 1rem' }}>Please add your QR code as public/scanner.jpg</div>
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
              For any technical support or enterprise solutions, please contact:<br/>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1.2rem', display: 'block', marginTop: '0.5rem' }}>📞 +91 7019145837</strong>
            </div>
            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--accent)', fontStyle: 'italic' }}>
              Your file is downloading securely in the background...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
