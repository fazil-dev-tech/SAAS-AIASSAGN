# AssignAI Premium — Advanced Academic Report Generator

AssignAI is a single-page, serverless application that leverages AI (Puter.js) to automate the generation of high-quality, professional academic reports from assignment questions.

## Core Features Implemented

1. **True PDF Extraction**: Integrates `PDF.js` to parse text directly from uploaded PDF question papers, eliminating the need for manual copy-pasting.
2. **AI Question Parsing**: Uses Puter.js AI to intelligently extract structured questions from raw PDF text.
3. **Magic Link Authentication**: Secure, passwordless login using Supabase OTP (One-Time Password) via email.
4. **Multi-Student Configuration**: Dynamically supports 1-4 students, perfectly mapping their details to the report's cover page and evaluation sheet.
5. **Pixel-Perfect A4 Templating**: CSS strictly enforces standard university (e.g., SIT VTU) formats including:
   - Black double-bordered cover page
   - Evaluation marks table
   - Table of contents with page references
   - Chapter-based answer structures
6. **Robust Export Options**:
   - **PDF**: Accurate rendering using `html2pdf.js`
   - **DOCX**: Functional Word document export using `html-docx-js`
   - **Email Delivery**: Direct, client-side secure SMTP email dispatch (using SMTPJS) with the generated report attached.
7. **Local Storage Auto-Save**: Forms save state locally to prevent data loss on accidental refreshes.

## What is Missing / Recommended Future Additions ("Million Dollar" Scope)

While the app is currently highly functional and premium, to scale it to an enterprise/million-dollar level product, the following additions are recommended:

### 1. Backend Architecture (Next.js / Node.js)
Currently, everything runs client-side. Moving to a dedicated backend allows for:
- Server-side DOCX generation (e.g., using `docx` node library) for 100% perfect Word formatting (client-side HTML-to-DOCX is inherently limited by browser engines).
- Hiding the SMTP credentials completely (currently exposed in client-side JS, which is a security risk for production).
- Hiding Puter.js/AI API logic to prevent abuse.

### 2. Batch Processing Pipeline
Allow professors to upload a CSV of 75 students + 1 Question PDF. The system could queue 75 asynchronous jobs in Supabase Edge Functions to generate and email unique reports to all 75 students in one click.

### 3. Native Image & Diagram Generation
The AI generates text answers well, but adding an integration with an AI Image Generator (or Mermaid.js for charts) would allow the reports to automatically include relevant technical diagrams.

### 4. Plagiarism / Uniqueness Scoring
Integrate a plagiarism checker API to guarantee that if two students generate a report on the same questions, the outputs are verifiably 100% unique.

### 5. Custom Template Builder UI
Instead of hardcoding the SIT VTU format in CSS, build a drag-and-drop template editor so students from *any* university can visually map their required cover page layout.
