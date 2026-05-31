// =========================================
// AssignAI - Premium Logic
// =========================================

// Config
const SUPABASE_URL = 'https://rstgmaihjuyeazeishum.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdGdtYWloanV5ZWF6ZWlzaHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjA4MTYsImV4cCI6MjA5MDE5NjgxNn0.KhngFM7Q4N6UWmqudTFoPtktxLHPaPSuDNIhNKCnRgM';

let sb;
let currentUser = null;
let currentQuestions = [];
let currentReportHTML = '';
let currentReportData = {};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Setup date to today
    document.getElementById('f-date').valueAsDate = new Date();
    
    // Add first student by default
    addStudentField();

    try {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        checkSession();
    } catch(e) {
        console.warn("Supabase not loaded, running in guest mode.");
    }
    
    // Setup Drag and Drop
    setupDragDrop();
    
    // Setup Auto-save
    setupAutoSave();
});

// --- Theme Management ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('assignai-theme', next);
}

const savedTheme = localStorage.getItem('assignai-theme');
if (savedTheme) { document.documentElement.setAttribute('data-theme', savedTheme); }

// --- UI / Navigation ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if(pageId !== 'page-auth') {
        document.getElementById('app-topbar').style.display = 'flex';
    } else {
        document.getElementById('app-topbar').style.display = 'none';
    }
}

function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
}

function goToStep(step) {
    [1,2,3,4].forEach(i => {
        document.getElementById(`wizard-step-${i}`).style.display = (i === step) ? 'block' : 'none';
        const indicator = document.getElementById(`step-indicator-${i}`);
        indicator.classList.remove('active', 'done');
        if (i < step) indicator.classList.add('done');
        if (i === step) indicator.classList.add('active');
    });
    
    const progress = ((step - 1) / 3) * 100;
    document.getElementById('wizard-progress').style.width = `${progress}%`;
}

function startNewReport() {
    currentQuestions = [];
    document.getElementById('manual-questions').value = '';
    document.getElementById('file-upload').value = '';
    goToStep(1);
    showPage('page-wizard');
}

// --- Authentication ---
async function checkSession() {
    if(!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        currentUser = session.user;
        showPage('page-dashboard');
        loadDashboardReports();
    } else {
        showPage('page-auth');
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if(!email || !password) return showToast("Email and password required", "error");
    
    if(!sb) return loginAsGuest();
    
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        // Try sign up if sign in fails (simplified flow for demo)
        const { data: signUpData, error: signUpError } = await sb.auth.signUp({ email, password });
        if(signUpError) {
            showToast(signUpError.message, "error");
        } else {
            showToast("Account created successfully!", "success");
            currentUser = signUpData.user;
            showPage('page-dashboard');
            loadDashboardReports();
        }
    } else {
        currentUser = data.user;
        showPage('page-dashboard');
        loadDashboardReports();
    }
}

function loginAsGuest() {
    currentUser = { id: 'guest', email: 'guest@demo.app' };
    showPage('page-dashboard');
    showToast("Logged in as Guest");
}

async function logout() {
    if(sb && currentUser?.id !== 'guest') await sb.auth.signOut();
    currentUser = null;
    showPage('page-auth');
}

// --- Upload & Extraction ---
function setupDragDrop() {
    const dz = document.getElementById('dropzone');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
}

function handleFileUpload(e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
}

async function handleFile(file) {
    showToast("Reading file...", "info");
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const content = e.target.result;
        try {
            // Puter AI extraction
            const prompt = `You are an academic question extractor. Extract ALL assignment questions from the text below. Return ONLY a JSON array of objects with "num" and "text" properties. No other text.\n\nText: ${content.substring(0, 8000)}`;
            const res = await puter.ai.chat(prompt);
            const resText = typeof res === 'string' ? res : res.message?.content;
            
            // Clean markdown blocks
            const jsonStr = resText.replace(/```json/g, '').replace(/```/g, '').trim();
            const qs = JSON.parse(jsonStr);
            
            if(!Array.isArray(qs) || qs.length === 0) throw new Error("No questions found");
            
            currentQuestions = qs;
            renderQuestionEditor();
            goToStep(2);
            showToast(`Extracted ${qs.length} questions`, "success");
        } catch(err) {
            console.error(err);
            showToast("Failed to parse file. Please use manual input.", "error");
            document.getElementById('manual-questions').value = content;
        }
    };
    
    if (file.name.endsWith('.txt')) {
        reader.readAsText(file);
    } else {
        // Basic fallback for non-txt in this client-side demo
        showToast("For PDF/Images, please copy paste the text manually for now.", "info");
    }
}

function processManualQuestions() {
    const text = document.getElementById('manual-questions').value.trim();
    if(!text) return showToast("Please paste questions", "error");
    
    // Simple line-by-line parser for manual input
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    currentQuestions = lines.map((l, i) => {
        // Strip leading numbers like "1. " or "Q1) "
        const cleanText = l.replace(/^((Q\d+)|(\d+))[\.\)\:\-]?\s*/i, '');
        return { num: i + 1, text: cleanText };
    });
    
    renderQuestionEditor();
    goToStep(2);
}

// --- Question Editor ---
function renderQuestionEditor() {
    const list = document.getElementById('question-editor-list');
    list.innerHTML = '';
    currentQuestions.forEach((q, i) => {
        list.innerHTML += `
            <div class="q-card" id="q-card-${i}">
                <div class="q-num">${i + 1}</div>
                <div class="q-text">
                    <textarea class="q-textarea" id="q-text-${i}" rows="2" onchange="updateQuestion(${i})">${q.text}</textarea>
                </div>
                <div>
                    <button class="btn btn-icon" style="color:var(--danger)" onclick="deleteQuestion(${i})">🗑️</button>
                </div>
            </div>
        `;
    });
}

function updateQuestion(index) {
    currentQuestions[index].text = document.getElementById(`q-text-${index}`).value;
}

function deleteQuestion(index) {
    currentQuestions.splice(index, 1);
    // Renumber
    currentQuestions.forEach((q, i) => q.num = i + 1);
    renderQuestionEditor();
}

function addQuestionField() {
    currentQuestions.push({ num: currentQuestions.length + 1, text: "New Question" });
    renderQuestionEditor();
}

// --- Student Details Form ---
function addStudentField() {
    const container = document.getElementById('students-container');
    const id = Date.now();
    const count = container.children.length + 1;
    if(count > 4) return showToast("Maximum 4 students allowed", "error");
    
    const html = `
        <div class="student-entry" id="student-${id}">
            ${count > 1 ? `<span class="remove-student" onclick="document.getElementById('student-${id}').remove()">✕</span>` : ''}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem">
                <div>
                    <label class="form-label">Student Name</label>
                    <input type="text" class="form-control s-name" placeholder="Name">
                </div>
                <div>
                    <label class="form-label">USN / Roll Number</label>
                    <input type="text" class="form-control s-roll" placeholder="USN">
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

// --- GENERATION ENGINE ---
const SYSTEM_PROMPT = `
# SYSTEM ROLE
You are an advanced Academic Assignment Generation Engine specialized in creating professional university, engineering, science, and technical assignment reports.

# PRIMARY OBJECTIVE
Analyze the question provided and generate a professional, highly detailed, academic answer suitable for a university-level report.

# ANSWER QUALITY REQUIREMENTS
- Be academically accurate and professional.
- Avoid generic responses. Use specific terminology.
- Include conceptual understanding, theoretical background, and practical applications.
- Use formatting: <h4>, <p>, <ul>, <li>, <strong> tags only. (Return ONLY HTML, no markdown code blocks).
- Generate comparison tables (using HTML <table>, <tr>, <th>, <td>) when comparing concepts.
- Create natural academic variation.
- Never repeat large paragraphs.

Output must be suitable for direct inclusion in a professional report.
`;

async function startGeneration() {
    // Gather Data
    const students = Array.from(document.querySelectorAll('.student-entry')).map(el => ({
        name: el.querySelector('.s-name').value.trim(),
        roll: el.querySelector('.s-roll').value.trim()
    })).filter(s => s.name && s.roll);

    if(students.length === 0) return showToast("Add at least one student", "error");
    
    const formData = {
        inst: document.getElementById('f-inst').value,
        dept: document.getElementById('f-dept').value,
        course: document.getElementById('f-course').value,
        subject: document.getElementById('f-subject').value,
        year: document.getElementById('f-academic-year').value,
        title: document.getElementById('f-title').value,
        faculty: document.getElementById('f-faculty').value,
        date: document.getElementById('f-date').value,
        batch: document.getElementById('f-batch').value,
        length: document.getElementById('f-length').value,
        students: students
    };

    if(!formData.subject || !formData.title || !formData.course) return showToast("Please fill all required fields", "error");

    currentReportData = formData;
    goToStep(4);
    
    const logEl = document.getElementById('gen-log');
    const fillEl = document.getElementById('gen-progress-fill');
    logEl.innerHTML = '';
    
    const log = (msg, status='active') => {
        logEl.innerHTML += `<div class="log-line ${status}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    };

    log('Initializing Generation Engine...');
    
    const generatedAnswers = [];
    const totalQ = currentQuestions.length;
    let wordCount = 0;

    for(let i=0; i<totalQ; i++) {
        const q = currentQuestions[i];
        const pct = Math.round(((i) / totalQ) * 80);
        fillEl.style.width = `${pct}%`;
        
        log(`Generating complex answer for Q${q.num}: "${q.text.substring(0, 30)}..."`);
        
        const userPrompt = `
Academic Domain: ${formData.course} - ${formData.subject}
Answer Mode: ${formData.length}

Generate a comprehensive academic answer for the following question:
"${q.text}"

Ensure the answer is highly detailed, structured with headings, and includes relevant academic examples or technical specifics. Return ONLY valid HTML.
`;
        
        try {
            // API Call to Puter.js
            const res = await puter.ai.chat([
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ]);
            
            let htmlStr = typeof res === 'string' ? res : res.message?.content;
            // Clean up if it returned markdown wrapped HTML
            htmlStr = htmlStr.replace(/```html/g, '').replace(/```/g, '').trim();
            
            generatedAnswers.push({ num: q.num, text: q.text, answerHTML: htmlStr });
            wordCount += htmlStr.split(/\s+/).length;
            log(`✓ Q${q.num} generated successfully.`, 'done');
        } catch (e) {
            log(`✗ Error generating Q${q.num}: ${e.message}`, 'error');
            generatedAnswers.push({ num: q.num, text: q.text, answerHTML: `<p>Error generating answer.</p>` });
        }
    }
    
    fillEl.style.width = '90%';
    log('Compiling abstract and conclusions...');
    
    // Compile Final Report
    const reportHTML = buildReportHTML(formData, generatedAnswers);
    currentReportHTML = reportHTML;
    
    fillEl.style.width = '100%';
    log('✓ Document compilation complete.', 'done');
    
    // Save to DB
    if(sb && currentUser && currentUser.id !== 'guest') {
        try {
            await sb.from('generated_reports').insert({
                user_id: currentUser.id,
                student_name: students[0].name,
                roll_number: students[0].roll,
                subject: formData.subject,
                assignment_title: formData.title,
                report_html: reportHTML,
                word_count: wordCount
            });
        } catch(e) { console.warn("DB save failed", e); }
    }
    
    // Setup Preview
    document.getElementById('report-output').innerHTML = reportHTML;
    document.getElementById('stat-words').textContent = wordCount;
    document.getElementById('stat-qcount').textContent = totalQ;
    
    setTimeout(() => {
        showPage('page-preview');
        showToast("Report Generated Successfully!");
    }, 1000);
}

// --- Report Builder (Matches Reference Format) ---
function buildReportHTML(data, answers) {
    const mainStudent = data.students[0];
    const dateObj = new Date(data.date);
    const dateStr = dateObj.toLocaleDateString();

    // 1. Cover Page
    let studentsTableRows = data.students.map((s, i) => `
        <tr>
            <td>${s.name}</td>
            <td>${s.roll}</td>
        </tr>
    `).join('');

    const coverPage = `
    <div class="report-page page-cover">
        <div class="cover-border">
            <div class="cover-inner-border">
                <div class="cover-activity-type">ACTIVITY BASED LEARNING</div>
                <div class="cover-report-for">Report for</div>
                <div class="cover-course">${escapeHTML(data.course)} - ${escapeHTML(data.subject)}</div>
                
                <div class="cover-on">ON</div>
                
                <div class="cover-title">${escapeHTML(data.title)}</div>
                
                <div class="cover-submitted">Submitted in partial fulfilment for the award of</div>
                <div class="cover-degree">${escapeHTML(data.course)}</div>
                <div class="cover-university">Visvesvaraya Technological University, Belagavi</div>
                
                <div class="cover-by">By</div>
                <table class="cover-students-table">
                    ${studentsTableRows}
                </table>
                
                <div class="cover-logo-wrapper">
                    <!-- Placeholder for College Logo -->
                    <div style="width:120px; height:120px; border-radius:50%; border:2px dashed #94a3b8; display:flex; align-items:center; justify-content:center; color:#94a3b8; text-align:center; font-size:10pt;">Logo<br>Placeholder</div>
                </div>
                
                <div class="cover-inst">${escapeHTML(data.inst)}</div>
                <div class="cover-pincode">572103</div>
                <div class="cover-year">${escapeHTML(data.year)}</div>
            </div>
        </div>
    </div>
    `;

    // 2. Evaluation Sheet
    let evalRows = data.students.map((s, i) => `
        <tr>
            <td>${i+1}</td>
            <td class="student-col">${s.name}<br>${s.roll}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `).join('');
    
    // Add empty rows if less than 4 to make table look complete
    for(let i = data.students.length; i < 4; i++) {
        evalRows += `<tr><td>${i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const evalSheet = `
    <div class="report-page">
        <div class="eval-title">EVALUATION SHEET</div>
        <table class="eval-header-table">
            <tr>
                <td style="width:70%">Course: ${escapeHTML(data.course)} - ${escapeHTML(data.subject)}</td>
                <td style="width:30%">Batch No.: ${escapeHTML(data.batch || 'N/A')}</td>
            </tr>
            <tr>
                <td>Topic: ${escapeHTML(data.title)}</td>
                <td>Academic Year: ${escapeHTML(data.year)}</td>
            </tr>
        </table>
        
        <table class="eval-marks-table">
            <tr>
                <th style="width:5%">Sl No</th>
                <th style="width:35%">Student name<br>and<br>USN</th>
                <th style="width:20%">Concept<br>Understanding &<br>Application<br>10 Marks</th>
                <th style="width:15%">Presentation &<br>Communication<br>06 Marks</th>
                <th style="width:15%">Participation &<br>Report<br>04 Marks</th>
                <th style="width:10%">Total<br>20 Marks</th>
            </tr>
            ${evalRows}
        </table>
        
        <table class="eval-sig-table">
            <tr>
                <th style="width:33.3%">Faculty Signature</th>
                <th style="width:33.3%">Evaluator Signature</th>
                <th style="width:33.3%">Date</th>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        </table>
    </div>
    `;

    // 3. Table of Contents
    let tocRows = answers.map((a, i) => `
        <tr>
            <td>${i+1}</td>
            <td class="toc-desc">${escapeHTML(a.text.substring(0, 60))}${a.text.length > 60 ? '...' : ''}</td>
            <td class="toc-page">${i+4}</td>
        </tr>
    `).join('');

    const tocPage = `
    <div class="report-page">
        <div class="toc-title">CONTENTS</div>
        <table class="toc-table">
            <tr>
                <td class="toc-chapter" colspan="2">Table of Contents</td>
                <td class="toc-page">i</td>
            </tr>
            <tr>
                <td class="toc-chapter" colspan="2">List of Figures</td>
                <td class="toc-page">ii</td>
            </tr>
            <tr class="main-row">
                <td class="toc-chapter" colspan="2">CHAPTER 1 &nbsp;&nbsp;&nbsp; INTRODUCTION / OVERVIEW</td>
                <td class="toc-page">1</td>
            </tr>
            <tr class="main-row">
                <td class="toc-chapter" colspan="2">CHAPTER 2 &nbsp;&nbsp;&nbsp; DETAILED SOLUTIONS</td>
                <td class="toc-page">2</td>
            </tr>
            ${tocRows}
            <tr class="main-row">
                <td class="toc-chapter" colspan="2">CHAPTER 3 &nbsp;&nbsp;&nbsp; CONCLUSION</td>
                <td class="toc-page">${answers.length + 3}</td>
            </tr>
            <tr class="main-row">
                <td class="toc-chapter" colspan="2">REFERENCES</td>
                <td class="toc-page">${answers.length + 4}</td>
            </tr>
        </table>
    </div>
    `;

    // 4. Content Header/Footer Helper
    const buildHeaderFooter = (pageNo) => `
        <div class="report-header">
            <span>Academic year - ${escapeHTML(data.year)}</span>
            <span>${escapeHTML(data.course)}</span>
        </div>
        <div class="report-footer">
            <span>${escapeHTML(data.dept)}, ${escapeHTML(data.inst.split(' ')[0])} Tumakuru-03</span>
            <span>Page ${pageNo}</span>
        </div>
    `;

    // 5. Intro Chapter
    const introPage = `
    <div class="report-page report-content">
        ${buildHeaderFooter(1)}
        <div class="chapter-header">
            <div class="chapter-num">CHAPTER 1</div>
            <div class="chapter-title">INTRODUCTION</div>
        </div>
        <div class="section-title">1.1 Overview</div>
        <p class="report-body-text">This assignment explores the topics related to <strong>${escapeHTML(data.title)}</strong> within the context of ${escapeHTML(data.subject)}. The purpose of this activity-based learning report is to deeply analyze the core concepts, practical applications, and theoretical foundations as required by the curriculum.</p>
        <div class="section-title">1.2 Scope and Methodology</div>
        <p class="report-body-text">The subsequent chapters present systematic solutions to the assigned problem statements. The methodology involves analytical reasoning, review of standard academic literature, and synthesis of technical explanations.</p>
    </div>
    `;

    // 6. Answers Chapters
    let contentPages = answers.map((a, i) => `
    <div class="report-page report-content">
        ${buildHeaderFooter(i+2)}
        <div class="section-title">2.${i+1} Question Statement</div>
        <p class="report-body-text" style="font-style:italic;">${escapeHTML(a.text)}</p>
        <div class="section-title">Solution</div>
        <div class="report-body-text">
            ${a.answerHTML}
        </div>
    </div>
    `).join('');

    // 7. Conclusion
    const conclusionPage = `
    <div class="report-page report-content">
        ${buildHeaderFooter(answers.length + 2)}
        <div class="chapter-header">
            <div class="chapter-num">CHAPTER 3</div>
            <div class="chapter-title">CONCLUSION</div>
        </div>
        <div class="section-title">3.1 Learning Outcomes</div>
        <p class="report-body-text">Through the completion of this assignment on ${escapeHTML(data.subject)}, a comprehensive understanding of ${escapeHTML(data.title)} has been achieved. The detailed analysis of individual problem statements provided significant insights into the practical and theoretical aspects of the topic.</p>
        
        <table class="report-table" style="margin-top: 15mm">
            <tr><th style="background:#eff6ff">Final Statement</th></tr>
            <tr><td>The concepts explored in this activity form a critical foundation for advanced applications in the field. Continuous evaluation and application of these principles are essential for robust academic and professional development.</td></tr>
        </table>
    </div>
    `;

    // 8. References
    const referencesPage = `
    <div class="report-page report-content">
        ${buildHeaderFooter(answers.length + 3)}
        <div class="chapter-header">
            <div class="chapter-title">REFERENCES</div>
        </div>
        <ul class="ref-list">
            <li>[1] Standard textbook and course materials for ${escapeHTML(data.subject)}, ${escapeHTML(data.year)}.</li>
            <li>[2] Academic journals and publications relevant to ${escapeHTML(data.title)}.</li>
            <li>[3] Lecture notes provided by ${escapeHTML(data.faculty)}, ${escapeHTML(data.dept)}.</li>
        </ul>
        <p class="ref-note">Note: This report is prepared for educational presentation under ${escapeHTML(data.course)}. The content represents academic analysis based on the assigned topic.</p>
    </div>
    `;

    return `<div class="a4-container">
        ${coverPage}
        ${evalSheet}
        ${tocPage}
        ${introPage}
        ${contentPages}
        ${conclusionPage}
        ${referencesPage}
    </div>`;
}

function escapeHTML(str) {
    if(!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

// --- Export ---
function exportPDF() {
    showToast("Generating PDF...");
    const element = document.querySelector('.a4-container');
    
    // Hide headers/footers of the app temporarily to ensure clean print
    const opt = {
        margin: 0,
        filename: `${currentReportData.students[0]?.roll || 'Report'}_${currentReportData.subject}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
}

// --- Email Report ---
function openEmailModal() {
    document.getElementById('email-modal-backdrop').classList.add('show');
}

function closeEmailModal() {
    document.getElementById('email-modal-backdrop').classList.remove('show');
}

async function sendEmailReport() {
    const to = document.getElementById('email-to').value;
    const subject = document.getElementById('email-subject').value;
    const body = document.getElementById('email-body').value;
    const btn = document.getElementById('btn-send-email');
    
    if(!to) return showToast("Please enter a recipient email", "error");
    
    btn.disabled = true;
    btn.textContent = "Generating PDF...";
    showToast("Preparing attachment...", "info");
    
    try {
        const element = document.querySelector('.a4-container');
        const opt = {
            margin: 0,
            filename: 'report.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Generate PDF as base64 string
        const pdfBase64 = await html2pdf().set(opt).from(element).output('datauristring');
        
        btn.textContent = "Sending Email...";
        showToast("Sending email via secure SMTP...", "info");
        
        // Send via SMTPJS
        Email.send({
            Host : "smtp.gmail.com",
            Username : "mohamedfazilpasha156@gmail.com",
            Password : "hknw ipix ynwa unjj",
            To : to,
            From : "mohamedfazilpasha156@gmail.com",
            Subject : subject,
            Body : body,
            Attachments : [
                {
                    name : `${currentReportData.students[0]?.roll || 'Report'}_${currentReportData.subject}.pdf`,
                    data : pdfBase64
                }
            ]
        }).then(
            message => {
                if(message === "OK") {
                    showToast("Email sent successfully!", "success");
                    closeEmailModal();
                } else {
                    showToast("Failed to send email: " + message, "error");
                }
                btn.disabled = false;
                btn.textContent = "Send Email ✉️";
            }
        );
        
    } catch (e) {
        showToast("Failed to send email.", "error");
        console.error(e);
        btn.disabled = false;
        btn.textContent = "Send Email ✉️";
    }
}

function exportDOCX() {
    // DOCX generation requires mapping HTML to docx.js elements.
    // For this implementation, we suggest using a server-side converter or advanced parsing.
    // We'll show a toast for this demo.
    showToast("DOCX Export requires premium server backend for accurate layout.", "info");
}

// --- Dashboard Loader ---
async function loadDashboardReports() {
    if(!sb || !currentUser || currentUser.id === 'guest') return;
    try {
        const { data, error } = await sb.from('generated_reports')
            .select('id, assignment_title, subject, created_at, word_count')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
            
        if(error || !data) return;
        
        const grid = document.getElementById('dashboard-reports');
        if(data.length === 0) return;
        
        grid.innerHTML = '';
        data.forEach(r => {
            const date = new Date(r.created_at).toLocaleDateString();
            grid.innerHTML += `
                <div class="glass-card report-item">
                    <h3 style="font-size:1.1rem">${escapeHTML(r.assignment_title)}</h3>
                    <div class="report-meta">
                        <span>${escapeHTML(r.subject)}</span>
                        <span>${date}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <span class="badge badge-success">COMPLETED</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary)">${r.word_count || 0} words</span>
                    </div>
                </div>
            `;
        });
    } catch(e) { console.warn("Failed to load reports"); }
}

// --- Auto-Save feature ---
function setupAutoSave() {
    const fields = ['f-inst', 'f-dept', 'f-course', 'f-subject', 'f-academic-year', 'f-title', 'f-faculty', 'f-batch', 'f-length'];
    
    // Load
    fields.forEach(f => {
        const val = localStorage.getItem(`assignai_${f}`);
        if(val && document.getElementById(f)) {
            document.getElementById(f).value = val;
        }
    });
    
    // Save on change
    fields.forEach(f => {
        const el = document.getElementById(f);
        if(el) {
            el.addEventListener('input', (e) => {
                localStorage.setItem(`assignai_${f}`, e.target.value);
            });
        }
    });
}
