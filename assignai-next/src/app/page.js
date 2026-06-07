"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Loader2, Download, Archive, Edit3, X, Check, Search, Filter, Cpu, Database, Eye } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import LandingPage from '../components/landing/LandingPage';
import GuideBot from '../components/GuideBot';
import AuthModal from '../components/auth/AuthModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const sb = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

/* ── Puter.js loader (now using NPM package) ── */
async function loadPuter() {
  if (typeof window !== 'undefined' && window.puter) { return window.puter; }
  const puterModule = await import('@heyputer/puter.js');
  window.puter = puterModule.default || puterModule;
  return window.puter;
}

async function askAI(prompt, onChunk) {
  try {
    const res = await fetch('/api/nvidia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, stream: !!onChunk })
    });
    if (res.ok) {
      if (onChunk) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const content = json.choices?.[0]?.delta?.content || "";
                accumulatedText += content;
                onChunk(accumulatedText);
              } catch (e) {
                // Ignore incomplete JSON chunks
              }
            }
          }
        }
        return accumulatedText;
      } else {
        const data = await res.json();
        if (data.text) return data.text;
      }
    }
    console.warn('NVIDIA API failed or returned no text, falling back to Puter.js...');
  } catch (err) {
    console.error('NVIDIA fetch error:', err);
  }
  
  // Fallback to Puter.js
  const puter = await loadPuter();
  const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
  let text = '';
  if (typeof response === 'string') text = response;
  else if (Array.isArray(response?.message?.content)) text = response.message.content.map(c => c.text || '').join('\n');
  else if (typeof response?.message?.content === 'string') text = response.message.content;
  else text = response?.text || '';

  if (onChunk) {
    onChunk(text);
  }
  return text;
}

const extractImageBase64 = async (imgResult) => {
  if (!imgResult) return '';
  
  if (typeof imgResult === 'string' && imgResult.startsWith('data:')) {
    // If it's already a base64 string, let's compress it to save space
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let w = img.width || 800;
        let h = img.height || 600;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(imgResult);
      img.src = imgResult;
    });
  }

  if (imgResult instanceof HTMLImageElement) {
    return new Promise((resolve) => {
      const toBase64 = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let w = imgResult.width || imgResult.naturalWidth || 800;
          let h = imgResult.height || imgResult.naturalHeight || 600;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgResult, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
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
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('assignai_view') || 'landing';
    }
    return 'landing';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('assignai_view', view);
    }
  }, [view]);
  const [theme, setTheme] = useState('dark');
  const [toasts, setToasts] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [stats, setStats] = useState({ reports: 0, words: 0, emails: 0 });

  // Dynamic import for the 3D Transition Scene
  const TransitionScene = useMemo(() => {
    return require('next/dynamic').default(() => import('../components/landing/Scene3D'), { ssr: false });
  }, []);

  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginType, setLoginType] = useState('login'); // 'login' or 'signup'
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [streamPreview, setStreamPreview] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isSplashActive, setIsSplashActive] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const hasSeenSplash = sessionStorage.getItem('assignai_has_seen_splash');
    if (!hasSeenSplash) {
      const splashTimer = setTimeout(() => {
        setIsSplashActive(false);
        sessionStorage.setItem('assignai_has_seen_splash', 'true');
      }, 6000);
      return () => clearTimeout(splashTimer);
    } else {
      setIsSplashActive(false);
    }
  }, []);

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
    const loginTime = localStorage.getItem('assignai_user_login_time');
    
    if (savedUser && loginTime) {
      const isExpired = Date.now() - parseInt(loginTime, 10) > 60 * 60 * 1000; // 1 hour
      if (isExpired) {
        localStorage.removeItem('assignai_user');
        localStorage.removeItem('assignai_user_login_time');
        setUser(null);
        setView('auth');
        toast('Session expired. Please login again.', 'error');
      } else {
        setUser(JSON.parse(savedUser));
      }
    } else if (savedUser) {
      // Legacy user without login time
      setUser(JSON.parse(savedUser));
      localStorage.setItem('assignai_user_login_time', Date.now().toString());
    }
  }, []);

  // Periodic check for session expiration
  useEffect(() => {
    let interval;
    if (user) {
      interval = setInterval(() => {
        const loginTime = localStorage.getItem('assignai_user_login_time');
        if (loginTime) {
          const isExpired = Date.now() - parseInt(loginTime, 10) > 60 * 60 * 1000;
          if (isExpired) {
            localStorage.removeItem('assignai_user');
            localStorage.removeItem('assignai_user_login_time');
            setUser(null);
            setView('auth');
            toast('Session expired. Please login again.', 'error');
          }
        }
      }, 60000); // Check every minute
    }
    return () => clearInterval(interval);
  }, [user]);

  const requestOtp = async () => {
    if (!authEmail.includes('@')) { toast('Enter a valid email address', 'error'); return; }
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, type: loginType })
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
        body: JSON.stringify({ email: authEmail, code: authOtp, type: loginType, name: authName })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('assignai_user', JSON.stringify(data.user));
        localStorage.setItem('assignai_user_login_time', Date.now().toString());
        
        // Transition Animation
        setView('transition');
        toast('Logged in successfully!', 'success');
        setTimeout(() => setView('dashboard'), 2500);

      } else {
        toast(data.error || 'Invalid OTP', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    }
    setIsAuthenticating(false);
  };



  const signOut = () => {
    localStorage.removeItem('assignai_user');
    localStorage.removeItem('assignai_user_login_time');
    setUser(null);
    setView('landing');
    setOtpSent(false);
    setAuthEmail('');
    setAuthOtp('');
    toast('Signed out.', 'success');
  };

  /* ── FETCH REAL STATS + REPORT HISTORY ── */
  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch reports from API
    fetch(`/api/reports?email=${encodeURIComponent(user.email || user.id)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSavedReports(data);
          setStats({
            reports: data.length,
            words: data.reduce((sum, r) => sum + (r.word_count || 0), 0),
            emails: new Set(data.map(r => r.user_id)).size
          });
        }
      })
      .catch(console.error);
  }, [user, view]);

  /* ── WIZARD STATE ── */
  const [wizStep, setWizStep] = useState(0);
  const INITIAL_FORM = {
    title: '', subject: 'Biology for Engineers', course: '', dept: 'ISE',
    inst: 'Siddaganga Institute of Technology, Tumakuru',
    contentLength: 'Medium',
    customInstructions: '',
    students: [{ name: '', roll: '' }],
    headerLeft: 'Academic year - 2025-26',
    headerRight: '',
    footerLeft: '',
    footerRight: 'Page <span class="pageNumber"></span>'
  };
  const [form, setForm] = useState(INITIAL_FORM);
  const [magicTopic, setMagicTopic] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [showQNums, setShowQNums] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [docConfig, setDocConfig] = useState({
    marginTop: 35,
    marginBottom: 35,
    marginLeft: 15,
    marginRight: 15,
    fontSize: 12
  });

  // Upload UX Enhancements
  const [isDragging, setIsDragging] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualQuestions, setManualQuestions] = useState('');

  const handleMagicFill = async () => {
    if (!magicTopic.trim()) { toast('Please enter a topic first!', 'error'); return; }
    setIsMagicLoading(true);
    try {
      const prompt = `Based on the loose topic "${magicTopic}", deduce the likely academic metadata for a college report. 
Return ONLY a valid JSON object (no markdown) with these exact keys: "title", "subject", "course", "dept".
For example, for "operating systems memory paging", title might be "Memory Paging and Virtual Memory", subject: "Operating Systems", course: "OS101", dept: "CSE". Make the guesses realistic.`;
      
      const jsonText = await askAI(prompt);
      const cleanJson = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setForm(prev => ({
        ...prev,
        title: parsed.title || prev.title,
        subject: parsed.subject || prev.subject,
        course: parsed.course || prev.course,
        dept: parsed.dept || prev.dept
      }));
      toast('✨ Magic Fill Successful!', 'success');
      setMagicTopic('');
    } catch (err) {
      console.error(err);
      toast('Magic Fill failed, please try again.', 'error');
    } finally {
      setIsMagicLoading(false);
    }
  };
  const [genLogs, setGenLogs] = useState([]);
  const [report, setReport] = useState(null);

  /* ── LOCALSTORAGE AUTO-SAVE ── */
  useEffect(() => {
    const saved = localStorage.getItem('assignai-form');
    if (saved) { 
      try { 
        setForm({ ...INITIAL_FORM, ...JSON.parse(saved) }); 
      } catch {} 
    }
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
               let currentRaw = await askAI(prompt);

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
               let imgSrc = '';
               let nvidiaFallbackSvg = null;
               
               // 1. Try NVIDIA Image API (NIM SDXL) first
               try {
                 const res = await fetch('/api/nvidia/image', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ prompt: `Professional academic style diagram for a college report. Clear, technical, minimalist educational illustration. Subject: ${form.subject}. Topic: ${q.text}` })
                 });
                 if (res.ok) {
                   const data = await res.json();
                   if (data.base64) {
                     if (data.fallback) {
                       nvidiaFallbackSvg = data.base64; // Save the fallback SVG in case Puter fails
                     } else {
                       imgSrc = data.base64; // Real SDXL image
                     }
                   }
                 }
               } catch (nvidiaErr) {
                 console.warn('NVIDIA Image API failed in batch:', nvidiaErr);
               }

               // 2. Try Gemini via Puter if NVIDIA didn't yield a real image
               if (!imgSrc) {
                 try {
                   const imgResult = await puter.ai.txt2img(`Professional academic style diagram for a college report. Clear, technical, minimalist educational illustration. Subject: ${form.subject}. Topic: ${q.text}`, { model: 'google/imagen-4.0' });
                   if (imgResult) {
                     imgSrc = await extractImageBase64(imgResult);
                   }
                 } catch (puterErr) {
                   console.warn('Gemini Image generation failed in batch:', puterErr.message);
                 }
               }

               // 3. Ultimate fallback to NVIDIA SVG
               if (!imgSrc && nvidiaFallbackSvg) {
                 imgSrc = nvidiaFallbackSvg;
               }

               if (imgSrc) {
                 diagramHtml = `<div style="text-align:center;margin:1rem 0"><img src="${imgSrc}" alt="Diagram" style="max-width:400px;width:100%;border:1px solid #ccc;border-radius:4px"/><p style="font-style:italic;font-size:10pt;color:#666">Fig: Illustration for ${q.text.substring(0, 40)}</p></div>`;
               }
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
        
        if (user) {
          await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.email || user.id,
              title: form.title,
              subject: `${form.subject} | Student: ${student.name}`,
              htmlContent: '[]',
              wordCount: answers.reduce((sum, a) => sum + (a.answerHTML.split(' ').length), 0)
            })
          });
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
      const prompt = `You are an advanced NLP Document Parser. I will provide raw text extracted from a college question paper. 
Your task is to accurately extract ALL questions.
CRITICAL RULES:
1. Extract EVERY single question. Do not limit the count.
2. IGNORE headers, footers, college names, university names, course codes, maximum marks, duration, and instructions.
3. JOIN multi-line questions. If a single question spans multiple lines in the raw text, merge it into a single continuous string. DO NOT split one question into multiple items.
4. Fix grammar and OCR typos in the questions.
Return ONLY a valid JSON array of objects. Do not wrap it in markdown. Do not add any text before or after.
Format: [{"unit": "Unit Name", "num": 1, "text": "Question text..."}]

Raw Text:
${rawText.substring(0, 8000)}`;

      let jsonText = await askAI(prompt);
      
      jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(jsonText);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        setExtractedQuestions(parsed.map(q => ({ ...q, included: true })));
        toast(`✨ AI perfectly extracted ${parsed.length} questions!`, 'success');
        return true;
      }
    } catch (err) {
      console.warn('AI parse error:', err?.message || JSON.stringify(err));
      toast('AI Parsing failed, falling back to simple extraction.', 'error');
    }
    return false;
  };

  /* ── FILE UPLOAD (Real PDF.js & Tesseract OCR & AI Parsing) ── */
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setIsExtracting(true);
    setExtractStatus('Reading file structure...');

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          if (!window.pdfjsLib) {
            setExtractStatus('Loading PDF Engine...');
            toast('Loading PDF Engine...', 'info');
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.min.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
            window.pdfjsLib = pdfjsLib;
          }
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ev.target.result) }).promise;
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
            setExtractStatus('Running AI Vision OCR on scanned PDF...');
            toast('Running AI Vision OCR on scanned PDF...', 'info');
            if (!window.Tesseract) {
              window.Tesseract = await import('tesseract.js');
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
          setExtractStatus('Parsing questions with AI...');
          const success = await parseQuestionsWithAI(rawText);
          if (!success) {
             // Fallback
             const lines = rawText.split('\n').filter(l => l.trim().length > 15);
             setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim(), included: true })));
             toast(`Extracted ${lines.length} questions using fallback.`, 'success');
          }

        } catch (err) { toast('PDF parse failed: ' + err.message, 'error'); }
        finally { setIsExtracting(false); }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      setExtractStatus('Running AI Vision OCR on image...');
      toast('Running AI Vision OCR on image...', 'info');
      try {
        if (!window.Tesseract) {
          window.Tesseract = await import('tesseract.js');
        }
        const result = await window.Tesseract.recognize(file, 'eng');
        const success = await parseQuestionsWithAI(result.data.text);
        if (!success) {
           const lines = result.data.text.split('\n').filter(l => l.trim().length > 10);
           setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim(), included: true })));
           toast(`Extracted ${lines.length} questions from image fallback.`, 'success');
        }
      } catch (e) {
        toast('Failed to read text from image.', 'error');
      } finally { setIsExtracting(false); }
    } else {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setExtractStatus('Parsing questions with AI...');
        const success = await parseQuestionsWithAI(ev.target.result);
        if (!success) {
          const lines = ev.target.result.split('\n').filter(l => l.trim().length > 5);
          setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim(), included: true })));
          toast(`Loaded ${lines.length} questions using fallback.`, 'success');
        }
        setIsExtracting(false);
      };
      reader.readAsText(file);
    }
  };

  /* ── GENERATE (Real Puter AI + Wikipedia + Diagrams) ── */
  const handleGenerate = async () => {
    if (extractedQuestions.length === 0) { toast('No questions!', 'error'); return; }
    setGenerating(true); setGenProgress(0);
    setGenLogs([{ text: '🔄 Initializing AssignAI Neural Engine...', status: 'active' }]);

    try {
      // 1. Load Fallbacks (Puter)
      const puter = await loadPuter();
      setGenLogs(l => [{ text: '✅ AssignAI Neural Engine loaded', status: 'done' }, ...l.slice(1)]);

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
      const questionsToGenerate = extractedQuestions.filter(q => q.included !== false);
      const total = questionsToGenerate.length;
      
      if (total === 0) { toast('No questions selected!', 'error'); setGenerating(false); return; }

      for (let i = 0; i < total; i++) {
        const q = questionsToGenerate[i];
        const seqNum = i + 1; // Always sequential: 1, 2, 3...
        setGenLogs(l => [...l, { text: `✨ Q${seqNum}: ${q.text.substring(0, 60)}...`, status: 'active' }]);

        const needsDiagram = includeImages && /diagram|architecture|flowchart|block\s*diagram|structure|draw|image|illustrate|sketch|figure|picture|table/i.test(q.text);
        
        // Content Length Logic
        let minWords = 450;
        let lengthRule = "Be EXTREMELY comprehensive and highly detailed.";
        if (form.contentLength === 'Short') {
           minWords = 150;
           lengthRule = "Be concise and brief. Get straight to the point without excessive filler.";
        } else if (form.contentLength === 'Medium') {
           minWords = 300;
           lengthRule = "Write a well-balanced, standard length academic answer.";
        }
        
        // If generating massive batches, throttle the maximum size to prevent rate limits
        if (total > 20 && minWords > 250) minWords = 250; 
        
        const seed = `${Date.now()}-${user?.email}-${Math.random().toString(36).slice(2)}`;
        // --- PASS 1: Content Agent (Researcher) ---
        const contentPrompt = `You are a strict Academic Report Writer generating a professional answer for a university assignment on "${form.subject}".
Variation seed: ${seed}
Question: ${q.text}
Factual context: ${context || 'Use your knowledge.'}

${form.customInstructions ? `USER SPECIFIC MAGIC INSTRUCTIONS (CRITICAL PRIORITY):\n${form.customInstructions}\n` : ''}
CRITICAL STRUCTURE RULES:
You MUST structure your answer with these exact sections (use Markdown ## headings):
1. Introduction
2. Main Explanation
3. Key Points (use bullet points)
4. Applications
5. Example
6. Conclusion

PARAGRAPH RULES:
- Maximum paragraph length: 100-150 words. Split large content into multiple paragraphs.
===============
IMPORTANT TERMS
===============
Important scientific or technical terms should be: Bold

Write a comprehensive, professional academic answer (target ~${minWords} words). Focus PURELY on facts, logic, and depth.
${lengthRule}
DO NOT use HTML tags. Use basic markdown only (headers, lists, bold).
CRITICAL: DO NOT generate any image placeholders, markdown images (![alt](url)), or HTML <img> tags. You do not have access to image URLs and it will result in broken icons in the final PDF.`;

        let answerText = '';
        let attempts = 0;
        let success = false;

        // Dual-Pass Retry loop
        while (attempts < 3 && !success) {
          try {
            setGenLogs(l => { const c = [...l]; const idx = c.findLastIndex(x => x.text.startsWith(`✨ Q${seqNum}`)); if (idx >= 0) c[idx] = { text: `✨ Q${seqNum}: Pass 1 (Researching)...`, status: 'active' }; return c; });
            
            // Pass 1 Call
            setStreamPreview('');
            let rawMarkdown = await askAI(contentPrompt, (txt) => {
              const wordCount = txt.split(/\s+/).filter(Boolean).length;
              setStreamPreview(`${txt}\n\n📊 Words: ${wordCount}`);
            });

            if (rawMarkdown.length < 50) throw new Error("Pass 1: Content too short");

            // --- PASS 2: Formatter Agent (Typesetter) ---
            setGenLogs(l => { const c = [...l]; const idx = c.findLastIndex(x => x.text.startsWith(`✨ Q${seqNum}`)); if (idx >= 0) c[idx] = { text: `✨ Q${seqNum}: Pass 2 (Typesetting)...`, status: 'active' }; return c; });
            
            const formatPrompt = `You are a strict Document Typesetter formatting an academic PDF report. I will provide raw markdown text. You must convert it into perfectly structured, professional Academic HTML.

CRITICAL RULES:
1. ONLY output raw HTML. No \`\`\`html markdown blocks.
2. Convert all markdown sections (Introduction, Main Explanation, etc) into <h4 class="avoid-break"> tags.
3. Convert text into <p> tags. Wrap lists in <ul> or <ol> with <li>.
4. ALL TEXT MUST BE BLACK. Do NOT use colored backgrounds, colored borders, or colored text. Use <strong> for emphasis instead of colors.
5. REMOVE and IGNORE any markdown images or HTML <img> tags from the raw text. Do not render broken images.
6. SCRUB THE TEXT: If the raw text contains "Academic year", "Biology for Engineers", "UNIT", "Page Preview", "Dept of", or any other UI/Header/Footer artifacts, you MUST DELETE THEM completely.
7. Ensure properly closed HTML tags.
8. If you must generate a sketch, diagram, or table, keep it extremely COMPACT and professional. Do NOT generate massive, full-page ASCII art or oversized HTML structures.

Raw Text:
${rawMarkdown}`;

            setStreamPreview('');
            let currentText = await askAI(formatPrompt, (txt) => {
              const wordCount = txt.split(/\s+/).filter(Boolean).length;
              setStreamPreview(`${txt}\n\n📊 Words: ${wordCount} (Formatting...)`);
            });

            currentText = String(currentText).replace(/```html/gi, '').replace(/```/g, '').trim();
            setStreamPreview('');
            
            if (currentText.length > 50) {
              const isNewUnit = i === 0 || q.unit !== questionsToGenerate[i - 1].unit;
              const unitHeading = (showUnits && isNewUnit && q.unit) ? `<h1 class="unit-heading avoid-break" style="text-align:center; font-size: 20pt; margin-top: 30pt; margin-bottom: 15pt; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5pt;">${q.unit}</h1>\n` : '';
              const qPrefix = showQNums ? (q.num ? `Q${q.num}. ` : `Q${seqNum}. `) : '';
              answerText = unitHeading + `<h2 class="q-heading avoid-break">${qPrefix}${q.text}</h2>\n` + currentText;
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
             let imgSrc = '';
             let nvidiaFallbackSvg = null;

             // 1. Try NVIDIA Image API (NIM SDXL) first
             try {
                const prompt = `Professional academic style diagram for a college report. Clear, technical, minimalist educational illustration. Subject: ${form.subject}. Topic: ${q.text}`;
                const res = await fetch('/api/nvidia/image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt })
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.base64) {
                    if (data.fallback) {
                      nvidiaFallbackSvg = data.base64; // Save the fallback SVG in case Puter fails
                    } else {
                      imgSrc = data.base64; // Real SDXL image
                    }
                  }
                }
             } catch (nvidiaErr) {
                console.warn('NVIDIA Image API failed:', nvidiaErr);
             }

             // 2. Try Gemini via Puter if NVIDIA didn't yield a real image
             if (!imgSrc) {
                try {
                  const imgResult = await puter.ai.txt2img(`Professional academic style diagram for a college report. Subject: ${form.subject}. Topic: ${q.text}`, { model: 'google/imagen-4.0' });
                  const puterUrl = typeof imgResult === 'string' ? imgResult : (imgResult?.url || '');
                  
                  // Convert puter url to base64 if possible
                  if (puterUrl) {
                    try {
                      const res = await fetch(puterUrl);
                      const blob = await res.blob();
                      imgSrc = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                      });
                    } catch(err) {
                      imgSrc = puterUrl; // Fallback to raw URL
                    }
                  }
                } catch(puterErr) {
                  console.warn("Puter Gemini Image failed, falling back to NVIDIA SVG:", puterErr.message);
                }
             }

             // 3. Ultimate fallback to NVIDIA SVG
             if (!imgSrc && nvidiaFallbackSvg) {
                imgSrc = nvidiaFallbackSvg;
             }

             if (!imgSrc) throw new Error('All image generation methods failed');

             if (imgSrc) {
               diagramHtml = `<div style="text-align:center;margin:1rem 0"><img src="${imgSrc}" alt="Diagram" style="max-width:400px;width:100%;border:1px solid #ccc;border-radius:4px"/><p style="font-style:italic;font-size:10pt;color:#666">Fig: Illustration for ${q.text.substring(0, 40)}</p></div>`;
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
        const userId = user?.id || null;

        // Save using API endpoint
        if (userId) {
          const apiRes = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              title: form.title,
              subject: finalSubject,
              htmlContent: JSON.stringify(answers),
              wordCount: wordCount
            })
          });
          if (!apiRes.ok) {
            const errData = await apiRes.json();
            throw new Error(errData.error || 'Failed to save to cloud database');
          }
        } else {
          console.warn("Skipping DB save: User not authenticated or missing UUID.");
        }

        setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: '💾 Report archived!', status: 'done' }; return c; });
      } catch(e) { 
        console.error("DB save error: ", JSON.stringify(e, null, 2) || e.message || e);
        setGenLogs(l => { const c = [...l]; c[c.length - 1] = { text: '⚠️ DB save skipped (RLS/Size Limit)', status: 'error' }; return c; }); 
      }

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
    if (!returnBlob) toast('Generating PDF...', 'info');
    try {
      const el = document.getElementById('report-preview-content');
      
      // Clone element and strip the screen-only preview header and footer
      const clone = el.cloneNode(true);
      const screenHeader = clone.querySelector('.report-header');
      if (screenHeader) screenHeader.remove();
      const screenFooter = clone.querySelector('.report-footer');
      if (screenFooter) screenFooter.remove();
      
      const payload = {
        htmlContent: clone.outerHTML,
        subject: form.subject,
        dept: form.dept,
        inst: form.inst,
        headerLeft: form.headerLeft,
        headerRight: form.headerRight,
        footerLeft: form.footerLeft,
        footerRight: form.footerRight,
        docConfig: docConfig
      };
      
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('PDF Generation failed on server');
      const blob = await res.blob();
      
      if (returnBlob) {
        pdfBlobRef.current = blob;
        return blob;
      } else {
        saveAs(blob, `Report_${(form.subject || 'Assignment').replace(/\s+/g, '_')}.pdf`);
        toast('PDF downloaded!', 'success');
      }
    } catch (e) {
      console.error(e);
      toast('PDF generation failed: ' + e.message, 'error');
      if (returnBlob) throw e;
    } finally {
      const el = document.getElementById('report-preview-content');
      if (el) el.classList.remove('pdf-export-mode');
      if (!returnBlob) setShowScannerModal(false);
    }
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
    finally { setShowScannerModal(false); }
  };

  const handleDownload = (type) => {
    setShowScannerModal(true);
    if (type === 'pdf') exportPdf(false);
    if (type === 'docx') exportDocx();
  };

  /* ── EXPORT: EMAIL (sends HTML to backend to generate PDF internally) ── */
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const sendEmail = async () => {
    if (!emailTo) { toast('Enter an email', 'error'); return; }
    setEmailSending(true);
    toast('Generating PDF for email attachment...', 'info');
    try {
      const el = document.getElementById('report-preview-content');
      if (!el) throw new Error("Report content not found");
      
      const clone = el.cloneNode(true);
      const screenHeader = clone.querySelector('.report-header');
      if (screenHeader) screenHeader.remove();
      const screenFooter = clone.querySelector('.report-footer');
      if (screenFooter) screenFooter.remove();

      const payload = { 
        to: emailTo, 
        subject: `Assignment Report: ${form.subject}`, 
        text: `Your AI-generated report for "${form.title}" is attached.`, 
        htmlContent: clone.outerHTML, 
        filename: `Report_${(form.subject || 'Assignment').replace(/\s+/g, '_')}.pdf`,
        dept: form.dept,
        inst: form.inst,
        reportSubject: form.subject
      };

      const res = await fetch('/api/email', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Attempt to parse JSON gracefully to avoid "Request Entity Too Large" crash
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("Server returned an invalid response (Payload likely too large)");
      }
      
      if (data.error) throw new Error(data.error);
      toast('Email sent with PDF attachment!', 'success');
      setShowScannerModal(false);
    } catch (e) {
      console.error(e);
      toast('Email failed: ' + e.message, 'error');
    } finally {
      setEmailSending(false);
    }
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
    
    // Scanner Modal Listener
    const handleScanner = () => setShowScannerModal(true);
    window.addEventListener('showScannerModal', handleScanner);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('showScannerModal', handleScanner);
    };
  }, [view, wizStep]);

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  if (!isMounted) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#030106' }}></div>;
  }

  return (
    <>

      {/* ══════════════════════════════════════════
          INITIAL LOAD SPLASH SCREEN (6 Seconds)
          ══════════════════════════════════════════ */}
      <AnimatePresence>
        {isSplashActive && (
          <motion.div key="intro-splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(20px)', transition: { duration: 1.5, ease: "easeInOut" } }} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#030106', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TransitionScene />
            <div style={{ position: 'absolute', zIndex: 10, pointerEvents: 'none' }}>
              <motion.h2 
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1, 0.98] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontFamily: 'var(--font-mono)', color: '#fbcfe8', letterSpacing: '4px', textTransform: 'uppercase', fontSize: 'clamp(1rem, 4vw, 1.5rem)', textShadow: '0 0 20px rgba(236,72,153,0.8)', textAlign: 'center' }}
              >
                Initializing Workspace...
              </motion.h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    <AnimatePresence mode="wait">
      {view === 'landing' ? (
        <motion.div key="landing-view" initial={{ opacity: 0, filter: 'blur(20px)', scale: 1.05 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }} exit={{ opacity: 0, filter: 'blur(20px)', scale: 0.95 }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} style={{ position: 'absolute', width: '100%', left: 0, top: 0, zIndex: 100, backgroundColor: '#030106', minHeight: '100vh' }}>
          <LandingPage onStart={() => user ? setView('dashboard') : setView('auth')} isLoggedIn={!!user} />
        </motion.div>
      ) : (
        <motion.div key="app-view" initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="brand" onClick={() => user ? setView('dashboard') : setView('landing')} style={{ cursor: 'pointer' }}>
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
            AUTH PAGE (MAX GLASSMORPHISM)
            ══════════════════════════════════════════ */}
        {view === 'auth' && (
          <AuthModal 
            loginType={loginType}
            setLoginType={setLoginType}
            authName={authName}
            setAuthName={setAuthName}
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authOtp={authOtp}
            setAuthOtp={setAuthOtp}
            isAuthenticating={isAuthenticating}
            requestOtp={requestOtp}
            verifyOtp={verifyOtp}
            otpSent={otpSent}
            setOtpSent={setOtpSent}
          />
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
                { icon: '⚡', label: 'AI Engine', value: 'Neural Core', color: 'var(--warning)' },
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
                <h4 style={{ marginBottom: '0.5rem' }}>Question Paper Solve Report</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Upload a question PDF and generate a full report via AI extraction.</p>
              </div>
              {user?.email === 'mohamedfazilpasha156@gmail.com' && (
                <>
                  <div className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={startBatchWizard}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📦</div>
                    <h4 style={{ marginBottom: '0.5rem' }}>Batch Generate</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Upload CSV of students for bulk unique reports.</p>
                  </div>
                  <a href="/admin" className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
                    <h4 style={{ marginBottom: '0.5rem' }}>Admin Panel</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Analytics, audit logs, and user management.</p>
                  </a>
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

                {/* Magic Auto-Fill Section */}
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, rgba(236,72,153,0.1), rgba(168,85,247,0.05))', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(236,72,153,0.3)', boxShadow: '0 0 20px rgba(236,72,153,0.1)' }}>
                  <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>✨ Magic Auto-Fill</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Enter a loose topic or assignment brief. AI will guess the Title, Subject, Course Code, and Dept.</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                      className="form-control" 
                      style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} 
                      placeholder="e.g. Write a report on operating systems memory paging..." 
                      value={magicTopic} 
                      onChange={e => setMagicTopic(e.target.value)} 
                      disabled={isMagicLoading}
                    />
                    <button 
                      className="btn btn-primary" 
                      onClick={handleMagicFill} 
                      disabled={isMagicLoading || !magicTopic.trim()}
                      style={{ background: 'linear-gradient(90deg, #ec4899, #a855f7)', border: 'none', minWidth: '120px' }}
                    >
                      {isMagicLoading ? 'Thinking...' : 'Magic Fill'}
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group col-span-2">
                    <label className="form-label">Assignment Title</label>
                    <input className="form-control" placeholder="e.g. Assignment on Data Structures" value={form.title} onChange={e => updateForm('title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input className="form-control" placeholder="e.g. Biology" value={form.subject || ''} onChange={e => updateForm('subject', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-control" placeholder="e.g. 21CS33" value={form.course || ''} onChange={e => updateForm('course', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={form.dept || ''} onChange={e => updateForm('dept', e.target.value)}>
                      <option>ISE</option><option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option><option>EEE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Institution</label>
                    <input className="form-control" value={form.inst || ''} onChange={e => updateForm('inst', e.target.value)} />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Content Detail Level</label>
                    <select className="form-control" value={form.contentLength || ''} onChange={e => updateForm('contentLength', e.target.value)}>
                      <option value="Detailed">Detailed (Max Length)</option>
                      <option value="Medium">Medium (Balanced)</option>
                      <option value="Short">Short (Concise)</option>
                    </select>
                  </div>
                  
                  {/* Custom AI Instructions */}
                  <div className="form-group col-span-2" style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🧠</span> Custom AI Instructions <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal', textTransform: 'none' }}>(Optional betterment rules)</span>
                    </label>
                    <textarea 
                      className="form-control" 
                      style={{ minHeight: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'vertical' }}
                      placeholder="e.g. Write in a formal Harvard academic style. Focus on 2024 real-world examples. Keep the language extremely simple." 
                      value={form.customInstructions || ''} 
                      onChange={e => updateForm('customInstructions', e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(236,72,153,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(236,72,153,0.2)' }}>
                  <input type="checkbox" id="includeImages" checked={includeImages} onChange={e => setIncludeImages(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                  <label htmlFor="includeImages" style={{ cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    <strong>Generate AI Diagrams & Images</strong> <span style={{ color: 'var(--text-secondary)' }}>(when explicitly asked in a question)</span>
                  </label>
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>PDF Formatting Options (Optional)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Header Left</label>
                    <input className="form-control" placeholder="e.g. Academic year - 2025-26" value={form.headerLeft || ''} onChange={e => updateForm('headerLeft', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Header Right</label>
                    <input className="form-control" placeholder="Defaults to Subject" value={form.headerRight || ''} onChange={e => updateForm('headerRight', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Footer Left</label>
                    <input className="form-control" placeholder="Defaults to Dept & Inst" value={form.footerLeft || ''} onChange={e => updateForm('footerLeft', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Footer Right</label>
                    <input className="form-control" placeholder='e.g. Page <span class="pageNumber"></span>' value={form.footerRight || ''} onChange={e => updateForm('footerRight', e.target.value)} />
                  </div>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setManualMode(!manualMode)}>
                    {manualMode ? '📁 Switch to File Upload' : '✍️ Type Questions Manually'}
                  </button>
                </div>

                {manualMode ? (
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Manual Entry</h3>
                    <textarea 
                      className="form-control" 
                      style={{ width: '100%', minHeight: '200px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                      placeholder="Paste your questions here... (one per line)&#10;1. Explain operating systems.&#10;2. What is virtual memory? [5 marks]"
                      value={manualQuestions}
                      onChange={e => setManualQuestions(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary" 
                      style={{ marginTop: '1rem', width: '100%' }}
                      onClick={async () => {
                        if (!manualQuestions.trim()) { toast('Please enter some questions', 'error'); return; }
                        setIsExtracting(true);
                        setExtractStatus('Parsing manual questions...');
                        const success = await parseQuestionsWithAI(manualQuestions);
                        if (!success) {
                          const lines = manualQuestions.split('\n').filter(l => l.trim().length > 5);
                          setExtractedQuestions(lines.map((l, i) => ({ unit: 'Unit 1', num: i + 1, text: l.trim(), included: true })));
                          toast(`Loaded ${lines.length} questions manually.`, 'success');
                        }
                        setIsExtracting(false);
                        setManualMode(false);
                      }}
                    >
                      Process Questions
                    </button>
                  </div>
                ) : isExtracting ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--accent)', marginBottom: '2rem' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(236,72,153,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Processing Document</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>{extractStatus}</p>
                  </div>
                ) : (
                  <div 
                    className="upload-zone" 
                    style={{ 
                      position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease',
                      border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border)',
                      background: isDragging ? 'rgba(236,72,153,0.05)' : 'rgba(0,0,0,0.2)',
                      boxShadow: isDragging ? '0 0 30px rgba(236,72,153,0.2)' : 'none'
                    }}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile({ target: { files: e.dataTransfer.files } }); }}
                  >
                    <input type="file" accept=".pdf,.txt,image/*" onChange={handleFile} capture="environment" />
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', filter: isDragging ? 'drop-shadow(0 0 10px rgba(236,72,153,0.8))' : 'none' }}>📂</div>
                    <h3 style={{ color: isDragging ? 'var(--accent)' : 'inherit' }}>Drop your file here</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>PDF, TXT, or Image (Camera supported) &bull; Real PDF.js extraction</p>
                  </div>
                )}

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ marginBottom: '0.25rem' }}>Extracted Questions ({extractedQuestions.length})</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Please <strong style={{color: 'var(--accent)'}}>verify and edit</strong> before continuing.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showUnits} onChange={e => setShowUnits(e.target.checked)} /> Show Units
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showQNums} onChange={e => setShowQNums(e.target.checked)} /> Show Q-Numbers
                        </label>
                      </div>
                    </div>
                    <div className="q-editor" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {extractedQuestions.map((q, i) => (
                        <div key={i} className="q-card" style={{ position: 'relative' }}>
                          <button 
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                            onClick={() => setExtractedQuestions(qs => qs.filter((_, idx) => idx !== i).map((item, index) => ({ ...item, num: index + 1 })))}
                            title="Remove Question"
                          >&times;</button>
                          {showQNums && (
                            <div className="q-num" style={{ padding: 0, overflow: 'hidden' }}>
                              <input 
                                type="text" 
                                value={q.num || ''} 
                                onChange={e => { const u = [...extractedQuestions]; u[i].num = e.target.value; setExtractedQuestions(u); }}
                                style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }} 
                              />
                            </div>
                          )}
                          <div className="q-text" style={{ paddingRight: '1.5rem' }}>
                            {showUnits && (
                              <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                                 <input 
                                   type="text" 
                                   value={q.unit || ''} 
                                   placeholder="No Unit"
                                   onChange={e => { const u = [...extractedQuestions]; u[i].unit = e.target.value; setExtractedQuestions(u); }}
                                   style={{ background: 'transparent', border: 'none', color: 'var(--accent)', padding: 0, width: '100%', outline: 'none' }} 
                                 />
                              </div>
                            )}
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
                  <div>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ESTIMATED TIME</span><br />
                    <strong>~{Math.ceil(extractedQuestions.filter(q => q.included !== false).length * 0.5)} min</strong>
                  </div>
                  <div>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SELECTED QUESTIONS</span><br />
                    <strong>{extractedQuestions.filter(q => q.included !== false).length} / {extractedQuestions.length}</strong>
                  </div>
                </div>

                <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Select Questions to Generate</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '2rem', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {extractedQuestions.map((q, i) => (
                    <div key={i} style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', 
                      background: q.included !== false ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)', 
                      borderRadius: '8px',
                      opacity: q.included !== false ? 1 : 0.5,
                      border: q.included !== false ? '1px solid rgba(236,72,153,0.3)' : '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={q.included !== false}
                        onChange={e => {
                          const u = [...extractedQuestions];
                          u[i].included = e.target.checked;
                          setExtractedQuestions(u);
                        }}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', marginRight: '0.5rem' }}>Q{q.num}.</span>
                        {q.text}
                      </div>
                    </div>
                  ))}
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
                
                <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden', background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', backdropFilter: 'blur(20px)' }}>
                  
                  {/* Subtle white glow for effect */}
                  <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: '#ffffff', filter: 'blur(80px)', opacity: 0.1, zIndex: 0 }} />

                  <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    {generating && (
                      <div className="loader-hologram">
                        <div className="loader-ring loader-ring-outer"></div>
                        <div className="loader-ring loader-ring-inner"></div>
                        <div className="loader-core"></div>
                      </div>
                    )}
                    {!generating && genProgress === 100 && <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'slideIn 0.5s ease-out' }}>✔</div>}
                    
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                      {generating ? 'Compiling Report' : 'Compilation Complete'}
                    </h2>
                    
                    <p style={{ color: '#888', marginBottom: '2.5rem', fontSize: '1rem', textAlign: 'center' }}>
                      {generating ? 'The engine is synthesizing and formatting your academic document.' : 'Your professional academic report is fully compiled and ready.'}
                    </p>

                    {/* Developer Support Card */}
                    {generating && (
                      <div style={{ 
                          width: '100%', padding: '1.5rem', marginBottom: '2.5rem', borderRadius: '16px', 
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.3s ease' 
                        }} 
                        onClick={() => setShowScannerModal(true)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      >
                        <div style={{ fontSize: '2.5rem' }}>☕</div>
                        <div style={{ flex: '1 1 200px' }}>
                          <h4 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: '700', letterSpacing: '-0.01em' }}>Support the Developer</h4>
                          <p style={{ fontSize: '0.9rem', color: '#888', lineHeight: 1.4 }}>While you wait, consider buying Mohamed Fazil Pasha a coffee to keep this powerful tool alive!</p>
                        </div>
                        <button style={{ padding: '0.6rem 1.2rem', borderRadius: '100px', background: '#fff', color: '#000', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0 }}>View Scanner</button>
                      </div>
                    )}

                    {/* Progress Area */}
                    <div style={{ width: '100%', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>
                          {generating ? 'Processing' : 'Done'}
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>{genProgress}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ width: `${genProgress}%`, height: '100%', background: '#fff', borderRadius: '100px', boxShadow: '0 0 10px rgba(255,255,255,0.5)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>

                    {/* Log Terminal */}
                    <div className="cyber-console" style={{ 
                      width: '100%', height: '220px', overflowY: 'auto', textAlign: 'left', 
                      fontFamily: 'monospace', fontSize: '0.85rem', color: '#888', padding: '1.25rem'
                    }}>
                      <div className="cyber-scanline"></div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                      </div>
                      <div style={{ position: 'relative', zIndex: 10 }}>
                        {genLogs.map((log, i) => (
                          <div key={i} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.4 }}>
                            <span style={{ opacity: 0.3 }}>[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                            <span style={{ 
                              color: log.status === 'error' ? '#ef4444' : log.status === 'done' ? '#10b981' : '#888',
                              fontWeight: log.status === 'active' ? 'bold' : 'normal',
                              textShadow: log.status === 'active' ? '0 0 8px rgba(255,255,255,0.3)' : 'none'
                            }}>{log.text}</span>
                          </div>
                        ))}
                        {streamPreview && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(236,72,153,0.3)' }}>
                            <span style={{ fontWeight: 'bold', color: '#ec4899', fontSize: '0.75rem', letterSpacing: '1px', display: 'block', marginBottom: '0.5rem', textShadow: '0 0 10px rgba(236,72,153,0.6)' }}>⚡ LIVE AI STREAM:</span>
                            <div style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#00ffff', textShadow: '0 0 5px rgba(0,255,255,0.4)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                              {streamPreview}
                            </div>
                          </div>
                        )}
                      </div>
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
          <motion.div className="page active" key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }} style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '2rem', boxSizing: 'border-box' }}>
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
            <div className="report-page-container" style={{ background: '#94a3b8', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
              <div style={{ display: 'flex', minWidth: '100%', width: 'max-content', justifyContent: 'center', padding: '2rem' }}>
                <div id="report-preview-content" className="a4-container" style={{ margin: 0 }}>

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
                          
                          {/* Unit and Question Label removed to rely entirely on AI formatted answer HTML */}

                          <div className="report-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.answerHTML || 'Error generating answer. Please try again.') }} />
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


        </AnimatePresence>
      </div>
      </motion.div>
      )}
    </AnimatePresence>

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
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, backdropFilter: 'blur(5px)' }}>
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
    
    {isMounted && !!user && (
      <GuideBot 
        onNavigate={(v) => setView(v)} 
        onScanner={() => setShowScannerModal(true)} 
      />
    )}
    </>
  );
}
