import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { z } from 'zod';
import rateLimit from '@/utils/rateLimit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const pdfSchema = z.object({
  htmlContent: z.string().min(1, "HTML content is required"),
  subject: z.string().optional(),
  dept: z.string().optional(),
  inst: z.string().optional()
});

export async function POST(request) {
  try {
    try {
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      await limiter.check(NextResponse, 50, ip); // HIGH limit: 50 exports per minute
    } catch {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawBody = await request.json();
    const parsed = pdfSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const { htmlContent, subject, dept, inst } = parsed.data;

    let browser;
    try {
      const isLocal = process.env.NODE_ENV === 'development';
      
      const executablePath = isLocal 
          ? (process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
          : await chromium.executablePath();

      browser = await puppeteer.launch({
        args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: isLocal ? true : chromium.headless,
      });

      const page = await browser.newPage();

      // Wrap the raw report HTML in a proper document structure with print CSS
      const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body, html {
            font-family: 'Times New Roman', Cambria, Georgia, serif;
            margin: 0;
            padding: 0;
            color: #000;
            background: #fff;
            line-height: 1.5;
          }

          /* Global Typography */
          * { color: #000 !important; }

          h1, h2, h3, h4, h5, h6 {
            font-family: 'Times New Roman', serif;
            page-break-after: avoid;
            break-after: avoid;
            color: #000;
            margin-top: 18pt;
            margin-bottom: 6pt;
          }
          
          h1.report-title { font-size: 20pt; font-weight: bold; text-align: center; }
          .q-heading { font-size: 14pt; font-weight: bold; text-align: left; color: #000; margin-top: 0; margin-bottom: 10px; }
          h4 { font-size: 13pt; font-weight: bold; margin-bottom: 5px; }
          h5, h6 { font-size: 12pt; font-weight: bold; margin-bottom: 5px; }
          
          p, li {
            text-align: justify;
            line-height: 1.25;
            margin-top: 0;
            margin-bottom: 6px;
            font-size: 12pt;
          }
          
          ul, ol { margin-bottom: 6px; padding-left: 20px; }
          
          img, svg, canvas { max-width: 65%; height: auto; display: block; margin: 15px auto; border-radius: 4px; }
          pre { font-size: 10pt; background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; max-width: 100%; overflow: hidden; margin: 10px auto; }
          
          strong, b { font-weight: bold; }

          /* Strict Pagination Rules */
          h1, h2, h3, h4, h5, h6, .q-heading {
            page-break-after: avoid;
            break-after: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          p, li {
            orphans: 2;
            widows: 2;
          }

          img, table, tr, figure, .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Table Formatting */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #fff;
            font-weight: bold;
          }

          /* Images */
          img {
            max-width: 90%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          figcaption, .img-caption {
            font-size: 10pt;
            font-style: italic;
            text-align: center;
            margin-top: 4pt;
          }

          /* Layout Container */
          .document-container {
            padding: 0;
          }

          @page {
            size: A4;
            margin: 35mm 15mm 35mm 15mm;
          }
        </style>
      </head>
      <body>
        <div class="document-container">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    // Set content and wait for network (like webfonts/images) to load
    try {
      await page.setContent(fullHtml, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.warn("Puppeteer networkidle2 timed out, proceeding with PDF generation anyway...");
    }

    const headerTemplate = `
      <div style="width: 100%; font-size: 11pt; font-family: 'Times New Roman', serif; padding: 8mm 18mm 5px 25mm; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #8b0000; box-sizing: border-box;">
        <div style="color: #000;">Academic year - 2025-26</div>
        <div style="color: #000;">${subject}</div>
      </div>
    `;

    const footerTemplate = `
      <div style="width: 100%; font-size: 11pt; font-family: 'Times New Roman', serif; padding: 3px 18mm 4mm 25mm; display: flex; justify-content: space-between; align-items: flex-start; border-top: 1.5px solid #8b0000; box-sizing: border-box;">
        <div style="color: #000;">Dept of ${dept}, ${inst}</div>
        <div style="color: #000;">Page <span class="pageNumber"></span></div>
      </div>
    `;

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '15mm',
        right: '18mm',
        bottom: '15mm',
        left: '25mm'
      }
    });

      // Return the PDF buffer directly
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Report_${subject ? subject.replace(/[^a-zA-Z0-9]/g, '_') : 'Document'}.pdf"`
        }
      });

    } finally {
      if (browser) {
        await browser.close();
      }
    }

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF: " + error.message }, { status: 500 });
  }
}
